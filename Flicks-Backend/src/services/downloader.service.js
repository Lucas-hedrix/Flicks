const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const logger = require('../utils/logger');

// Configure axios to retry on network errors or 5xx status codes
axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status >= 500;
  }
});

const downloadChunksConcurrently = async (tsUrls, res, req) => {
  // We cannot easily pipe concurrent downloads in order to the response stream without a complex buffer.
  // To keep it simple and ensure correct order, we download sequentially but with retries and proper timeouts.
  // A true concurrent downloader to a single sequential stream would require buffering chunks in memory or disk.
  // For now, sequential with axios-retry and abort controller is much more robust than the original.
  
  let isAborted = false;

  req.on('close', () => {
    logger.warn('Client disconnected. Aborting download...');
    isAborted = true;
  });

  for (let i = 0; i < tsUrls.length; i++) {
    if (isAborted) break;
    
    const chunkUrl = tsUrls[i];
    try {
      const chunkResponse = await axios.get(chunkUrl, { 
        responseType: 'stream',
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': new URL(chunkUrl).origin
        }
      });
      
      await new Promise((resolve, reject) => {
        chunkResponse.data.pipe(res, { end: false });
        chunkResponse.data.on('end', resolve);
        chunkResponse.data.on('error', reject);
      });
      
    } catch (err) {
      logger.error(`Failed to fetch chunk ${i + 1}/${tsUrls.length}: ${err.message}. Aborting download to prevent corrupted file.`);
      // If a chunk fails completely after retries, abort the download so the file isn't corrupted silently.
      throw new Error(`Chunk download failed: ${err.message}`);
    }
  }
};

module.exports = {
  downloadChunksConcurrently
};
