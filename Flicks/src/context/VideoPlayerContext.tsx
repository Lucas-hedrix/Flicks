import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { MediaItem } from '../services/TMDBService';

interface VideoPlayerState {
  content: MediaItem | null;
  season?: number;
  episode?: number;
  isPlaying: boolean;
}

interface VideoPlayerContextType extends VideoPlayerState {
  openPlayer: (content: MediaItem, season?: number, episode?: number) => void;
  closePlayer: () => void;
}

const VideoPlayerContext = createContext<VideoPlayerContextType | undefined>(undefined);

export const VideoPlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<MediaItem | null>(null);
  const [season, setSeason] = useState<number | undefined>(undefined);
  const [episode, setEpisode] = useState<number | undefined>(undefined);
  const [isPlaying, setIsPlaying] = useState(false);

  const openPlayer = (item: MediaItem, s?: number, e?: number) => {
    setContent(item);
    setSeason(s);
    setEpisode(e);
    setIsPlaying(true);
  };

  const closePlayer = () => {
    setContent(null);
    setSeason(undefined);
    setEpisode(undefined);
    setIsPlaying(false);
  };

  return (
    <VideoPlayerContext.Provider
      value={{
        content,
        season,
        episode,
        isPlaying,
        openPlayer,
        closePlayer,
      }}
    >
      {children}
    </VideoPlayerContext.Provider>
  );
};

export const useVideoPlayer = () => {
  const context = useContext(VideoPlayerContext);
  if (context === undefined) {
    throw new Error('useVideoPlayer must be used within a VideoPlayerProvider');
  }
  return context;
};
