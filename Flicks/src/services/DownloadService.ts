import { VidfastScraper } from './VidfastScraper';

export const DownloadService = {
  startDownload: async (type: 'movie' | 'tv', id: number, title: string, season?: number, episode?: number) => {
    try {
      // 1. Get the m3u8 URL from our scraper
      const result = await VidfastScraper.extractVideoUrl(type, id, season, episode);
      if (!result || !result.url) {
        alert("Could not find the video stream to download.");
        return;
      }

      // 2. We trigger the download via our backend
      // We will encode the m3u8Url and title, and tell the backend to pipe it as an attachment
      const encodedUrl = encodeURIComponent(result.url);
      const encodedTitle = encodeURIComponent(title.replace(/[^a-z0-9]/gi, '_').toLowerCase());
      
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const downloadEndpoint = `${baseUrl}/api/download?url=${encodedUrl}&filename=${encodedTitle}.ts`;
      
      // Open the download link in a new tab or iframe so the browser handles the file save dialog
      const link = document.createElement('a');
      link.href = downloadEndpoint;
      link.download = `${encodedTitle}.ts`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error("Failed to start download:", error);
      alert("An error occurred while starting the download.");
    }
  }
};
