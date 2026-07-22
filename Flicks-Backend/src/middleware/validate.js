const { ALLOWED_HOSTS } = require('../config/env');

const validateScrape = (req, res, next) => {
  const { type, id, season, episode } = req.query;

  if (!type || !['movie', 'tv'].includes(type)) {
    return res.status(400).json({ error: 'Invalid or missing type parameter. Must be movie or tv.' });
  }

  if (!id || isNaN(parseInt(id, 10))) {
    return res.status(400).json({ error: 'Invalid or missing id parameter. Must be numeric.' });
  }

  if (type === 'tv') {
    if (season && isNaN(parseInt(season, 10))) {
      return res.status(400).json({ error: 'Season must be numeric.' });
    }
    if (episode && isNaN(parseInt(episode, 10))) {
      return res.status(400).json({ error: 'Episode must be numeric.' });
    }
  }

  next();
};

const validateDownload = (req, res, next) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: 'Invalid URL protocol' });
    }

    // SSRF Protection
    const hostname = parsedUrl.hostname;
    // Allow if hostname ends with any allowed host or exactly matches
    const isAllowed = ALLOWED_HOSTS.some(host => hostname === host || hostname.endsWith(`.${host}`));
    if (!isAllowed) {
      return res.status(403).json({ error: 'Requested host is not allowed' });
    }
  } catch (error) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  next();
};

module.exports = {
  validateScrape,
  validateDownload
};
