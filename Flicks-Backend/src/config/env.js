require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  SCRAPE_TIMEOUT: parseInt(process.env.SCRAPE_TIMEOUT || '15000', 10),
  ALLOWED_HOSTS: (process.env.ALLOWED_HOSTS || '').split(',').map(h => h.trim()).filter(Boolean)
};
