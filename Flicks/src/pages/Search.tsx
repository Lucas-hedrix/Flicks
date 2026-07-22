import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { TMDBService } from '../services/TMDBService';
import type { MediaItem } from '../services/TMDBService';

export const Search: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      
      setLoading(true);
      try {
        const res = await TMDBService.searchMulti(query);
        const filtered = res.results.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv');
        setResults(filtered);
      } catch (err) {
        console.error("Failed to fetch search results", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  const handleContentClick = (item: MediaItem) => {
    navigate(`/detail/${item.media_type || 'movie'}/${item.id}`, { state: { content: item } });
  };

  return (
    <div className="pt-24 px-4 md:px-12 pb-20 min-h-screen">
      <h1 className="text-2xl font-bold text-white mb-6">
        Search Results for "{query}"
      </h1>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 border-4 border-netflix-red border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : results.length === 0 ? (
        <div className="text-gray-400 text-center mt-20">
          No results found. Try a different search term.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {results.map((item) => {
            const title = item.title || item.name || 'Unknown';
            const rating = item.vote_average ? item.vote_average.toFixed(1) : '';
            return (
              <div 
                key={item.id} 
                className="relative cursor-pointer transition-transform duration-300 hover:scale-105 group/card rounded-md overflow-hidden bg-netflix-dark-gray shadow-md"
                onClick={() => handleContentClick(item)}
              >
                {item.poster_path ? (
                  <img 
                    src={TMDBService.getImageUrl(item.poster_path, 'w500')} 
                    alt={title}
                    className="w-full h-auto aspect-2/3 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full aspect-2/3 bg-gray-800 flex items-center justify-center text-center p-2 text-sm text-gray-400">
                    No Image
                  </div>
                )}
                {/* Rating Badge */}
                {rating && (
                  <div className="absolute top-2 right-2 bg-black/80 rounded px-1.5 py-0.5 flex items-center gap-1">
                    <span className="text-yellow-400 text-xs">★</span>
                    <span className="text-white text-xs font-bold">{rating}</span>
                  </div>
                )}
                {/* Title Overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black via-black/80 to-transparent p-2 pt-8">
                  <h3 className="text-white text-xs md:text-sm font-semibold text-center truncate shadow-sm">
                    {title}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
