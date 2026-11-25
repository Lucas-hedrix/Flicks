const { PuppeteerBlocker, fromPuppeteerDetails } = require('@cliqz/adblocker-puppeteer');
const fetch = require('cross-fetch');
const logger = require('../utils/logger');

// Resource types that are useless for stream sniffing. Blocking them makes pages
// load dramatically faster and starves most ad/popup scripts of their assets.
const BLOCKED_RESOURCE_TYPES = new Set(['image', 'font', 'stylesheet']);

// A URL is a candidate stream if it points at an HLS playlist, a direct MP4, or
// is a media request (some CDNs serve video without a .m3u8/.mp4 URL extension).
const isCandidateStream = (url, resourceType) =>
  /\.m3u8(\?|$)/i.test(url) || /\.mp4(\?|$)/i.test(url) || resourceType === 'media';

let blockerPromise = null;

// Lazily load the Ghostery/cliqz ad + tracking engine. This fetches filter
// lists over the network, so it is intentionally NON-FATAL: if the lists can't
// be downloaded (offline, CDN down, cold start) we resolve to null and rely on
// resource-type blocking alone. The promise is cached so lists load only once.
const getBlocker = () => {
  if (!blockerPromise) {
    blockerPromise = PuppeteerBlocker.fromPrebuiltAdsAndTracking(fetch)
      .then((blocker) => {
        logger.info('Adblock engine loaded (ads + tracking filter lists).');
        return blocker;
      })
      .catch((err) => {
        logger.warn(`Adblock engine unavailable, continuing with resource-type blocking only: ${err.message}`);
        return null;
      });
  }
  return blockerPromise;
};

// Warm the engine at boot so the first scrape isn't slowed by the list download.
const initAdblock = () => {
  getBlocker();
};

/**
 * Harden a page for scraping using a SINGLE request-interception handler.
 *
 * We deliberately do NOT use the blocker's own `enableBlockingInPage`, because
 * that installs a second `request` listener and toggles interception itself —
 * which races our handler and throws "Request is already handled". Instead we
 * run one handler that does everything, in order:
 *   1. surface candidate stream requests (.m3u8/.mp4) + their headers,
 *   2. abort heavy resource types (image/font/stylesheet/media),
 *   3. abort ad/tracker requests matched by the cliqz engine (when loaded),
 *   4. otherwise let the request continue.
 *
 * @param {import('puppeteer').Page} page
 * @param {(info: {url: string, headers: Record<string,string>, resourceType: string}) => void} onCandidate
 */
const applyPageHardening = async (page, onCandidate) => {
  const blocker = await getBlocker();
  await page.setRequestInterception(true);

  page.on('request', (request) => {
    // If some other handler already resolved this request, never touch it again.
    if (request.isInterceptResolutionHandled()) return;

    const url = request.url();
    const resourceType = request.resourceType();

    // 1. Record candidates BEFORE any abort decision, so we still capture the
    //    URL + headers even for a media request we are about to block.
    if (isCandidateStream(url, resourceType)) {
      try {
        onCandidate({ url, headers: request.headers(), resourceType });
      } catch (e) {
        logger.debug(`onCandidate handler threw: ${e.message}`);
      }
    }

    // 2. Block heavy resource types we never need.
    if (BLOCKED_RESOURCE_TYPES.has(resourceType)) {
      return request.abort('blockedbyclient').catch(() => {});
    }

    // 3. Block ads/trackers by host (engine may be null if lists failed to load).
    if (blocker) {
      try {
        const { match } = blocker.match(fromPuppeteerDetails(request));
        if (match) {
          return request.abort('blockedbyclient').catch(() => {});
        }
      } catch (e) {
        // Fall through to continue() on any matcher error.
        logger.debug(`Adblock match error: ${e.message}`);
      }
    }

    // 4. Allow everything else through.
    return request.continue().catch(() => {});
  });
};

module.exports = {
  applyPageHardening,
  initAdblock,
  isCandidateStream,
};
