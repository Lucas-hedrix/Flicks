const express = require('express');
const {
  downloadController,
  downloadStreamController,
} = require('../controllers/download.controller');
const { validateDownload, validateDownloadStream } = require('../middleware/validate');
const { downloadLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Legacy callback: no longer used by the frontend, kept for compat.
router.get('/', downloadLimiter, validateDownload, downloadController);

// IDM-style download: ffmpeg muxes the scraped HLS stream into a single .mp4.
router.get('/stream', downloadLimiter, validateDownloadStream, downloadStreamController);

module.exports = router;
