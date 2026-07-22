const express = require('express');
const { scrapeController } = require('../controllers/scrape.controller');
const { validateScrape } = require('../middleware/validate');
const { scrapeLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/', scrapeLimiter, validateScrape, scrapeController);

module.exports = router;
