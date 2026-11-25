const sanitize = require('sanitize-filename');
const ffmpegPath = require('ffmpeg-static');
const { spawn } = require('child_process');
const { parsePlaylist } = require('../services/playlist.service');
const { downloadChunksConcurrently } = require('../services/downloader.service');
const logger = require('../utils/logger');

// Template for a ProxyError-free fallback: when ffmpeg isn't available (binary
// failed to install on the host), we fall back to the old sequential chunker.

/**
 * IDM-style download: resolve the scraped m3u8 + captured headers into a single
 * .mp4 by letting ffmpeg read the *proxied* playlist.
 *
 * The frontend passes the RAW stream URL plus the captured Referer/Origin. We
 * rebuild the same self-proxied m3u8 URL used for playback (/api/proxy/m3u8),
 * then point ffmpeg at it. ffmpeg's HLS reader follows our proxied segment URLs,
 * so every segment fetch goes through /api/proxy/segment, which replays the
 * hotlink headers AND serves the AES-128 key through a proxy URI. ffmpeg handles
 * key retrieval + decryption transparently. We only remux (-c copy), so a
 * playable .mp4 is streamed back with zero server-side re-encoding.
 */
const downloadStreamController = async (req, res, next) => {
  const { url } = req.query;

  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  // If ffmpeg-static didn't provide a binary (unusual host/SIGPIPE), degrade to
  // the legacy chunker rather than erroring outright.
  if (!ffmpegPath) {
    logger.warn('ffmpeg-static unavailable; falling back to sequential chunk download');
    return legacyDownload(req, res, next);
  }

  try {
    const ref = req.query.ref || '';
    const origin = req.query.origin || '';
    const filename = req.query.filename || 'video';

    // Rebuild the self-proxied m3u8 URL (mirrors scrape.controller.js
    // buildProxiedUrl so headers + host rewriting are preserved).
    const params = new URLSearchParams({ url });
    if (ref) params.set('ref', ref);
    if (origin) params.set('origin', origin);
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const proxiedM3u8Url = `${protocol}://${host}/api/proxy/m3u8?${params.toString()}`;

    const safeFilename = sanitize(filename) + '.mp4';
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    logger.info(`Download stream: ffmpeg → ${proxiedM3u8Url.slice(0, 120)}...`);

    const ffmpeg = spawn(
      ffmpegPath,
      [
        '-hide_banner',
        '-loglevel', 'warning',
        '-nostdin',
        '-i', proxiedM3u8Url,
        '-c', 'copy', // remux only, no transcode
        // NOTE: intentionally no -movflags faststart. faststart makes ffmpeg hold
        // ALL output until the file is complete (moov position), so a download
        // would show no progress and aborts would lose everything. Streaming the
        // moov at the end gives progressive, abort-resilient downloads that every
        // local player (VLC/mpv/etc.) handles.
        '-f', 'mp4',
        'pipe:1',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    ffmpeg.stdout.pipe(res);

    ffmpeg.stderr.on('data', (d) => logger.debug(`ffmpeg: ${d.toString().trim()}`));

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        logger.info('Download stream completed successfully');
        res.end();
      } else {
        logger.error(`ffmpeg exited with code ${code}`);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Failed to transcode stream' });
        } else {
          res.destroy();
        }
      }
    });

    ffmpeg.on('error', (err) => {
      logger.error(`ffmpeg spawn error: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download engine unavailable' });
      } else {
        res.destroy();
      }
    });

    // Kill the subprocess if the client disconnects mid-download. Use res.on('close')
    // with a writableEnded guard — req.on('close') fires as soon as a GET request is
    // fully received (immediately), which would kill ffmpeg before it produces output.
    res.on('close', () => {
      if (!res.writableEnded && !ffmpeg.killed) {
        logger.warn('Client disconnected mid-download, killing ffmpeg');
        ffmpeg.kill('SIGKILL');
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Legacy sequential chunk downloader (kept as a fallback when ffmpeg is absent
 * and for backwards compatibility).
 */
const legacyDownload = async (req, res, next) => {
  const { url, filename } = req.query;
  try {
    const tsUrls = await parsePlaylist(url);
    const safeFilename = sanitize(filename || 'video') + '.ts';
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Type', 'video/MP2T');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    await downloadChunksConcurrently(tsUrls, res, req);
    res.end();
    logger.info('Download completed successfully');
  } catch (error) {
    if (!res.headersSent) {
      next(error);
    } else {
      logger.error('Download failed mid-stream, closing connection.');
      res.destroy();
    }
  }
};

module.exports = {
  downloadController: legacyDownload,
  downloadStreamController,
};