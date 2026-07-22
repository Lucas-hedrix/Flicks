import React, { useRef } from 'react';
import type { MediaItem } from '../services/TMDBService';
import { TMDBService } from '../services/TMDBService';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface Props {
  title: string;
  data: MediaItem[];
  onItemClick?: (item: MediaItem) => void;
}

export const HorizontalScrollList: React.FC<Props> = ({ title, data, onItemClick }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = direction === 'left' ? -current.clientWidth : current.clientWidth;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="my-8 group relative">
      <h2 className="text-xl font-bold text-netflix-white mb-4 px-4 md:px-12">
        {title}
      </h2>
      
      {/* Scroll Controls */}
      <button 
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 p-2 md:p-4 text-white hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block rounded-r-md"
      >
        <FaChevronLeft size={24} />
      </button>

      <button 
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 p-2 md:p-4 text-white hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block rounded-l-md"
      >
        <FaChevronRight size={24} />
      </button>

      {/* Scroll Container */}
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto gap-4 px-4 md:px-12 pb-4 no-scrollbar scroll-smooth"
      >
        {data.map((item) => {
          const title = item.title || item.name || 'Unknown';
          const rating = item.vote_average ? item.vote_average.toFixed(1) : '';
          return (
          <div 
            key={item.id} 
            className="relative shrink-0 cursor-pointer transition-transform duration-300 hover:scale-105 hover:z-10 group/card rounded-md overflow-hidden bg-netflix-dark-gray shadow-md"
            onClick={() => onItemClick && onItemClick(item)}
          >
            <img 
              src={TMDBService.getImageUrl(item.poster_path, 'w500')} 
              alt={title}
              className="w-32 md:w-40 h-48 md:h-60 object-cover"
              loading="lazy"
            />
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
        )})}
      </div>
    </div>
  );
};
