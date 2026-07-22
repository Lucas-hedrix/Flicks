import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { TMDBService } from '../services/TMDBService';
import type { MediaItem } from '../services/TMDBService';
import { useVideoPlayer } from '../context/VideoPlayerContext';
import { DownloadService } from '../services/DownloadService';
import { FaPlay, FaArrowLeft, FaDownload } from 'react-icons/fa';
const TMDB_IMG = (path: string | null | undefined, size = 'w500') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : '';

export const Detail: React.FC = () => {
  const { type, id } = useParams<{ type: 'movie' | 'tv'; id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { openPlayer } = useVideoPlayer();

  const [content, setContent] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [similarContent, setSimilarContent] = useState<MediaItem[]>([]);
  
  // TV Show specific state
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);

  const contentIsMovie = type === 'movie';

  useEffect(() => {
    let isMounted = true;
    if (location.state?.content) {
      setContent(location.state.content);
      // We don't set loading to false yet, we still fetch full details in the background.
    }

    const fetchDetails = async () => {
      try {
        if (!id) return;
        const numId = parseInt(id, 10);
        const data = contentIsMovie 
          ? await TMDBService.getMovieDetails(numId)
          : await TMDBService.getTVShowDetails(numId);
        
        if (isMounted) {
          setContent(data as MediaItem);
          
          if (!contentIsMovie && (data as any).seasons) {
             const validSeasons = (data as any).seasons.filter((s: any) => s.season_number > 0);
             setSeasons(validSeasons);
             if (validSeasons.length > 0) {
               setSelectedSeason(validSeasons[0].season_number);
             }
          }
        }
      } catch (err) {
        if (isMounted && !location.state?.content) {
          setError('Failed to load content details');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [id, type, contentIsMovie]);

  useEffect(() => {
    if (contentIsMovie || !id || selectedSeason === null) return;
    const fetchEpisodes = async () => {
      try {
        const data = await TMDBService.getTVSeasonDetails(parseInt(id, 10), selectedSeason);
        setEpisodes(data.episodes || []);
      } catch (e) {
        console.error('Failed to fetch episodes', e);
      }
    };
    fetchEpisodes();
  }, [id, selectedSeason, contentIsMovie]);

  useEffect(() => {
    if (!id) return;
    const numId = parseInt(id, 10);
    const fetchExtra = async () => {
      try {
        const similarRes = contentIsMovie 
          ? await TMDBService.getSimilarMovies(numId) 
          : await TMDBService.getSimilarTVShows(numId);
        setSimilarContent(similarRes.results);
      } catch (err) {
        console.error('Failed to fetch extra details', err);
      }
    };
    fetchExtra();
  }, [id, contentIsMovie]);

  if (loading) {
    return <div className="min-h-screen bg-netflix-black flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-netflix-red"></div></div>;
  }

  if (error || !content) {
    return <div className="min-h-screen bg-netflix-black flex items-center justify-center text-white">{error || 'Content not found'}</div>;
  }

  const title = content.title || content.name;
  const releaseDate = (content as any).release_date || (content as any).first_air_date;
  const releaseYear = releaseDate?.split('-')[0] || 'Unknown';
  const imageUrl = TMDB_IMG(content.backdrop_path || content.poster_path, 'w1280');

  return (
    <div className="min-h-screen bg-netflix-black text-white overflow-y-auto pb-20">
      <div className="relative w-full h-[50vh] md:h-[70vh]">
        <img 
          src={imageUrl} 
          alt={title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-netflix-black via-netflix-black/50 to-transparent" />
        
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
          <button onClick={() => navigate(-1)} className="p-2 bg-black/50 rounded-full hover:bg-black/80 transition">
            <FaArrowLeft className="text-white" />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-12">
          <h1 className="text-3xl md:text-5xl font-bold mb-2">{title}</h1>
          <div className="flex items-center gap-2 text-sm text-gray-300 mb-4">
            <span>{releaseYear}</span>
            <span>•</span>
            <span className="text-green-500 font-semibold">{Math.round((content.vote_average || 0) * 10)}% Match</span>
          </div>
          <p className="text-sm md:text-lg text-gray-200 max-w-2xl line-clamp-3 mb-6">
            {content.overview}
          </p>
          <div className="flex gap-4">
            <button 
              onClick={() => openPlayer(content!, contentIsMovie ? undefined : selectedSeason || 1, contentIsMovie ? undefined : (episodes[0]?.episode_number || 1))}
              className="flex items-center gap-2 bg-white text-black px-6 py-2 rounded font-semibold hover:bg-gray-200 transition"
            >
              <FaPlay /> Play
            </button>
            <button 
              onClick={() => DownloadService.startDownload(contentIsMovie ? 'movie' : 'tv', content!.id, title || 'Video', contentIsMovie ? undefined : selectedSeason || 1, contentIsMovie ? undefined : (episodes[0]?.episode_number || 1))}
              className="flex items-center gap-2 bg-gray-500/50 text-white px-6 py-2 rounded font-semibold hover:bg-gray-500/70 transition"
            >
              <FaDownload /> Download
            </button>
          </div>
        </div>
      </div>

      {/* Episodes Section for TV Shows */}
      {!contentIsMovie && seasons.length > 0 && (
        <div className="px-4 md:px-12 mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Episodes</h2>
            <select 
              className="bg-zinc-800 text-white p-2 rounded border border-gray-600 outline-none focus:ring-2 focus:ring-netflix-red"
              value={selectedSeason || ''}
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
            >
              {seasons.map(s => (
                <option key={s.season_number} value={s.season_number}>
                  {s.name || `Season ${s.season_number}`}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col gap-4">
            {episodes.map(ep => (
              <div 
                key={ep.episode_number} 
                className="flex flex-col md:flex-row gap-4 bg-zinc-900/50 rounded-lg p-4 hover:bg-zinc-800 transition cursor-pointer group"
                onClick={() => openPlayer(content!, selectedSeason!, ep.episode_number)}
              >
                <div className="relative w-full md:w-56 h-32 shrink-0 bg-zinc-800 rounded-md overflow-hidden">
                  {ep.still_path ? (
                    <img src={TMDB_IMG(ep.still_path, 'w500')} className="w-full h-full object-cover transition duration-300 group-hover:scale-105" alt={ep.name} />
                  ) : (
                     <div className="w-full h-full flex items-center justify-center text-gray-500">No Image</div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                    <FaPlay className="text-white text-3xl" />
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-gray-100 group-hover:text-white transition">
                      <span className="text-gray-400 mr-2">{ep.episode_number}</span> 
                      {ep.name}
                    </h3>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        DownloadService.startDownload('tv', content!.id, `${title} S${selectedSeason}E${ep.episode_number}`, selectedSeason!, ep.episode_number);
                      }}
                      className="p-3 text-gray-400 hover:text-white hover:bg-zinc-700 rounded-full transition"
                      title="Download Episode"
                    >
                      <FaDownload />
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-3">{ep.overview || "No description available."}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 md:px-12 mt-8">
        <h2 className="text-2xl font-semibold mb-4">More Like This</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {similarContent.slice(0, 12).map(item => (
            <div 
              key={item.id} 
              className="cursor-pointer group relative rounded-md overflow-hidden"
              onClick={() => navigate(`/detail/${contentIsMovie ? 'movie' : 'tv'}/${item.id}`)}
            >
              <img 
                src={TMDB_IMG(item.poster_path)} 
                alt={item.title || item.name} 
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

