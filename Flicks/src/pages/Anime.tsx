import React, { useEffect, useState } from 'react';
import { HeroBanner } from '../components/HeroBanner';
import { HorizontalScrollList } from '../components/HorizontalScrollList';
import type { MediaItem } from '../services/TMDBService';
import { TMDBService } from '../services/TMDBService';
import { useNavigate } from 'react-router-dom';

export const Anime: React.FC = () => {
  const navigate = useNavigate();
  const [trendingAnime, setTrendingAnime] = useState<MediaItem[]>([]);
  const [popularAnime, setPopularAnime] = useState<MediaItem[]>([]);
  const [topRatedAnime, setTopRatedAnime] = useState<MediaItem[]>([]);
  const [animeMovies, setAnimeMovies] = useState<MediaItem[]>([]);
  
  const [heroContent, setHeroContent] = useState<MediaItem | null>(null);

  const handleContentClick = (item: MediaItem, type: 'movie' | 'tv') => {
    navigate(`/detail/${type}/${item.id}`, { state: { content: item } });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          trendingRes, popRes, topRatedRes, moviesRes
        ] = await Promise.all([
          TMDBService.getTrendingAnime('week', 1),
          TMDBService.getPopularAnime(1),
          TMDBService.getTopRatedAnime(1),
          TMDBService.getPopularAnimeMovies(1)
        ]);

        const trending = trendingRes.results.map((m: any) => ({ ...m, media_type: 'tv' }));
        
        setTrendingAnime(trending);
        setPopularAnime(popRes.results.map((m: any) => ({ ...m, media_type: 'tv' })));
        setTopRatedAnime(topRatedRes.results.map((m: any) => ({ ...m, media_type: 'tv' })));
        setAnimeMovies(moviesRes.results.map((m: any) => ({ ...m, media_type: 'movie' })));

        if (trending.length > 0) {
          setHeroContent(trending[0]);
        }
      } catch (error) {
        console.error('Failed to fetch anime content', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="pb-20 pt-16 md:pt-0">
      <HeroBanner 
        content={heroContent} 
        onPlay={() => heroContent && handleContentClick(heroContent, 'tv')}
      />
      
      <div className="-mt-24 md:-mt-32 relative z-10">
        <HorizontalScrollList 
          title="Trending Anime" 
          data={trendingAnime} 
          onItemClick={(item) => handleContentClick(item, 'tv')} 
        />
        <HorizontalScrollList 
          title="Popular Anime Series" 
          data={popularAnime} 
          onItemClick={(item) => handleContentClick(item, 'tv')} 
        />
        <HorizontalScrollList 
          title="Top Rated Anime" 
          data={topRatedAnime} 
          onItemClick={(item) => handleContentClick(item, 'tv')} 
        />
        <HorizontalScrollList 
          title="Anime Movies" 
          data={animeMovies} 
          onItemClick={(item) => handleContentClick(item, 'movie')} 
        />
      </div>
    </div>
  );
};
