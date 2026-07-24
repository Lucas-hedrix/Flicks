import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure we fetch some popular movies and tv shows to include in the sitemap
const API_KEY = 'd2e06759b45c2e45d4caba59984fec9c'; // From your constants.ts
const BASE_URL = 'https://api.themoviedb.org/3';
const DOMAIN = 'https://flicks.com'; // Replace this with your actual domain when you get one, or your vercel domain!

async function generateSitemap() {
  console.log('Generating sitemap...');
  try {
    const sitemapLines = [];
    
    // Add static routes
    const staticRoutes = [
      '/',
      '/tv',
      '/movies',
      '/latest',
      '/search'
    ];

    staticRoutes.forEach(route => {
      sitemapLines.push(`  <url>\n    <loc>${DOMAIN}${route}</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`);
    });

    // Fetch popular movies
    const moviesRes = await axios.get(`${BASE_URL}/movie/popular?api_key=${API_KEY}&page=1`);
    moviesRes.data.results.forEach((movie) => {
      sitemapLines.push(`  <url>\n    <loc>${DOMAIN}/detail/movie/${movie.id}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`);
    });

    // Fetch popular TV shows
    const tvRes = await axios.get(`${BASE_URL}/tv/popular?api_key=${API_KEY}&page=1`);
    tvRes.data.results.forEach((tv) => {
      sitemapLines.push(`  <url>\n    <loc>${DOMAIN}/detail/tv/${tv.id}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`);
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapLines.join('\n')}
</urlset>`;

    const publicPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
    fs.writeFileSync(publicPath, sitemap);
    console.log(`Sitemap successfully generated at ${publicPath}`);

  } catch (error) {
    console.error('Error generating sitemap:', error.message);
  }
}

generateSitemap();
