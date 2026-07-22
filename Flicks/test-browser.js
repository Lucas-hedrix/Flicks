import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request =>
    console.log(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`)
  );

  console.log("Navigating to http://localhost:5173 ...");
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    console.log("Navigation complete.");
  } catch(e) {
    console.log("Failed to load page:", e.message);
  }
  
  await browser.close();
})();
