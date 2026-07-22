const { ensureBrowser, closeBrowser } = require('./browser.service');
const { SCRAPE_TIMEOUT } = require('../config/env');
const logger = require('../utils/logger');
const axios = require('axios');
const m3u8Parser = require('m3u8-parser');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const buildScrapeSources = (type, id, season, episode) => {
  if (type === 'movie') {
    return [
      `https://vidlink.pro/movie/${id}?autoplay=true`,
      `https://vidfast.pro/movie/${id}?autoPlay=true`,
      `https://vidfast.vc/movie/${id}?autoPlay=true`,
    ];
  }

  const s = season || 1;
  const e = episode || 1;
  return [
    `https://vidlink.pro/tv/${id}/${s}/${e}?autoplay=true`,
    `https://vidfast.pro/tv/${id}/${s}/${e}?autoPlay=true`,
    `https://vidfast.vc/tv/${id}/${s}/${e}?autoPlay=true`,
  ];
};

const isStreamUrl = (url) =>
  url.includes('.m3u8') || url.includes('.mp4');

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
      const videoVariants = manifest.playlists.filter(p => {
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

const scrapeFromUrl = async (browser, url, abortSignal) => {
  let page;

  try {
    page = await browser.newPage();

    // Closing popups via page.on('popup') races puppeteer-extra stealth and crashes the process.
    await page.evaluateOnNewDocument(() => {
      window.open = () => null;
    });

    await page.setUserAgent(USER_AGENT);
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });

    let streamUrl = null;

    const requestHandler = (request) => {
      if (abortSignal?.aborted) {
        request.abort('blockedbyClient').catch(() => {});
        return;
      }
      const reqUrl = request.url();
      if (isStreamUrl(reqUrl)) {
        logger.info(`FOUND STREAM REQUEST: ${reqUrl}`);
        streamUrl = reqUrl;
      }
    };

    const responseHandler = (response) => {
      const resUrl = response.url();
      if (resUrl.includes('.m3u8')) {
        logger.info(`FOUND M3U8 RESPONSE: ${resUrl}`);
        streamUrl = resUrl;
      }
    };

    page.on('request', requestHandler);
    page.on('response', responseHandler);

    logger.info(`Navigating to ${url}...`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: SCRAPE_TIMEOUT });
    } catch (navError) {
      logger.warn(`Navigation issue for ${url}: ${navError.message}`);
    }

    logger.info('Page loaded, simulating clicks to trigger video...');

    const deadline = Date.now() + SCRAPE_TIMEOUT;
    while (!streamUrl && Date.now() < deadline) {
      if (abortSignal?.aborted) break;
      try {
        await page.mouse.click(640, 360).catch(() => {});
      } catch (e) {
        logger.debug('Click failed, continuing...');
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    if (streamUrl) {
      // If it's an HLS master playlist, resolve to the best video variant
      if (streamUrl.includes('.m3u8')) {
        const resolvedUrl = await resolveHlsMasterPlaylist(streamUrl);
        return resolvedUrl;
      }
    }

    return streamUrl;
  } finally {
    if (page) {
      page.removeAllListeners('request');
      page.removeAllListeners('response');
      await page.close().catch((e) => logger.error(`Error closing page: ${e.message}`));
    }
  }
};

const scrapeVideoStream = async (type, id, season, episode, abortSignal) => {
  const sources = buildScrapeSources(type, id, season, episode);
  let lastError;

  for (const url of sources) {
    // Check if abort was signaled
    if (abortSignal?.aborted) {
      logger.info('Scraping aborted by client');
      throw new Error('Scraping request was aborted');
    }

    try {
      const browser = await ensureBrowser();
      const streamUrl = await scrapeFromUrl(browser, url, abortSignal);
      if (streamUrl) {
        const streamType = streamUrl.includes('.m3u8') ? 'HLS' : streamUrl.includes('.mp4') ? 'MP4' : 'UNKNOWN';
        logger.info(`Successfully scraped video stream (${streamType}): ${streamUrl}`);
        return streamUrl;
      }
      logger.info(`No stream found at ${url}, trying next source...`);
    } catch (error) {
      lastError = error;
      logger.error(`Scraping error for ${url}: ${error.message}`);
      if (error.message?.includes('Target closed') || error.message?.includes('Session closed')) {
        await closeBrowser();
      }
    }
  }

  throw lastError || new Error('Could not find a video stream from any source.');
};

module.exports = {
  scrapeVideoStream,
};
