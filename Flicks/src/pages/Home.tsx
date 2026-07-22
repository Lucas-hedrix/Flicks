import React, { useEffect, useState } from 'react';
import { HeroBanner } from '../components/HeroBanner';
import { HorizontalScrollList } from '../components/HorizontalScrollList';
import type { MediaItem } from '../services/TMDBService';
import { TMDBService } from '../services/TMDBService';
import { useNavigate } from 'react-router-dom';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [trendingMovies, setTrendingMovies] = useState<MediaItem[]>([]);
  const [trendingTV, setTrendingTV] = useState<MediaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<MediaItem[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<MediaItem[]>([]);
  const [actionMovies, setActionMovies] = useState<MediaItem[]>([]);
  const [comedyMovies, setComedyMovies] = useState<MediaItem[]>([]);
  const [horrorMovies, setHorrorMovies] = useState<MediaItem[]>([]);
  
  const [heroContent, setHeroContent] = useState<MediaItem | null>(null);

  const handleContentClick = (item: MediaItem, type: 'movie' | 'tv') => {
    navigate(`/detail/${type}/${item.id}`, { state: { content: item } });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          moviesRes, tvRes, popMoviesRes, topRatedRes, actionRes, comedyRes, horrorRes
        ] = await Promise.all([
          TMDBService.getTrendingMovies('week', 1),
          TMDBService.getTrendingTVShows('week', 1),
          TMDBService.getPopularMovies(1),
          TMDBService.getTopRatedMovies(1),
          TMDBService.discoverMoviesByGenre(28, 1),
          TMDBService.discoverMoviesByGenre(35, 1),
          TMDBService.discoverMoviesByGenre(27, 1)
        ]);

        const movies = moviesRes.results.map((m: any) => ({ ...m, media_type: 'movie' }));
        const tv = tvRes.results.map((m: any) => ({ ...m, media_type: 'tv' }));
        
        setTrendingMovies(movies);
        setTrendingTV(tv);
        setPopularMovies(popMoviesRes.results.map((m: any) => ({ ...m, media_type: 'movie' })));
        setTopRatedMovies(topRatedRes.results.map((m: any) => ({ ...m, media_type: 'movie' })));
        setActionMovies(actionRes.results.map((m: any) => ({ ...m, media_type: 'movie' })));
        setComedyMovies(comedyRes.results.map((m: any) => ({ ...m, media_type: 'movie' })));
        setHorrorMovies(horrorRes.results.map((m: any) => ({ ...m, media_type: 'movie' })));

        if (movies.length > 0) {
          setHeroContent(movies[0]);
        }
      } catch (error) {
        console.error('Failed to fetch home content', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="pb-20">
      <HeroBanner 
        content={heroContent} 
        onPlay={() => heroContent && handleContentClick(heroContent, heroContent.media_type as 'movie' | 'tv' || 'movie')}
      />
      
      <div className="-mt-24 md:-mt-32 relative z-10">
        <HorizontalScrollList 
          title="Trending Movies" 
          data={trendingMovies} 
          onItemClick={(item) => handleContentClick(item, 'movie')} 
        />
        <HorizontalScrollList 
          title="Trending TV Shows" 
          data={trendingTV} 
          onItemClick={(item) => handleContentClick(item, 'tv')} 
        />
        <HorizontalScrollList 
          title="Popular Movies" 
          data={popularMovies} 
          onItemClick={(item) => handleContentClick(item, 'movie')} 
        />
        <HorizontalScrollList 
          title="Top Rated Classics" 
          data={topRatedMovies} 
          onItemClick={(item) => handleContentClick(item, 'movie')} 
        />
        <HorizontalScrollList 
          title="Action & Adventure" 
          data={actionMovies} 
          onItemClick={(item) => handleContentClick(item, 'movie')} 
        />
        <HorizontalScrollList 
          title="Comedies" 
          data={comedyMovies} 
          onItemClick={(item) => handleContentClick(item, 'movie')} 
        />
        <HorizontalScrollList 
          title="Horror Movies" 
          data={horrorMovies} 
          onItemClick={(item) => handleContentClick(item, 'movie')} 
        />
      </div>
    </div>
  );
};
