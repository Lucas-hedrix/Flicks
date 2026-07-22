import axios from 'axios';
import { TMDB_CONFIG } from '../utils/constants';

const api = axios.create({
  baseURL: TMDB_CONFIG.BASE_URL,
  params: {
    api_key: TMDB_CONFIG.API_KEY,
  },
});

export interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  media_type?: 'movie' | 'tv';
}

export const TMDBService = {
  getTrendingMovies: async (timeWindow: 'day' | 'week' = 'week', page: number = 1) => {
    const res = await api.get(`/trending/movie/${timeWindow}`, { params: { page } });
    return res.data;
  },
  
  getTrendingTVShows: async (timeWindow: 'day' | 'week' = 'week', page: number = 1) => {
    const res = await api.get(`/trending/tv/${timeWindow}`, { params: { page } });
    return res.data;
  },
  
  getPopularMovies: async (page: number = 1) => {
    const res = await api.get('/movie/popular', { params: { page } });
    return res.data;
  },
  
  getPopularTVShows: async (page: number = 1) => {
    const res = await api.get('/tv/popular', { params: { page } });
    return res.data;
  },
  
  searchMulti: async (query: string, page: number = 1) => {
    const res = await api.get('/search/multi', { params: { query, page } });
    return res.data;
  },

  getTopRatedMovies: async (page: number = 1) => {
    const res = await api.get('/movie/top_rated', { params: { page } });
    return res.data;
  },

  getTopRatedTVShows: async (page: number = 1) => {
    const res = await api.get('/tv/top_rated', { params: { page } });
    return res.data;
  },

  getMovieGenres: async () => {
    const res = await api.get('/genre/movie/list');
    return res.data;
  },

  getTVGenres: async () => {
    const res = await api.get('/genre/tv/list');
    return res.data;
  },

  discoverMoviesByGenre: async (genreId: number, page: number = 1) => {
    const res = await api.get('/discover/movie', {
      params: { with_genres: genreId, page, sort_by: 'popularity.desc' },
    });
    return res.data;
  },

  discoverTVShowsByGenre: async (genreId: number, page: number = 1) => {
    const res = await api.get('/discover/tv', {
      params: { with_genres: genreId, page, sort_by: 'popularity.desc' },
    });
    return res.data;
  },

  getMovieDetails: async (id: number) => {
    const res = await api.get(`/movie/${id}`);
    return res.data;
  },

  getTVShowDetails: async (id: number) => {
    const res = await api.get(`/tv/${id}`);
    return res.data;
  },

  getTVSeasonDetails: async (id: number, season_number: number) => {
    const res = await api.get(`/tv/${id}/season/${season_number}`);
    return res.data;
  },

  getSimilarMovies: async (id: number, page: number = 1) => {
    const res = await api.get(`/movie/${id}/similar`, { params: { page } });
    return res.data;
  },

  getSimilarTVShows: async (id: number, page: number = 1) => {
    const res = await api.get(`/tv/${id}/similar`, { params: { page } });
    return res.data;
  },

  getImageUrl: (path: string | null, size: 'w500' | 'w780' | 'original' = 'w500') => {
    if (!path) return '';
    return `https://image.tmdb.org/t/p/${size}${path}`;
  }
};
