const rateLimit = require('express-rate-limit');

const scrapeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many downloads from this IP, please try again after 15 minutes' }
});

module.exports = {
  scrapeLimiter,
  downloadLimiter
};
