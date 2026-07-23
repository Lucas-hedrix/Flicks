import React, { useEffect, useRef, useState } from 'react';
import { useVideoPlayer } from '../context/VideoPlayerContext';
import { FaArrowLeft, FaPlay, FaPause, FaExpand, FaCompress, FaVolumeMute, FaVolumeUp, FaClosedCaptioning } from 'react-icons/fa';
import { VidfastScraper } from '../services/VidfastScraper';
import { WyzieService, type WyzieSubtitleData } from '../services/WyzieService';
import Hls from 'hls.js';

export const NetflixMediaPlayer: React.FC = () => {
  const { isPlaying, content, season, episode, closePlayer } = useVideoPlayer();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [iframeFallbackUrl, setIframeFallbackUrl] = useState<string | null>(null);

  // Subtitle state
  const [subtitles, setSubtitles] = useState<WyzieSubtitleData[]>([]);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);

  // Auto-hide controls
  useEffect(() => {
    if (!showControls) return;
    const timer = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timer);
  }, [showControls]);

  useEffect(() => {
    if (!isPlaying || !content) return;

    let isMounted = true;
    let abortController: AbortController | null = new AbortController();
    setLoading(true);
    setError(null);

    const initPlayer = async () => {
      const type = 'title' in content ? 'movie' : 'tv';
      
      try {
        const result = await VidfastScraper.extractVideoUrl(type, content.id, season || 1, episode || 1);

        if (!isMounted) {
          // Clean up if component unmounted
          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
          }
          return;
        }

        // Fetch subtitles in parallel
        WyzieService.searchSubtitles(content.id, season || 1, episode || 1).then(subs => {
          if (isMounted) setSubtitles(subs);
        }).catch(err => console.error('Failed to fetch subtitles:', err));

        if (!result || !result.url) {
          // Primary scraper failed — fall back to a working embed service
          const vidsrcUrl = type === 'tv'
            ? `https://vidsrc.to/embed/tv/${content.id}/${season || 1}/${episode || 1}`
            : `https://vidsrc.to/embed/movie/${content.id}`;

          setIframeFallbackUrl(vidsrcUrl);
          setLoading(false);
          return;
        }

        if (videoRef.current && isMounted) {
          const isHlsSource =
            result.url.includes('.m3u8') || result.url.includes('application/vnd.apple.mpegurl');
          
          const isProxiedMp4 = result.url.includes('/api/proxy/video');

          if ((isHlsSource || result.isProxied) && !isProxiedMp4 && Hls.isSupported()) {
            // Destroy any existing HLS instance
            if (hlsRef.current) {
              hlsRef.current.destroy();
              hlsRef.current = null;
            }

            const hls = new Hls({ maxBufferLength: 30 });
            hlsRef.current = hls;
            hls.loadSource(result.url);
            hls.attachMedia(videoRef.current);
            
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              if (isMounted && videoRef.current) {
                setLoading(false);
                videoRef.current.play().catch(console.error);
              }
            });
            
            hls.on(Hls.Events.ERROR, (_, data) => {
              if (data.fatal && isMounted) {
                setError('Failed to play video stream.');
                setLoading(false);
              }
            });
          } else {
            // MP4 or other video format - load directly
            videoRef.current.src = result.url;
            videoRef.current.addEventListener('loadedmetadata', () => {
              if (isMounted && videoRef.current) {
                setLoading(false);
                videoRef.current.play().catch(console.error);
              }
            }, { once: true });
            videoRef.current.addEventListener('error', (e) => {
              if (isMounted) {
                console.error('Video error:', e);
                setError('Failed to play video stream.');
                setLoading(false);
              }
            }, { once: true });
          }
        }
      } catch (err: any) {
        if (isMounted && err.message !== 'Aborted') {
          console.error('Failed to initialize player:', err);
          setError('Failed to load video. Please try again.');
          setLoading(false);
        }
      }
    };

    initPlayer();

    return () => {
      isMounted = false;
      abortController?.abort();
      abortController = null;
      
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      
      if (videoRef.current) {
        videoRef.current.src = '';
        videoRef.current.load();
      }
    };
  }, [isPlaying, content, season, episode]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = (parseFloat(e.target.value) / 100) * videoRef.current.duration;
      videoRef.current.currentTime = newTime;
      setProgress(parseFloat(e.target.value));
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  };

  const handleSubtitleChange = (subId: string | null) => {
    setActiveSubtitle(subId);
    setShowSubtitleMenu(false);
    if (videoRef.current) {
      const tracks = videoRef.current.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = 'disabled';
        if (tracks[i].label === subId) {
          tracks[i].mode = 'showing';
        }
      }
    }
  };

  if (!isPlaying || !content) return null;

  const title = 'title' in content ? content.title : content.name;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onMouseMove={() => setShowControls(true)}
      onClick={() => setShowControls(true)}
    >
      {iframeFallbackUrl ? (
        <iframe
          src={iframeFallbackUrl}
          className="w-full h-full border-none"
          allowFullScreen
          allow="autoplay; fullscreen"
        />
      ) : (
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setPlaying(false)}
          onClick={togglePlay}
          crossOrigin="anonymous"
        >
          {subtitles.map((sub) => (
            <track
              key={sub.id}
              kind="subtitles"
              label={sub.id}
              srcLang={sub.language}
              src={sub.url}
              default={activeSubtitle === sub.id}
            />
          ))}
        </video>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-netflix-red"></div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/80 text-white p-6 rounded-lg max-w-md text-center">
            <p className="text-xl font-bold mb-2">Playback Error</p>
            <p className="text-gray-300 mb-4">{error}</p>
            <button 
              onClick={closePlayer}
              className="bg-netflix-red px-6 py-2 rounded font-bold hover:bg-red-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {/* Top Bar */}
        <div className="absolute top-0 w-full p-6 flex justify-between items-center bg-linear-to-b from-black/80 to-transparent pointer-events-auto">
          <button onClick={closePlayer} className="text-white hover:text-gray-300 p-2">
            <FaArrowLeft size={24} />
          </button>
          <div className="text-white font-bold text-xl drop-shadow-md">{title}</div>
          <div className="w-10"></div>
        </div>

        {/* Bottom Controls */}
        {!iframeFallbackUrl && (
        <div className="absolute bottom-0 w-full p-6 bg-linear-to-t from-black/80 to-transparent pointer-events-auto">
          <div className="w-full mb-4 group">
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={progress || 0} 
              onChange={handleSeek}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer group-hover:h-2 transition-all accent-netflix-red"
            />
          </div>
          
            <div className="flex justify-between items-center text-white relative">
            <div className="flex items-center gap-6">
              <button onClick={togglePlay} className="hover:text-gray-300 transition">
                {playing ? <FaPause size={24} /> : <FaPlay size={24} />}
              </button>
              <button onClick={toggleMute} className="hover:text-gray-300 transition">
                {isMuted ? <FaVolumeMute size={24} /> : <FaVolumeUp size={24} />}
              </button>
              <div className="text-sm font-semibold">
                {formatTime((progress / 100) * duration || 0)} / {formatTime(duration || 0)}
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="relative">
                <button 
                  onClick={() => setShowSubtitleMenu(!showSubtitleMenu)} 
                  className={`hover:text-gray-300 transition ${activeSubtitle ? 'text-netflix-red' : ''}`}
                  title="Subtitles"
                >
                  <FaClosedCaptioning size={24} />
                </button>
                
                {showSubtitleMenu && (
                  <div className="absolute bottom-12 right-0 bg-black/90 rounded-md p-4 min-w-[200px] border border-gray-700 shadow-xl max-h-64 overflow-y-auto z-50">
                    <h3 className="text-gray-400 font-semibold mb-2 text-sm uppercase tracking-wider">Subtitles</h3>
                    <ul className="space-y-2">
                      <li>
                        <button 
                          onClick={() => handleSubtitleChange(null)}
                          className={`w-full text-left px-2 py-1 hover:bg-gray-800 rounded transition ${activeSubtitle === null ? 'font-bold text-white' : 'text-gray-300'}`}
                        >
                          Off
                        </button>
                      </li>
                      {subtitles.map(sub => (
                        <li key={sub.id}>
                          <button 
                            onClick={() => handleSubtitleChange(sub.id)}
                            className={`w-full text-left px-2 py-1 hover:bg-gray-800 rounded transition ${activeSubtitle === sub.id ? 'font-bold text-white' : 'text-gray-300'}`}
                          >
                            {sub.display}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <button onClick={toggleFullscreen} className="hover:text-gray-300 transition">
                {isFullscreen ? <FaCompress size={20} /> : <FaExpand size={20} />}
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}
