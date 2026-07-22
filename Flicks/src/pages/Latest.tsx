import React, { useEffect, useState } from 'react';
import { HeroBanner } from '../components/HeroBanner';
import { HorizontalScrollList } from '../components/HorizontalScrollList';
import type { MediaItem } from '../services/TMDBService';
import { TMDBService } from '../services/TMDBService';
import { useNavigate } from 'react-router-dom';

export const Latest: React.FC = () => {
  const navigate = useNavigate();
  const [trendingMovies, setTrendingMovies] = useState<MediaItem[]>([]);
  const [trendingTV, setTrendingTV] = useState<MediaItem[]>([]);
  
  const [heroContent, setHeroContent] = useState<MediaItem | null>(null);

  const handleContentClick = (item: MediaItem, type: 'movie' | 'tv') => {
    navigate(`/detail/${type}/${item.id}`, { state: { content: item } });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [moviesRes, tvRes] = await Promise.all([
          TMDBService.getTrendingMovies('day', 1),
          TMDBService.getTrendingTVShows('day', 1)
        ]);

        const movies = moviesRes.results.map((m: any) => ({ ...m, media_type: 'movie' }));
        const tv = tvRes.results.map((m: any) => ({ ...m, media_type: 'tv' }));

        setTrendingMovies(movies);
        setTrendingTV(tv);

        if (movies.length > 0) {
          setHeroContent(movies[0]);
        }
      } catch (error) {
        console.error('Failed to fetch latest content', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="pb-20">
      <HeroBanner 
        content={heroContent} 
        onPlay={() => heroContent && handleContentClick(heroContent, 'movie')}
      />
      
      <div className="-mt-24 md:-mt-32 relative z-10">
        <HorizontalScrollList 
          title="New Movies Today" 
          data={trendingMovies} 
          onItemClick={(item) => handleContentClick(item, 'movie')} 
        />
        <HorizontalScrollList 
          title="New TV Shows Today" 
          data={trendingTV} 
          onItemClick={(item) => handleContentClick(item, 'tv')} 
        />
      </div>
    </div>
  );
};
