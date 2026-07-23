const {join} = require('path');

module.exports = {
  // Changes the cache location for Puppeteer so it gets deployed on Render
  // Placed inside node_modules so Render's build cache preserves it across deployments
  cacheDirectory: join(__dirname, 'node_modules', '.puppeteer_cache'),
};
