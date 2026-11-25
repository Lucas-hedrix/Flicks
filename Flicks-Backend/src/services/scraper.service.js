const {
  createIsolatedContext,
  relaunchBrowser,
} = require('./browser.service');
const { applyPageHardening } = require('./adblock.service');
const { SCRAPE_TIMEOUT } = require('../config/env');
const logger = require('../utils/logger');
const axios = require('axios');
const m3u8Parser = require('m3u8-parser');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Status codes that indicate the stream is not playable and we should try next source
const UNPLAYABLE_STATUS_CODES = new Set([403, 429, 401, 410, 503]);

/**
 * Validate a stream URL is actually playable by making a HEAD request.
 * Returns true if the stream responds with a success status (2xx).
 */
const validateStreamUrl = async (url, referer = '', origin = '') => {
  try {
    const headers = {
      'User-Agent': USER_AGENT,
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
    };
    if (referer) headers['Referer'] = referer;
    if (origin) headers['Origin'] = origin;

    const response = await axios.head(url, {
      timeout: 4000,
      headers,
      validateStatus: () => true,
    });

    const isPlayable = response.status >= 200 && response.status < 300;

    if (!isPlayable) {
      logger.warn(`Stream validation failed for ${url.slice(0, 100)}: HTTP ${response.status}`);
      if (UNPLAYABLE_STATUS_CODES.has(response.status)) {
        logger.info(`Status ${response.status} is unplayable, will try next source`);
      }
      return false;
    }

    // Reject HTML error pages that returned a 200 but aren't actually video.
    // Some embeds return a styled error page with a 200; status-only checks
    // would wrongly accept them and only fail later at the player.
    const ct = (response.headers['content-type'] || '').toLowerCase();
    const looksLikeVideo =
      ct.includes('video') ||
      ct.includes('mpegurl') ||
      ct.includes('octet-stream') ||
      ct.includes('mp4') ||
      ct.includes('m2ts') ||
      ct.includes('ts');
    if (ct && !looksLikeVideo) {
      logger.warn(`Stream content-type rejected: "${ct}" for ${url.slice(0, 100)}`);
      return false;
    }

    return true;
  } catch (error) {
    logger.warn(`Stream validation error for ${url.slice(0, 100)}: ${error.message}`);
    return false;
  }
};

// How many sources to scrape at once. Racing sources in isolated contexts and
// taking the first hit is much faster than the old sequential loop, but each
// context costs memory, so keep it bounded (override via SCRAPE_CONCURRENCY).
const MAX_CONCURRENT = Math.max(1, parseInt(process.env.SCRAPE_CONCURRENCY || '3', 10));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Try to get a player to start loading its stream. A blind coordinate click is
 * unreliable across players, so we walk a sequence: call video.play() directly,
 * hit spacebar, click a visible play control, and only as a last resort click
 * the center of the viewport. Each step is non-fatal.
 */
const pokePlayer = async (page) => {
  // 1. Directly play the <video> element if one exists (most reliable).
  const played = await page
    .evaluate(() => {
      const v = document.querySelector('video');
      if (v) {
        v.muted = true; // many players gate autoplay on muted state
        v.play().catch(() => {});
        return true;
      }
      return false;
    })
    .catch(() => false);
  if (played) return;

  // 2. Spacebar often toggles play on keyboard-first players.
  await page.keyboard.press('Space').catch(() => {});

  // 3. Click a visible play button.
  await page
    .evaluate(() => {
      const btn = document.querySelector(
        'button[aria-label*="play" i], .jw-icon-display, [class*="playbutton" i], [class*="playButton" i]'
      );
      if (btn) btn.click();
    })
    .catch(() => {});

  // 4. Fall back to a center click.
  await page.mouse.click(640, 360).catch(() => {});
};

