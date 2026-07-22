import React from 'react';
import type { MediaItem } from '../services/TMDBService';
import { TMDBService } from '../services/TMDBService';
import { MdPlayArrow, MdInfoOutline } from 'react-icons/md';

interface Props {
  content: MediaItem | null;
  onPlay?: () => void;
}

export const HeroBanner: React.FC<Props> = ({ content, onPlay }) => {
  if (!content) return <div className="h-[60vh] md:h-[80vh] bg-netflix-dark-gray animate-pulse" />;

  const title = content.title || content.name;
  const backgroundUrl = TMDBService.getImageUrl(content.backdrop_path, 'original');

  return (
    <div className="relative h-[60vh] md:h-[80vh] w-full text-white">
      <div className="absolute w-full h-full">
        <img 
          src={backgroundUrl} 
          alt={title}
          className="w-full h-full object-cover"
        />
        {/* Gradients to blend banner into the background */}
        <div className="absolute inset-0 bg-linear-to-t from-netflix-black via-transparent to-[rgba(0,0,0,0.4)]" />
        <div className="absolute inset-0 bg-linear-to-r from-[rgba(0,0,0,0.8)] via-[rgba(0,0,0,0.3)] to-transparent" />
      </div>

      <div className="absolute bottom-1/4 left-4 md:left-12 flex flex-col justify-end items-start w-full md:w-1/2">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg max-w-full truncate">
          {title}
        </h1>
        
        <p className="text-sm md:text-lg mb-6 line-clamp-3 md:line-clamp-4 drop-shadow-md text-netflix-light-gray">
          {content.overview}
        </p>

        <div className="flex gap-4">
          <button 
            className="flex items-center gap-2 bg-white text-black px-6 md:px-8 py-2 md:py-3 rounded hover:bg-white/80 transition font-bold"
            onClick={() => onPlay && onPlay()}
          >
            <MdPlayArrow size={28} /> Play
          </button>
          
          <button 
            className="flex items-center gap-2 bg-[rgba(109,109,110,0.7)] text-white px-6 md:px-8 py-2 md:py-3 rounded hover:bg-[rgba(109,109,110,0.4)] transition font-bold"
            onClick={() => onPlay && onPlay()}
          >
            <MdInfoOutline size={28} /> More Info
          </button>
        </div>
      </div>
    </div>
  );
};
