const { scrapeVideoStream } = require('./src/services/scraper.service');
const { initBrowser, closeBrowser } = require('./src/services/browser.service');

(async () => {
  try {
    await initBrowser();
    console.log('Testing scrapeVideoStream...');
    const url = await scrapeVideoStream('movie', 550);
    console.log('Success:', url);
  } catch (error) {
    console.error('Test Error:', error);
  } finally {
    await closeBrowser();
  }
})();
