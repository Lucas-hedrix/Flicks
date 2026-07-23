const axios = require('axios');
const logger = require('../utils/logger');

const proxyVideoStream = async (req, res, next) => {
  const { url } = req.query;

  if (!url) {
    logger.error('Proxy error: No URL provided');
    return res.status(400).json({ error: 'Video URL is required' });
  }

  try {
    logger.info(`Proxying video stream from: ${url}`);

    // Extract the domain from the URL to use as Referer
    const videoUrlObj = new URL(url);
    const refererUrl = `${videoUrlObj.protocol}//${videoUrlObj.host}`;
    logger.info(`Using referer: ${refererUrl}`);

    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': refererUrl,
        'Origin': refererUrl,
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
      },
      validateStatus: () => true, // Accept all status codes
    });

    if (response.status < 200 || response.status >= 400) {
      logger.error(`Video source returned error status: ${response.status}`);
      return res.status(502).json({ error: `Video source error: ${response.status}` });
    }

    logger.info(`Video source returned ${response.status}, content-type: ${response.headers['content-type']}`);

    // Set appropriate headers for video streaming
    res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');
    res.setHeader('Content-Length', response.headers['content-length'] || '');
    res.setHeader('Accept-Ranges', 'bytes');
    
    if (req.query.download === 'true') {
      res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
    }
    
    // Prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Handle client disconnect
    req.on('close', () => {
      logger.info('Client disconnected from video stream');
      if (!response.data.destroyed) {
        response.data.destroy();
      }
    });

    // Pipe the response
    response.data.pipe(res);

    response.data.on('error', (err) => {
      logger.error(`Stream error: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Streaming failed' });
      } else {
        res.destroy();
      }
    });

    res.on('error', (err) => {
      logger.error(`Response error: ${err.message}`);
      if (!response.data.destroyed) {
        response.data.destroy();
      }
    });

    logger.info('Video streaming started successfully');

  } catch (error) {
    logger.error(`Proxy error: ${error.message}`);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to proxy video stream: ' + error.message });
    } else {
      res.destroy();
    }
  }
};

module.exports = {
  proxyVideoStream
};
