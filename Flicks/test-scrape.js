import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  console.log("Starting scrape test...");
  const browser = await puppeteer.launch({ 
    headless: true,
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  await page.goto('https://vidfast.pro/movie/550?autoPlay=true', { waitUntil: 'domcontentloaded' });
  
  console.log("Navigated to vidfast.pro");
  
  // wait 5 seconds to see what happens
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  await page.screenshot({ path: 'vidfast-screenshot.png' });
  console.log("Saved screenshot to vidfast-screenshot.png");
  
  await browser.close();
  console.log("Done");
})();
