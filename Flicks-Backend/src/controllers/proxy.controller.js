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

    let targetUrl = url;
    const videoUrlObj = new URL(url);
    let refererUrl = `${videoUrlObj.protocol}//${videoUrlObj.host}`;
    let originUrl = refererUrl;
    
    // Many CDNs encode required headers in the query string (e.g. ?headers={"referer":"..."})
    const encodedHeaders = videoUrlObj.searchParams.get('headers');
    if (encodedHeaders) {
      try {
        const parsedHeaders = JSON.parse(encodedHeaders);
        if (parsedHeaders.referer) refererUrl = parsedHeaders.referer;
        if (parsedHeaders.origin) originUrl = parsedHeaders.origin;
      } catch (e) {
        logger.warn('Failed to parse embedded headers');
      }
    }
    
    // Some CDNs provide the real host in a ?host= parameter
    const hostParam = videoUrlObj.searchParams.get('host');
    if (hostParam) {
      try {
        const hostObj = new URL(hostParam);
        videoUrlObj.host = hostObj.host;
        targetUrl = videoUrlObj.toString();
      } catch (e) {
        logger.warn('Failed to parse host param');
      }
    }

    logger.info(`Using referer: ${refererUrl}, origin: ${originUrl}, targetUrl: ${targetUrl}`);

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': refererUrl,
      'Origin': originUrl,
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate',
    };

    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const response = await axios.get(targetUrl, {
      responseType: 'stream',
      timeout: 30000,
      headers: headers,
      validateStatus: () => true, // Accept all status codes
    });

    if (response.status < 200 || response.status >= 400) {
      logger.error(`Video source returned error status: ${response.status}`);
      return res.status(502).json({ error: `Video source error: ${response.status}` });
    }

    logger.info(`Video source returned ${response.status}, content-type: ${response.headers['content-type']}`);

    // Set appropriate headers for video streaming
    res.status(response.status);
    res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');
    
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }
    if (response.headers['content-range']) {
      res.setHeader('Content-Range', response.headers['content-range']);
    }
    
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
