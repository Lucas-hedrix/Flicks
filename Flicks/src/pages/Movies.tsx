import React, { useEffect, useState } from 'react';
import { HeroBanner } from '../components/HeroBanner';
import { HorizontalScrollList } from '../components/HorizontalScrollList';
import type { MediaItem } from '../services/TMDBService';
import { TMDBService } from '../services/TMDBService';
import { useNavigate } from 'react-router-dom';

export const Movies: React.FC = () => {
  const navigate = useNavigate();
  const [trendingMovies, setTrendingMovies] = useState<MediaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<MediaItem[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<MediaItem[]>([]);
  const [actionMovies, setActionMovies] = useState<MediaItem[]>([]);
  const [comedyMovies, setComedyMovies] = useState<MediaItem[]>([]);
  const [horrorMovies, setHorrorMovies] = useState<MediaItem[]>([]);
  const [romanceMovies, setRomanceMovies] = useState<MediaItem[]>([]);
  
  const [heroContent, setHeroContent] = useState<MediaItem | null>(null);

  const handleContentClick = (item: MediaItem, type: 'movie' | 'tv') => {
    navigate(`/detail/${type}/${item.id}`, { state: { content: item } });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          moviesRes, popMoviesRes, topRatedRes, actionRes, comedyRes, horrorRes, romanceRes
        ] = await Promise.all([
          TMDBService.getTrendingMovies('week', 1),
          TMDBService.getPopularMovies(1),
          TMDBService.getTopRatedMovies(1),
          TMDBService.discoverMoviesByGenre(28, 1),
          TMDBService.discoverMoviesByGenre(35, 1),
          TMDBService.discoverMoviesByGenre(27, 1),
          TMDBService.discoverMoviesByGenre(10749, 1)
        ]);

        const movies = moviesRes.results.map((m: any) => ({ ...m, media_type: 'movie' }));
        
        setTrendingMovies(movies);
        setPopularMovies(popMoviesRes.results.map((m: any) => ({ ...m, media_type: 'movie' })));
        setTopRatedMovies(topRatedRes.results.map((m: any) => ({ ...m, media_type: 'movie' })));
        setActionMovies(actionRes.results.map((m: any) => ({ ...m, media_type: 'movie' })));
        setComedyMovies(comedyRes.results.map((m: any) => ({ ...m, media_type: 'movie' })));
        setHorrorMovies(horrorRes.results.map((m: any) => ({ ...m, media_type: 'movie' })));
        setRomanceMovies(romanceRes.results.map((m: any) => ({ ...m, media_type: 'movie' })));

        if (movies.length > 0) {
          setHeroContent(movies[0]);
        }
      } catch (error) {
        console.error('Failed to fetch movies content', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="pb-20 pt-16 md:pt-0">
      <HeroBanner 
        content={heroContent} 
        onPlay={() => heroContent && handleContentClick(heroContent, 'movie')}
      />
      
      <div className="-mt-24 md:-mt-32 relative z-10">
        <HorizontalScrollList 
          title="Trending Movies" 
          data={trendingMovies} 
          onItemClick={(item) => handleContentClick(item, 'movie')} 
        />
        <HorizontalScrollList 
          title="Popular Movies" 
          data={popularMovies} 
          onItemClick={(item) => handleContentClick(item, 'movie')} 
        />
        <HorizontalScrollList 
          title="Top Rated Movies" 
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
        <HorizontalScrollList 
          title="Romantic Movies" 
          data={romanceMovies} 
          onItemClick={(item) => handleContentClick(item, 'movie')} 
        />
      </div>
    </div>
  );
};
