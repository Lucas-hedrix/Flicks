const express = require('express');
const { proxyVideoStream } = require('../controllers/proxy.controller');
const { downloadLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/video', downloadLimiter, proxyVideoStream);

module.exports = router;
