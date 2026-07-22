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
      
      // Check if it's an MP4 URL - if so, proxy it through the backend
      if (videoUrl.includes('.mp4')) {
        logger.info('MP4 detected, creating proxy URL');
        const proxiedUrl = `/api/proxy/video?url=${encodeURIComponent(videoUrl)}`;
        logger.info(`Returning proxied URL: ${proxiedUrl}`);
        return res.json({ url: proxiedUrl, isProxied: true });
      }
      
      logger.info('Returning direct URL (HLS/M3U8)');
      return res.json({ url: videoUrl, isProxied: false });
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
