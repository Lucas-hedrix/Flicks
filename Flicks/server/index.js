import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import https from 'https';

puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());

// /api/scrape
app.get('/api/scrape', async (req, res) => {
  const { type, id, season, episode } = req.query;

  if (!type || !id) {
    return res.status(400).json({ error: 'Missing type or id' });
  }

  const sources = type === 'movie' 
    ? [
        `https://vidlink.pro/movie/${id}?autoplay=true`,
        `https://vidsrc.net/embed/movie?tmdb=${id}`,
        `https://vidsrc.to/embed/movie/${id}`,
        `https://vidfast.pro/movie/${id}?autoPlay=true`
      ]
    : [
        `https://vidlink.pro/tv/${id}/${season || 1}/${episode || 1}?autoplay=true`,
        `https://vidsrc.net/embed/tv?tmdb=${id}&season=${season || 1}&episode=${episode || 1}`,
        `https://vidsrc.to/embed/tv/${id}/${season || 1}/${episode || 1}`,
        `https://vidfast.pro/tv/${id}/${season || 1}/${episode || 1}?autoPlay=true`
      ];

  console.log(`Starting to scrape for ${type} ${id} (S${season} E${episode})`);

  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      channel: 'chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    let videoUrl = null;

    for (const urlToScrape of sources) {
      console.log(`Trying source: ${urlToScrape}`);
      videoUrl = await new Promise(async (resolve) => {
        const timeout = setTimeout(() => {
          resolve(null); // Return null if not found in 15s
        }, 15000);

        const requestListener = req => {
          const url = req.url();
          if (url.includes('.m3u8') || url.includes('.mp4')) {
            clearTimeout(timeout);
            page.removeListener('request', requestListener);
            resolve(url);
          }
        };

        page.on('request', requestListener);
        
        try {
          await page.goto(urlToScrape, { waitUntil: 'domcontentloaded' });
          
          // Wait a bit and try clicking center of the screen to trigger play if there is an overlay
          setTimeout(async () => {
              try {
                  await page.mouse.click(500, 300);
              } catch(e) {}
          }, 3000);

        } catch (err) {
          console.error("Navigation error:", err);
          resolve(null);
        }
      });

      if (videoUrl) {
        break; // Stop trying if we found a valid stream
      }
    }

    await browser.close();

    if (videoUrl) {
      console.log(`Found video URL: ${videoUrl}`);
      return res.json({ url: videoUrl });
    } else {
      console.log(`Could not extract video stream after trying all sources.`);
      return res.status(404).json({ error: 'Video stream not found' });
    }

  } catch (error) {
    console.error('Scraping error:', error);
    if (browser) await browser.close();
    return res.status(500).json({ error: 'Internal server error during scraping' });
  }
});

// /api/download
app.get('/api/download', (req, res) => {
  const { url, filename } = req.query;
  
  if (!url || !filename) {
    return res.status(400).send('Missing url or filename');
  }

  console.log(`Downloading: ${url}`);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  // Proxy the request directly to the client
  https.get(url, (proxyRes) => {
    // Copy content-type from original stream if we want, or just let it be download
    proxyRes.pipe(res);
  }).on('error', (e) => {
    console.error('Download error:', e);
    res.status(500).send('Failed to download video');
  });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
