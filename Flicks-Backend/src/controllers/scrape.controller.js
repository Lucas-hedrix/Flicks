const { scrapeVideoStream } = require('../services/scraper.service');
const logger = require('../utils/logger');

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
    let videoUrl = await scrapeVideoStream(type, id, season, episode, abortController.signal);
    
    clearTimeout(timeoutId);

    if (videoUrl) {
      logger.info(`Scrape successful, got URL: ${videoUrl}`);
      
      // Route the stream through our M3U8 proxy which rewrites all fake-domain
      // segment URLs inside the playlist to real, fetchable URLs.
      const proxiedM3u8 = `/api/proxy/m3u8?url=${encodeURIComponent(videoUrl)}`;
      logger.info(`Returning proxied M3U8 URL: ${proxiedM3u8}`);
      return res.json({ url: proxiedM3u8, isProxied: true });
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
