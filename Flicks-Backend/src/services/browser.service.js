const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const logger = require('../utils/logger');

puppeteer.use(StealthPlugin());

let browserInstance = null;

const launchBrowser = async () => {
  logger.info('Initializing Puppeteer browser instance...');
  const browser = await puppeteer.launch({
    headless: 'new',
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

// Force a fresh browser after a fatal crash (Target/Session closed). Used by the
// scraper's bounded retry so a dead browser doesn't poison every subsequent request.
const relaunchBrowser = async () => {
  logger.warn('Relaunching Puppeteer browser instance...');
  await closeBrowser();
  return ensureBrowser();
};

// Create an isolated incognito-style context with its own page. Each scrape runs
// in its own context so concurrent scrapes can't leak cookies/state into each
// other and can be torn down independently (caller must close the context).
const createIsolatedContext = async () => {
  const browser = await ensureBrowser();
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  return { context, page };
};

module.exports = {
  initBrowser,
  ensureBrowser,
  getBrowser,
  closeBrowser,
  relaunchBrowser,
  createIsolatedContext,
};
