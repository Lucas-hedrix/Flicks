const sanitize = require('sanitize-filename');
const { parsePlaylist } = require('../services/playlist.service');
const { downloadChunksConcurrently } = require('../services/downloader.service');
const logger = require('../utils/logger');

const downloadController = async (req, res, next) => {
  const { url, filename } = req.query;

  try {
    logger.info(`Processing download request for ${url}`);
    
    // 1. Parse playlist and get TS chunks (handles master playlists and encryption checks)
    const tsUrls = await parsePlaylist(url);
    
    // 2. Sanitize filename to prevent header injection
    const safeFilename = sanitize(filename || 'video') + '.ts';
    
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Type', 'video/MP2T');
    
    // 3. Prevent cache to avoid serving stale streams
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // 4. Download chunks sequentially (with retries and abort controller)
    await downloadChunksConcurrently(tsUrls, res, req);
    
    res.end();
    logger.info('Download completed successfully');
  } catch (error) {
    if (!res.headersSent) {
      next(error);
    } else {
      logger.error('Download failed mid-stream, closing connection.');
      // Force close the response to stop streaming
      res.destroy();
    }
  }
};

module.exports = {
  downloadController
};
