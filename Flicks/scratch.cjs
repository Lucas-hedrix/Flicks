const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  page.on('request', req => {
    const url = req.url();
    if (url.includes('.m3u8') || url.includes('.mp4') || url.includes('/api/')) {
      console.log('Intercepted:', url);
    }
  });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('.m3u8') || url.includes('.mp4')) {
      console.log('Video Response:', url);
    }
  });

  console.log('Navigating to vidfast.pro/movie/550...');
  await page.goto('https://vidfast.pro/movie/550?autoPlay=true', { waitUntil: 'networkidle2' });
  
  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
})();
