const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const logger = require('../utils/logger');

puppeteer.use(StealthPlugin());

let browserInstance = null;

const launchBrowser = async () => {
  logger.info('Initializing Puppeteer browser instance...');
  const browser = await puppeteer.launch({
    headless: 'new',
    channel: 'chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-popup-blocking',
    ],
  });

  browser.on('disconnected', () => {
    logger.warn('Puppeteer browser disconnected.');
    if (browserInstance === browser) {
      browserInstance = null;
    }
  });

  logger.info('Browser initialized.');
  return browser;
};

const isBrowserAlive = (browser) => Boolean(browser?.connected);

const initBrowser = async () => {
  if (isBrowserAlive(browserInstance)) {
    return browserInstance;
  }
  browserInstance = null;
  browserInstance = await launchBrowser();
  return browserInstance;
};

const ensureBrowser = async () => {
  if (isBrowserAlive(browserInstance)) {
    return browserInstance;
  }
  browserInstance = null;
  browserInstance = await launchBrowser();
  return browserInstance;
};

const getBrowser = () => {
  if (!isBrowserAlive(browserInstance)) {
    throw new Error('Browser is not initialized or disconnected. Call ensureBrowser() first.');
  }
  return browserInstance;
};

const closeBrowser = async () => {
  if (browserInstance) {
    logger.info('Closing Puppeteer browser instance...');
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }
};

module.exports = {
  initBrowser,
  ensureBrowser,
  getBrowser,
  closeBrowser,
};
