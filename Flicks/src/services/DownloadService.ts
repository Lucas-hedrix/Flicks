export const DownloadService = {
  startDownload: async (
    type: 'movie' | 'tv',
    id: number,
    title: string,
    season?: number,
    episode?: number
  ) => {
    // DLHub doesn't have an open API to auto-fetch direct links (they protect it with captchas/ads).
    // The most seamless integration is to open their search page with the exact title so the user
    // can just click the first result.
    const searchQuery = encodeURIComponent(title);
    const dlhubUrl = `https://dlhub.cc/search?q=${searchQuery}`;
    
    // Open in new tab
    window.open(dlhubUrl, '_blank', 'noopener,noreferrer');
  },
};

