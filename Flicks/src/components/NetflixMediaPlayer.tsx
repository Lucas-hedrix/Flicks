import React, { useEffect, useRef, useState } from 'react';
import { useVideoPlayer } from '../context/VideoPlayerContext';
import {
  FaArrowLeft,
  FaChevronDown,
} from 'react-icons/fa';

// Embed sources in priority order — all are free, reliable iframe embeds
const MOVIE_SOURCES = (id: number) => [
  { label: 'VidSpark',  url: `https://moviesapi.to/movie/${id}` },
  { label: 'Source 2',  url: `https://vidsrc.to/embed/movie/${id}` },
  { label: 'Source 3',  url: `https://autoembed.co/movie/tmdb/${id}` },
  { label: 'Source 4',  url: `https://embed.su/embed/movie/${id}` },
  { label: 'Source 5',  url: `https://multiembed.mov/?video_id=${id}&tmdb=1` },
];

const TV_SOURCES = (id: number, season: number, episode: number) => [
  { label: 'VidSpark',  url: `https://moviesapi.to/tv/${id}-${season}-${episode}` },
  { label: 'Source 2',  url: `https://vidsrc.to/embed/tv/${id}/${season}/${episode}` },
  { label: 'Source 3',  url: `https://autoembed.co/tv/tmdb/${id}-${season}-${episode}` },
  { label: 'Source 4',  url: `https://embed.su/embed/tv/${id}/${season}/${episode}` },
  { label: 'Source 5',  url: `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}` },
];

export const NetflixMediaPlayer: React.FC = () => {
  const { isPlaying, content, season, episode, closePlayer } = useVideoPlayer();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [sourceIndex, setSourceIndex] = useState(0);
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset source when content changes
  useEffect(() => {
    setSourceIndex(0);
  }, [content?.id, season, episode]);

  // Auto-hide controls bar
  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3500);
  };

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [isPlaying]);

  if (!isPlaying || !content) return null;

  const isMovie = 'title' in content;
  const title = isMovie ? (content as any).title : (content as any).name;
  const s = season || 1;
  const e = episode || 1;
  const sources = isMovie
    ? MOVIE_SOURCES(content.id)
    : TV_SOURCES(content.id, s, e);

  const currentSource = sources[sourceIndex];

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onMouseMove={resetControlsTimer}
      onClick={() => { setShowSourceMenu(false); resetControlsTimer(); }}
    >
      {/* Top bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 md:px-6 py-3 md:py-4
          bg-linear-to-b from-black/90 to-transparent transition-opacity duration-300 gap-2
          ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <button
          onClick={closePlayer}
          className="text-white hover:text-gray-300 p-1.5 md:p-2 rounded-full hover:bg-white/10 transition shrink-0"
        >
          <FaArrowLeft className="text-lg md:text-[22px]" />
        </button>

        <div className="text-white font-bold text-sm md:text-lg drop-shadow-md tracking-wide truncate flex-1 text-center px-2">{title}</div>

        {/* Source picker */}
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setShowSourceMenu(!showSourceMenu)}
            className="flex items-center gap-1 md:gap-2 bg-white/10 hover:bg-white/20 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold transition border border-white/20 max-w-[35vw] md:max-w-none"
          >
            <span className="truncate">{currentSource.label}</span>
            <FaChevronDown className={`shrink-0 text-[10px] md:text-[12px] transition-transform ${showSourceMenu ? 'rotate-180' : ''}`} />
          </button>

          {showSourceMenu && (
            <div className="absolute right-0 top-12 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden min-w-45">
              <div className="px-4 py-2 text-xs text-zinc-400 uppercase tracking-widest border-b border-zinc-700">
                Switch Source
              </div>
              {sources.map((src, i) => (
                <button
                  key={i}
                  onClick={() => { setSourceIndex(i); setShowSourceMenu(false); }}
                  className={`w-full text-left px-4 py-3 text-sm transition hover:bg-zinc-700
                    ${i === sourceIndex ? 'text-white font-bold bg-zinc-800' : 'text-zinc-300'}`}
                >
                  {src.label}
                  {i === sourceIndex && <span className="ml-2 text-netflix-red">●</span>}
                </button>
              ))}
              <div className="px-4 py-2 text-xs text-zinc-500 border-t border-zinc-700">
                If one source fails, try another
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Embed iframe */}
      <iframe
        ref={iframeRef}
        key={currentSource.url}
        src={currentSource.url}
        className="w-full h-full border-none"
        allowFullScreen
        allow="autoplay; fullscreen; picture-in-picture"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
