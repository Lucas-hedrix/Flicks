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
      
      // If the URL has a ?host= parameter, rewrite the fake domain to the real one
      let finalUrl = videoUrl;
      try {
        const urlObj = new URL(videoUrl);
        const hostParam = urlObj.searchParams.get('host');
        if (hostParam) {
          const realHost = new URL(hostParam).host;
          urlObj.host = realHost;
          finalUrl = urlObj.toString();
          logger.info(`Rewrote fake domain to real host: ${finalUrl}`);
        }
      } catch (e) {
        logger.warn('Failed to parse URL host');
      }

      logger.info('Returning direct URL (HLS/M3U8)');
      return res.json({ url: finalUrl, isProxied: false });
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
