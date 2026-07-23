const {join} = require('path');

module.exports = {
  // Changes the cache location for Puppeteer so it gets deployed on Render
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
