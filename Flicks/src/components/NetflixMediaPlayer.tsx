import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useVideoPlayer } from '../context/VideoPlayerContext';
import { VidfastScraper } from '../services/VidfastScraper';
import { useHlsPlayer } from '../hooks/useHlsPlayer';
import {
  FaArrowLeft,
  FaChevronDown,
  FaDownload,
  FaSpinner,
} from 'react-icons/fa';

// ------------------------------------------------------------------
type StreamMeta = {
  rawUrl: string;
  referer?: string;
  origin?: string;
};

// Strip characters that would break a URL query value or a filename header.
const sanitizeDownloadName = (name: string) =>
  name.replace(/[^\w\s.-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);

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

type Phase = 'scraping' | 'native' | 'iframe';

export const NetflixMediaPlayer: React.FC = () => {
  const { isPlaying, content, season, episode, closePlayer } = useVideoPlayer();
  const location = useLocation();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Close the player if the user clicks the browser's back button
  useEffect(() => {
    if (isPlaying) {
      closePlayer();
    }
  }, [location.pathname]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrapeIdRef = useRef(0); // invalidates stale scrapes when content/toggle changes

  const [phase, setPhase] = useState<Phase>('scraping');
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamMeta, setStreamMeta] = useState<StreamMeta | null>(null);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMovie = content ? 'title' in content : false;
  const title = content ? (isMovie ? (content as any).title : (content as any).name) : '';
  const s = season || 1;
  const e = episode || 1;
  const sources = isMovie
    ? MOVIE_SOURCES(content?.id ?? 0)
    : TV_SOURCES(content?.id ?? 0, s, e);

  // Kick off the scraper whenever the content (or episode) changes.
  useEffect(() => {
    if (!isPlaying || !content) return;

    const scrapeId = ++scrapeIdRef.current;
    setPhase('scraping');
    setStreamUrl(null);
    setStreamMeta(null);
    setSourceIndex(0);

    const type = isMovie ? 'movie' : 'tv';
    VidfastScraper.extractVideoUrl(type, content.id, season, episode)
      .then((result) => {
        // A newer scrape (or a manual "switch to embed") superseded this one.
        if (scrapeId !== scrapeIdRef.current) return;
        if (result && result.url) {
          setStreamUrl(result.url);
          if (result.rawUrl) {
            setStreamMeta({ rawUrl: result.rawUrl, referer: result.referer, origin: result.origin });
          }
          setPhase('native');
        } else {
          setPhase('iframe');
        }
      })
      .catch(() => {
        if (scrapeId !== scrapeIdRef.current) return;
        setPhase('iframe');
      });
  }, [content?.id, season, episode, isPlaying]);

  useHlsPlayer(videoRef, phase === 'native' ? streamUrl : null, () => {
    // Fatal playback error → fall back to the iframe embed.
    setPhase('iframe');
  });

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

  // Manual escape hatch: stop waiting on the scraper and use an embed right away.
  const switchToEmbed = () => {
    scrapeIdRef.current += 1; // invalidate any in-flight scrape
    setPhase('iframe');
  };

  // IDM-style download of the actual scraped stream. The backend muxes the HLS
  // segments into a single playable .mp4 via ffmpeg, replaying the captured
  // Referer/Origin so hotlink-protected CDNs let it through.
  const handleDownload = () => {
    if (!streamMeta) return;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const params = new URLSearchParams({ url: streamMeta.rawUrl });
    if (streamMeta.referer) params.set('ref', streamMeta.referer);
    if (streamMeta.origin) params.set('origin', streamMeta.origin);
    params.set('filename', sanitizeDownloadName(title) || 'video');
    window.open(`${baseUrl}/api/download/stream?${params.toString()}`, '_blank');
  };

  if (!isPlaying || !content) return null;

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

        {/* IDM-style download of the actual stream (native phase only) */}
        {phase === 'native' && streamMeta && (
          <button
            onClick={handleDownload}
            title="Download video (.mp4)"
            className="flex items-center gap-1 md:gap-2 bg-white/10 hover:bg-white/20 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold transition border border-white/20 shrink-0"
          >
            <FaDownload />
            <span className="hidden md:inline">Download</span>
          </button>
        )}

        {/* Source picker / switch-to-embed */}
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              if (phase === 'iframe') {
                setShowSourceMenu(!showSourceMenu);
              } else {
                switchToEmbed();
              }
            }}
            className="flex items-center gap-1 md:gap-2 bg-white/10 hover:bg-white/20 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold transition border border-white/20 max-w-[35vw] md:max-w-none"
          >
            {phase === 'iframe' ? (
              <>
                <span className="truncate">{currentSource.label}</span>
                <FaChevronDown className={`shrink-0 text-[10px] md:text-[12px] transition-transform ${showSourceMenu ? 'rotate-180' : ''}`} />
              </>
            ) : (
              <span className="truncate">Switch to embed</span>
            )}
          </button>

          {phase === 'iframe' && showSourceMenu && (
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

      {/* Phase: scraping spinner */}
      {phase === 'scraping' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 text-white">
          <FaSpinner className="animate-spin text-4xl md:text-5xl text-red-600" />
          <div className="text-center">
            <p className="text-lg md:text-xl font-bold tracking-wide">Finding best source…</p>
            <p className="text-sm text-zinc-400 mt-1.5">Scanning multiple providers</p>
          </div>
        </div>
      )}

      {/* Phase: native video */}
      {phase === 'native' && (
        <video
          ref={videoRef}
          className="w-full h-full"
          controls
          autoPlay
          playsInline
        />
      )}

      {/* Phase: iframe embed */}
      {phase === 'iframe' && (
        <iframe
          ref={iframeRef}
          key={currentSource.url}
          src={currentSource.url}
          className="w-full h-full border-none"
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture"
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
};
