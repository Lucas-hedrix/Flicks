const axios = require('axios');
const m3u8Parser = require('m3u8-parser');
const logger = require('../utils/logger');

const parsePlaylist = async (url) => {
  try {
    const response = await axios.get(url, { timeout: 10000 });
    const parser = new m3u8Parser.Parser();
    parser.push(response.data);
    parser.end();

    const parsed = parser.manifest;
    
    // Check for encryption
    let isEncrypted = false;
    if (parsed.segments && parsed.segments.length > 0) {
      const sampleSegment = parsed.segments[0];
      if (sampleSegment.key && sampleSegment.key.method && sampleSegment.key.method !== 'NONE') {
        isEncrypted = true;
      }
    }

    if (isEncrypted) {
      throw new Error('Encrypted HLS streams (AES-128, etc.) are currently not supported for direct download without key resolution.');
    }

    // Check if it's a master playlist
    if (parsed.playlists && parsed.playlists.length > 0) {
      logger.info('Master playlist detected. Selecting highest bandwidth stream...');
      // Sort by bandwidth descending
      parsed.playlists.sort((a, b) => b.attributes.BANDWIDTH - a.attributes.BANDWIDTH);
      const bestPlaylist = parsed.playlists[0];
      const bestPlaylistUrl = new URL(bestPlaylist.uri, url).toString();
      logger.info(`Selected sub-playlist: ${bestPlaylistUrl}`);
      // Recursively parse the selected sub-playlist
      return await parsePlaylist(bestPlaylistUrl);
    }

    if (!parsed.segments || parsed.segments.length === 0) {
      throw new Error('No video chunks (segments) found in the playlist.');
    }

    const tsUrls = parsed.segments.map(segment => new URL(segment.uri, url).toString());
    return tsUrls;

  } catch (error) {
    logger.error(`Error parsing playlist ${url}: ${error.message}`);
    throw error;
  }
};

module.exports = {
  parsePlaylist
};
