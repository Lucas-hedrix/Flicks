const { scrapeVideoStream } = require('../services/scraper.service');
const logger = require('../utils/logger');

// Build the client-facing proxied URL from the scraper's rich result.
// HLS goes through the m3u8 rewriter; direct MP4 through the video streamer.
// Captured referer/origin ride along as query params so the proxy can replay
// them and defeat CDN hotlink protection.
const buildProxiedUrl = ({ url, kind, referer, origin }) => {
  const params = new URLSearchParams({ url });
  if (referer) params.set('ref', referer);
  if (origin) params.set('origin', origin);

  const base = kind === 'mp4' ? '/api/proxy/video' : '/api/proxy/m3u8';
  return `${base}?${params.toString()}`;
};

const scrapeController = async (req, res, next) => {
  const { type, id, season, episode } = req.query;

  logger.info(`Scrape request: type=${type}, id=${id}, season=${season}, episode=${episode}`);

  // Create AbortController for this request
  const abortController = new AbortController();

  // Handle client disconnect
  req.on('close', () => {
    if (!res.headersSent) {
      logger.info('Client disconnected during scraping, aborting...');
      abortController.abort();
    }
  });

  // Set timeout for scraping (60 seconds max - Puppeteer needs time to load and parse)
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      logger.warn('Scraping timeout reached (60s), aborting...');
      abortController.abort();
    }
  }, 60000);

  try {
    const result = await scrapeVideoStream(type, id, season, episode, abortController.signal);

    clearTimeout(timeoutId);

    if (result && result.url) {
      logger.info(`Scrape successful (${result.kind}): ${result.url}`);

      const proxiedUrl = buildProxiedUrl(result);
      logger.info(`Returning proxied URL: ${proxiedUrl}`);
      // Include the raw stream details so the frontend can drive an IDM-style
      // download of the actual media file (not just a proxied playback URL).
      return res.json({
        url: proxiedUrl,
        isProxied: true,
        kind: result.kind,
        rawUrl: result.url,
        referer: result.referer || '',
        origin: result.origin || '',
      });
    } else {
      logger.warn('Scrape returned no URL');
      return res.status(404).json({ error: 'Video stream not found' });
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (abortController.signal.aborted) {
      logger.info('Scraping was aborted');
      if (!res.headersSent) {
        return res.status(499).json({ error: 'Scraping request was cancelled' });
      }
      return;
    }

    logger.error(`Scrape error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  scrapeController
};
