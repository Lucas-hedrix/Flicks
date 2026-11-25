const axios = require('axios');
const logger = require('../utils/logger');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Given a URL that may use a fake/CDN-internal hostname (e.g. flow.dasnext.store),
 * rewrite the host to the real server using the ?host= query param if present.
 */
function rewriteHost(rawUrl) {
  try {
    const urlObj = new URL(rawUrl);
    const hostParam = urlObj.searchParams.get('host');
    if (hostParam) {
      const realHost = new URL(hostParam).host;
      urlObj.host = realHost;
    }
    return urlObj.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * Build a self-proxied segment URL, carrying the captured Referer/Origin so the
 * segment fetch replays the same headers the player used (defeats CDN hotlink 403s).
 */
function buildSegmentUrl(selfBase, realUrl, ref, origin) {
  const params = new URLSearchParams({ url: realUrl });
  if (ref) params.set('ref', ref);
  if (origin) params.set('origin', origin);
  return `${selfBase}/api/proxy/segment?${params.toString()}`;
}

/**
 * Rewrite all segment/resource URLs inside an M3U8 playlist so they go through
 * our own /api/proxy/segment endpoint (which performs the host rewrite at fetch time).
 *
 * @param {string} content   Raw M3U8 text
 * @param {string} baseUrl   The absolute URL of the M3U8 (used to resolve relative paths)
 * @param {string} selfBase  The base URL of our backend server (e.g. https://flicks-api.onrender.com)
 * @param {string} [ref]     Referer captured during scraping, threaded into segment URLs
 * @param {string} [origin]  Origin captured during scraping, threaded into segment URLs
 */
function rewriteM3u8(content, baseUrl, selfBase, ref, origin) {
  const lines = content.split('\n');
  const rewritten = lines.map((line) => {
    const trimmed = line.trim();

    // Skip empty lines, comments that are not URIs
    if (!trimmed || (trimmed.startsWith('#') && !trimmed.includes('URI="'))) {
      // Handle EXT-X-KEY / EXT-X-MAP URI attributes
      if (trimmed.startsWith('#') && trimmed.includes('URI="')) {
        return trimmed.replace(/URI="([^"]+)"/g, (match, uri) => {
          const absolute = toAbsolute(uri, baseUrl);
          const real = rewriteHost(absolute);
          return `URI="${buildSegmentUrl(selfBase, real, ref, origin)}"`;
        });
      }
      return line;
    }

    // Segment or sub-playlist line (not a comment)
    if (!trimmed.startsWith('#')) {
      const absolute = toAbsolute(trimmed, baseUrl);
      const real = rewriteHost(absolute);
      return buildSegmentUrl(selfBase, real, ref, origin);
    }

    return line;
  });

  return rewritten.join('\n');
}

function toAbsolute(uri, base) {
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;
  try {
    return new URL(uri, base).toString();
  } catch {
    return uri;
  }
}

// GET /api/proxy/m3u8?url=<encoded-real-m3u8-url>&ref=<referer>&origin=<origin>
const proxyM3u8 = async (req, res) => {
  const { url, ref, origin } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'url parameter is required' });
  }

  const realUrl = rewriteHost(url);

  // Prefer the referer/origin captured while scraping; fall back to the stream's
  // own origin when they weren't captured (keeps old behavior working).
  const refererHeader = ref || new URL(realUrl).origin;
  const originHeader = origin || new URL(realUrl).origin;

  logger.info(`M3U8 proxy: fetching ${realUrl} (referer=${refererHeader})`);

  try {
    const response = await axios.get(realUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: refererHeader,
        Origin: originHeader,
      },
    });

    const content = typeof response.data === 'string' ? response.data : String(response.data);

    // Determine the base of our own backend so we can build absolute proxy URLs
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const selfBase = `${protocol}://${host}`;

    const rewrittenContent = rewriteM3u8(content, realUrl, selfBase, ref, origin);

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(rewrittenContent);
  } catch (err) {
    logger.error(`M3U8 proxy error: ${err.message}`);
    res.status(502).json({ error: `Failed to fetch M3U8: ${err.message}` });
  }
};

// GET /api/proxy/segment?url=<encoded-segment-url>&ref=<referer>&origin=<origin>
const proxySegment = async (req, res) => {
  const { url, ref, origin } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'url parameter is required' });
  }

  const realUrl = rewriteHost(url);

  const refererHeader = ref || new URL(realUrl).origin;
  const originHeader = origin || new URL(realUrl).origin;

  logger.info(`Segment proxy: fetching ${realUrl}`);

  try {
    const response = await axios.get(realUrl, {
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: '*/*',
        Referer: refererHeader,
        Origin: originHeader,
        ...(req.headers.range ? { Range: req.headers.range } : {}),
      },
      validateStatus: () => true,
    });

    // A "segment" URL can actually be a nested HLS playlist (a master -> variant
    // sub-playlist). Downstream consumers (hls.js, or ffmpeg during download)
    // resolve this sub-playlist's segment URIs relative to the URL they fetched,
    // which here is our proxy URL — so we MUST rewrite those URIs back through
    // /api/proxy/segment carrying the same headers, else they 404.
    const contentType = (response.headers['content-type'] || '').toLowerCase();
    const upstreamIsHls =
      contentType.includes('mpegurl') ||
      /\.m3u8(\?|$)/i.test(realUrl);

    if (upstreamIsHls) {
      // Buffer the (small) playlist body, rewrite it, send as text + allow CORS.
      const chunks = [];
      for await (const chunk of response.data) {
        chunks.push(chunk);
      }
      const rawContent = Buffer.concat(chunks).toString('utf8');
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const selfBase = `${protocol}://${host}`;
      const rewritten = rewriteM3u8(rawContent, realUrl, selfBase, ref, origin);
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache');
      return res.status(200).send(rewritten);
    }

    res.status(response.status);
    res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp2t');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }
    if (response.headers['content-range']) {
      res.setHeader('Content-Range', response.headers['content-range']);
    }
    res.setHeader('Accept-Ranges', 'bytes');

    response.data.pipe(res);

    response.data.on('error', (err) => {
      logger.error(`Segment stream error: ${err.message}`);
      if (!res.headersSent) res.status(500).end();
    });
  } catch (err) {
    logger.error(`Segment proxy error: ${err.message}`);
    if (!res.headersSent) {
      res.status(502).json({ error: `Failed to fetch segment: ${err.message}` });
    }
  }
};

module.exports = { proxyM3u8, proxySegment };
