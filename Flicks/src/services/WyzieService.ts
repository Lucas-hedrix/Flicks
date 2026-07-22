import axios from 'axios';

export interface WyzieSubtitleData {
  id: string;
  url: string;
  format: string;
  encoding: string;
  isHearingImpaired: boolean;
  flagUrl: string;
  media: string;
  display: string;
  language: string;
  source: number;
}

const WYZIE_API_KEY = 'wyzie-321c2sqfhhnu85fotb9qespjdv43vxa4';
const BASE_URL = 'https://sub.wyzie.io';

export const WyzieService = {
  searchSubtitles: async (tmdbId: number, season?: number, episode?: number): Promise<WyzieSubtitleData[]> => {
    try {
      const response = await axios.get(`${BASE_URL}/search`, {
        params: {
          id: tmdbId,
          season,
          episode,
          key: WYZIE_API_KEY,
        },
      });
      
      const data = Array.isArray(response.data) ? response.data : [];
      return data.map((item: any, index: number) => ({
        id: String(item.id ?? `subtitle_${index}`),
        url: item.url ?? item.download_url ?? '',
        format: item.format ?? 'srt',
        encoding: item.encoding ?? 'utf-8',
        isHearingImpaired: Boolean(item.isHearingImpaired ?? item.hi ?? false),
        flagUrl: item.flagUrl ?? item.flag_url ?? '',
        media: item.media ?? '',
        display: item.display ?? item.title ?? `Subtitle ${index + 1}`,
        language: item.language ?? 'unknown',
        source: typeof item.source === 'number' ? item.source : 0,
      })).filter(sub => Boolean(sub.url));
    } catch (error) {
      console.error('Failed to fetch Wyzie subtitles:', error);
      return [];
    }
  }
};
