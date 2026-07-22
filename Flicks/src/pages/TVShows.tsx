import React, { useEffect, useState } from 'react';
import { HeroBanner } from '../components/HeroBanner';
import { HorizontalScrollList } from '../components/HorizontalScrollList';
import type { MediaItem } from '../services/TMDBService';
import { TMDBService } from '../services/TMDBService';
import { useNavigate } from 'react-router-dom';

export const TVShows: React.FC = () => {
  const navigate = useNavigate();
  const [trendingTV, setTrendingTV] = useState<MediaItem[]>([]);
  const [popularTV, setPopularTV] = useState<MediaItem[]>([]);
  const [topRatedTV, setTopRatedTV] = useState<MediaItem[]>([]);
  const [actionTV, setActionTV] = useState<MediaItem[]>([]);
  const [comedyTV, setComedyTV] = useState<MediaItem[]>([]);
  const [dramaTV, setDramaTV] = useState<MediaItem[]>([]);
  const [sciFiTV, setSciFiTV] = useState<MediaItem[]>([]);
  
  const [heroContent, setHeroContent] = useState<MediaItem | null>(null);

  const handleContentClick = (item: MediaItem, type: 'movie' | 'tv') => {
    navigate(`/detail/${type}/${item.id}`, { state: { content: item } });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          tvRes, popTVRes, topRatedRes, actionRes, comedyRes, dramaRes, scifiRes
        ] = await Promise.all([
          TMDBService.getTrendingTVShows('week', 1),
          TMDBService.getPopularTVShows(1),
          TMDBService.getTopRatedTVShows(1),
          TMDBService.discoverTVShowsByGenre(10759, 1),
          TMDBService.discoverTVShowsByGenre(35, 1),
          TMDBService.discoverTVShowsByGenre(18, 1),
          TMDBService.discoverTVShowsByGenre(10765, 1)
        ]);

        const tv = tvRes.results.map((m: any) => ({ ...m, media_type: 'tv' }));
        
        setTrendingTV(tv);
        setPopularTV(popTVRes.results.map((m: any) => ({ ...m, media_type: 'tv' })));
        setTopRatedTV(topRatedRes.results.map((m: any) => ({ ...m, media_type: 'tv' })));
        setActionTV(actionRes.results.map((m: any) => ({ ...m, media_type: 'tv' })));
        setComedyTV(comedyRes.results.map((m: any) => ({ ...m, media_type: 'tv' })));
        setDramaTV(dramaRes.results.map((m: any) => ({ ...m, media_type: 'tv' })));
        setSciFiTV(scifiRes.results.map((m: any) => ({ ...m, media_type: 'tv' })));

        if (tv.length > 0) {
          setHeroContent(tv[0]);
        }
      } catch (error) {
        console.error('Failed to fetch tv content', error);
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
          title="Trending TV Shows" 
          data={trendingTV} 
          onItemClick={(item) => handleContentClick(item, 'tv')} 
        />
        <HorizontalScrollList 
          title="Popular TV Shows" 
          data={popularTV} 
          onItemClick={(item) => handleContentClick(item, 'tv')} 
        />
        <HorizontalScrollList 
          title="Top Rated TV Shows" 
          data={topRatedTV} 
          onItemClick={(item) => handleContentClick(item, 'tv')} 
        />
        <HorizontalScrollList 
          title="Action & Adventure" 
          data={actionTV} 
          onItemClick={(item) => handleContentClick(item, 'tv')} 
        />
        <HorizontalScrollList 
          title="Comedies" 
          data={comedyTV} 
          onItemClick={(item) => handleContentClick(item, 'tv')} 
        />
        <HorizontalScrollList 
          title="Dramas" 
          data={dramaTV} 
          onItemClick={(item) => handleContentClick(item, 'tv')} 
        />
        <HorizontalScrollList 
          title="Sci-Fi & Fantasy" 
          data={sciFiTV} 
          onItemClick={(item) => handleContentClick(item, 'tv')} 
        />
      </div>
    </div>
  );
};
