export const DownloadService = {
  startDownload: async (
    type: 'movie' | 'tv',
    id: number,
    title: string,
    season?: number,
    episode?: number
  ) => {
    // Direct download via our backend download endpoint
    // The backend will use yt-dlp or ffmpeg to stitch the stream into a file
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const encodedTitle = encodeURIComponent(title.replace(/[^a-z0-9]/gi, '_').toLowerCase());

    let endpoint = `${baseUrl}/api/download?type=${type}&id=${id}&filename=${encodedTitle}`;
    if (type === 'tv' && season !== undefined && episode !== undefined) {
      endpoint += `&season=${season}&episode=${episode}`;
    }

    const link = document.createElement('a');
    link.href = endpoint;
    link.download = `${encodedTitle}.ts`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
