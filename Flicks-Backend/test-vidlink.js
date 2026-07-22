const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  page.on('request', req => {
    if (req.url().includes('.m3u8')) console.log('FOUND M3U8:', req.url());
  });

  console.log('Navigating to vidlink.pro embed...');
  await page.goto('https://vidlink.pro/movie/550', { waitUntil: 'networkidle2' });
  
  // click center to trigger
  await new Promise(r => setTimeout(r, 1000));
  await page.mouse.click(500, 300);
  await new Promise(r => setTimeout(r, 3000));
  
  await browser.close();
})();
