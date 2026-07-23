const express = require('express');
const { proxyVideoStream } = require('../controllers/proxy.controller');
const { proxyM3u8, proxySegment } = require('../controllers/m3u8proxy.controller');
const { downloadLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/video', downloadLimiter, proxyVideoStream);
router.get('/m3u8', proxyM3u8);
router.get('/segment', proxySegment);

module.exports = router;
