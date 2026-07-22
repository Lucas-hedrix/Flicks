const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  const found = [];

  page.on('request', (req) => {
    const u = req.url();
    if (u.includes('.m3u8') || u.includes('.mp4') || u.includes('master') || u.includes('playlist')) {
      found.push({ type: 'req', url: u });
      console.log('REQ:', u.slice(0, 120));
    }
  });

  page.on('response', (res) => {
    const u = res.url();
    if (u.includes('.m3u8')) {
      found.push({ type: 'res', url: u });
      console.log('RES:', u.slice(0, 120));
    }
  });

  const url = 'https://vidfast.vc/movie/550?autoPlay=true';
  console.log('goto', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  for (let i = 0; i < 5; i++) {
    await page.mouse.click(640, 360);
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log('found count', found.length);
  await page.screenshot({ path: 'debug-vidfast.png' });
  await browser.close();
})().catch((e) => {
  console.error('FAIL', e.message);
  process.exit(1);
});
