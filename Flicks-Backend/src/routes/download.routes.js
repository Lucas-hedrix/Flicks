const express = require('express');
const { downloadController } = require('../controllers/download.controller');
const { validateDownload } = require('../middleware/validate');
const { downloadLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/', downloadLimiter, validateDownload, downloadController);

module.exports = router;
