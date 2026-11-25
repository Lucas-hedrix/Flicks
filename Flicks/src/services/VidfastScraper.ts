export interface ScrapeResult {
  url: string;
  isProxied?: boolean;
  kind?: string;
  /** Raw (unproxied) CDN stream URL — used to drive IDM-style downloads. */
  rawUrl?: string;
  referer?: string;
  origin?: string;
}

export class VidfastScraper {
  static async extractVideoUrl(type: 'movie' | 'tv', id: number, season?: number, episode?: number): Promise<ScrapeResult | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s; on timeout the player falls back to the iframe embed

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      let endpoint = `${baseUrl}/api/scrape?type=${type}&id=${id}`;
      if (type === 'tv' && season !== undefined && episode !== undefined) {
        endpoint += `&season=${season}&episode=${episode}`;
      }

      const response = await fetch(endpoint, { signal: controller.signal });
      
      if (response.status === 499) {
        console.warn('Scraping request was cancelled');
        return null;
      }
      
      if (!response.ok) {
        console.error('Failed to extract video url:', await response.text());
        return null;
      }
      
      const data = await response.json();
      let finalUrl = data.url;
      if (finalUrl.startsWith('/')) {
        finalUrl = `${baseUrl}${finalUrl}`;
      }
      return {
        url: finalUrl,
        isProxied: data.isProxied,
        kind: data.kind,
        rawUrl: data.rawUrl,
        referer: data.referer,
        origin: data.origin,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('Scraper timeout or request aborted');
      } else {
        console.error('Error fetching from local scraper backend:', error);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