const buildScrapeSources = (type, id, season, episode) => {
  if (type === 'movie') {
    return [
      `https://moviesapi.to/movie/${id}`,
      `https://vidlink.pro/movie/${id}?autoplay=true`,
      `https://vidfast.pro/movie/${id}?autoPlay=true`,
      `https://vidfast.vc/movie/${id}?autoPlay=true`,
      `https://autoembed.co/movie/tmdb/${id}`,
      `https://embed.su/embed/movie/${id}`,
      `https://multiembed.mov/?video_id=${id}&tmdb=1`,
      `https://vidsrc.net/embed/movie?tmdb=${id}`,
      `https://vidsrc.to/embed/movie/${id}`,
    ];
  }

  const s = season || 1;
  const e = episode || 1;
  return [
    `https://moviesapi.to/tv/${id}-${s}-${e}`,
    `https://vidlink.pro/tv/${id}/${s}/${e}?autoplay=true`,
    `https://vidfast.pro/tv/${id}/${s}/${e}?autoPlay=true`,
    `https://vidfast.vc/tv/${id}/${s}/${e}?autoPlay=true`,
    `https://autoembed.co/tv/tmdb/${id}-${s}-${e}`,
    `https://embed.su/embed/tv/${id}/${s}/${e}`,
    `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
    `https://vidsrc.net/embed/tv?tmdb=${id}&season=${s}&episode=${e}`,
    `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
  ];
};

const isHlsUrl = (url) => /\.m3u8(\?|$)/i.test(url);

const resolveHlsMasterPlaylist = async (playlistUrl) => {
  try {
    const response = await axios.get(playlistUrl, { timeout: 10000 });
    const parser = new m3u8Parser.Parser();
    parser.push(response.data);
    parser.end();

    const manifest = parser.manifest;

    // Check if it's a master playlist with variants
    if (manifest.playlists && manifest.playlists.length > 0) {
      logger.info(`Master playlist detected with ${manifest.playlists.length} variants`);

      // Filter out audio-only variants and select highest bandwidth video variant
      const videoVariants = manifest.playlists.filter((p) => {
        const codecs = p.attributes?.CODECS || '';
        const hasVideo = codecs.includes('avc1') || codecs.includes('hev1') || codecs.includes('vp');
        return hasVideo;
      });

      if (videoVariants.length === 0) {
        logger.warn('No video variants found, using highest bandwidth variant');
        manifest.playlists.sort((a, b) => (b.attributes?.BANDWIDTH || 0) - (a.attributes?.BANDWIDTH || 0));
        const bestPlaylist = manifest.playlists[0];
        return new URL(bestPlaylist.uri, playlistUrl).toString();
      }

      // Sort by bandwidth descending to get highest quality
      videoVariants.sort((a, b) => (b.attributes?.BANDWIDTH || 0) - (a.attributes?.BANDWIDTH || 0));
      const bestVariant = videoVariants[0];
      const resolvedUrl = new URL(bestVariant.uri, playlistUrl).toString();
      logger.info(`Selected video variant with bandwidth: ${bestVariant.attributes?.BANDWIDTH} from ${resolvedUrl}`);
      return resolvedUrl;
    }

    // It's a media playlist, return as-is
    return playlistUrl;
  } catch (error) {
    logger.warn(`Could not resolve master playlist ${playlistUrl}: ${error.message}`);
    return playlistUrl;
  }
};

/**
 * Scrape a single embed URL in its own isolated browser context.
 * Returns { url, kind: 'hls'|'mp4', referer, origin } or null.
 */
const scrapeFromUrl = async (url, abortSignal) => {
  let context;
  let page;

  try {
    const isolated = await createIsolatedContext();
    context = isolated.context;
    page = isolated.page;

    await page.setViewport({ width: 1280, height: 720 });

    // Neutralize popups before any script runs. Closing popups via page.on('popup')
    // races puppeteer-extra stealth and can crash the process.
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(window, 'open', {
        value: function() { return null; },
        writable: false,
        configurable: false
      });
    });

    await page.setUserAgent(USER_AGENT);
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    // First stream we detect wins. We capture the Referer/Origin the player used
    // so the proxy can replay them and dodge CDN hotlink protection (403s).
    let captured = null;

    const captureStream = (streamUrl, headers) => {
      if (captured) return;
      const kind = isHlsUrl(streamUrl) ? 'hls' : 'mp4';
      captured = {
        url: streamUrl,
        kind,
        referer: (headers && (headers.referer || headers.Referer)) || '',
        origin: (headers && (headers.origin || headers.Origin)) || '',
      };
      logger.info(`FOUND ${kind.toUpperCase()} STREAM at ${url}: ${streamUrl.slice(0, 140)}`);
    };

    // Request interception + ad/resource blocking, with a candidate callback.
    await applyPageHardening(page, ({ url: reqUrl, headers }) => captureStream(reqUrl, headers));

    // Some players only reveal the m3u8 via a redirected response, not a request.
    // We pull the headers off the underlying Puppeteer request so the proxy can
    // replay the same Referer/Origin and dodge CDN hotlink 403s.
    const responseHandler = (response) => {
      const resUrl = response.url();
      const headers = response.headers?.() || {};
      const ct = (headers['content-type'] || '').toLowerCase();
      // URL extension, or a content-type that signals an HLS playlist or segment
      // (catches streams served without a .m3u8/.mp4 in the URL path).
      const looksHls = isHlsUrl(resUrl) || ct.includes('mpegurl') || ct === 'video/mp2t';
      const looksVideo = /\.mp4(\?|$)/i.test(resUrl) || ct.startsWith('video/');
      if (looksHls || looksVideo) {
        const reqHeaders = response.request?.()?.headers?.() || {};
        captureStream(resUrl, reqHeaders);
      }
    };
    page.on('response', responseHandler);

    logger.info(`Navigating to ${url}...`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: SCRAPE_TIMEOUT });
    } catch (navError) {
      logger.warn(`Navigation issue for ${url}: ${navError.message}`);
    }

    // Poke the player to trigger playback until we capture a stream or time out.
    const deadline = Date.now() + SCRAPE_TIMEOUT;
    let firstPoke = true;
    while (!captured && Date.now() < deadline) {
      if (abortSignal?.aborted) break;
      if (firstPoke) {
        await pokePlayer(page);
        firstPoke = false;
      } else {
        await page.mouse.click(640, 360).catch(() => {});
      }
      await sleep(1200);
    }

    if (!captured) return null;

    // For HLS, resolve a master playlist down to the best single video variant.
    if (captured.kind === 'hls') {
      captured.url = await resolveHlsMasterPlaylist(captured.url);
    }
    return captured;
  } finally {
    if (page) {
      page.removeAllListeners('response');
      await page.close().catch((e) => logger.debug(`Error closing page: ${e.message}`));
    }
    if (context) {
      await context.close().catch((e) => logger.debug(`Error closing context: ${e.message}`));
    }
  }
};

/**
 * Race sources with bounded concurrency. Resolves with the first source that
 * yields a stream (aborting the rest), or rejects once every source has failed.
 */
const raceScrape = (sources, abortSignal) =>
  new Promise((resolve, reject) => {
    let settled = false;
    let index = 0;
    let active = 0;
    let failures = 0;

    // Local controller lets a winner cancel the still-running losers; it is also
    // tripped if the outer request (client) aborts.
    const localController = new AbortController();
    const onOuterAbort = () => localController.abort();

    if (abortSignal) {
      if (abortSignal.aborted) return reject(new Error('Scraping request was aborted'));
      abortSignal.addEventListener('abort', onOuterAbort, { once: true });
    }

    const cleanup = () => {
      if (abortSignal) abortSignal.removeEventListener('abort', onOuterAbort);
    };

    const succeed = (result) => {
      if (settled) return;
      settled = true;
      localController.abort();
      cleanup();
      resolve(result);
    };

    const failOne = () => {
      failures += 1;
      if (settled) return;
      if (failures >= sources.length) {
        settled = true;
        cleanup();
        reject(new Error('Could not find a video stream from any source.'));
        return;
      }
      pump();
    };

    const pump = () => {
      while (!settled && active < MAX_CONCURRENT && index < sources.length) {
        const url = sources[index++];
        active += 1;
        scrapeFromUrl(url, localController.signal)
          .then(async (result) => {
            active -= 1;
            if (result && result.url) {
              // FREE the slot and start the next source immediately; validate in
              // the background so a slow HEAD doesn't stall the whole race.
              pump();
              const isValid = await validateStreamUrl(result.url, result.referer, result.origin);
              if (settled) return;
              if (isValid) {
                logger.info(`Winning source (validated): ${url}`);
                succeed(result);
              } else {
                logger.info(`Stream from ${url} failed validation (403/429/etc), trying next source...`);
                failOne();
              }
            } else {
              logger.info(`No stream found at ${url}, trying next source...`);
              pump();
              failOne();
            }
          })
          .catch((err) => {
            active -= 1;
            logger.error(`Scraping error for ${url}: ${err.message}`);
            failOne();
          });
      }
    };

    pump();
  });

const isFatalBrowserError = (message = '') =>
  /Target closed|Session closed|Protocol error|Connection closed|browser has disconnected/i.test(message);

/**
 * Public entry point. Races the embed sources and, if the shared browser died
 * mid-scrape, relaunches it and retries once.
 */
const scrapeVideoStream = async (type, id, season, episode, abortSignal, attempt = 0) => {
  if (abortSignal?.aborted) {
    throw new Error('Scraping request was aborted');
  }

  const sources = buildScrapeSources(type, id, season, episode);

  try {
    return await raceScrape(sources, abortSignal);
  } catch (error) {
    if (isFatalBrowserError(error.message) && attempt < 1 && !abortSignal?.aborted) {
      logger.warn(`Browser appears dead (${error.message}); relaunching and retrying once...`);
      await relaunchBrowser();
      return scrapeVideoStream(type, id, season, episode, abortSignal, attempt + 1);
    }
    throw error;
  }
};

module.exports = {
  scrapeVideoStream,
};
