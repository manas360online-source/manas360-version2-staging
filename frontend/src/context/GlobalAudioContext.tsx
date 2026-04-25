import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type GlobalAudioTrack = {
  id: string;
  title: string;
  audioUrl: string;
  durationSeconds?: number;
  thumbnail?: string;
  clinicalTag?: string;
  source?: 'freesound' | 'local';
};

type GlobalAudioContextValue = {
  currentTrack: GlobalAudioTrack | null;
  queue: GlobalAudioTrack[];
  isPlaying: boolean;
  shuffle: boolean;
  loop: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  listenedSecondsByTrack: Record<string, number>;
  playTrack: (track: GlobalAudioTrack, queue?: GlobalAudioTrack[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seekTo: (seconds: number) => void;
  skipBy: (deltaSeconds: number) => void;
  setShuffle: (value: boolean) => void;
  setLoop: (value: boolean) => void;
  setVolume: (value: number) => void;
  setQueue: (tracks: GlobalAudioTrack[]) => void;
  preCacheTrack: (url: string) => Promise<void>;
  preCacheTracks: (urls: string[]) => Promise<void>;
};

const GlobalAudioContext = createContext<GlobalAudioContextValue | null>(null);

const artworkFromTrack = (track: GlobalAudioTrack | null) => {
  if (!track) return undefined;
  const src = track.thumbnail || '/Untitled.png';
  return [
    { src, sizes: '512x512', type: 'image/png' },
    { src, sizes: '256x256', type: 'image/png' },
  ];
};

export function GlobalAudioProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<GlobalAudioTrack | null>(null);
  const [queue, setQueueState] = useState<GlobalAudioTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [loop, setLoop] = useState(false);
  const [volume, setVolumeState] = useState(0.9);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [listenedSecondsByTrack, setListenedSecondsByTrack] = useState<Record<string, number>>({});

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const pendingAutoPlayRef = useRef(false);
  const lastTimeRef = useRef(0);

  const preCacheTrack = useCallback(async (url: string) => {
    if (!url || cacheRef.current.has(url)) return;
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) return;
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      cacheRef.current.set(url, objectUrl);
    } catch {
      // Ignore cache misses and use network URL directly.
    }
  }, []);

  const preCacheTracks = useCallback(async (urls: string[]) => {
    const unique = [...new Set(urls.filter(Boolean))].slice(0, 12);
    await Promise.all(unique.map((url) => preCacheTrack(url)));
  }, [preCacheTrack]);

  const getPlayableUrl = useCallback((url: string) => {
    return cacheRef.current.get(url) || url;
  }, []);

  const setVolume = useCallback((value: number) => {
    const next = Math.min(1, Math.max(0, value));
    setVolumeState(next);
    if (audioRef.current) {
      audioRef.current.volume = next;
    }
  }, []);

  const setQueue = useCallback((tracks: GlobalAudioTrack[]) => {
    setQueueState(tracks);
  }, []);

  const findCurrentIndex = useCallback(() => {
    if (!currentTrack) return -1;
    return queue.findIndex((entry) => entry.id === currentTrack.id);
  }, [currentTrack, queue]);

  const playTrack = useCallback(async (track: GlobalAudioTrack, incomingQueue?: GlobalAudioTrack[]) => {
    if (incomingQueue?.length) {
      setQueueState(incomingQueue);
    } else if (!queue.length) {
      setQueueState([track]);
    }

    pendingAutoPlayRef.current = true;
    await preCacheTrack(track.audioUrl);
    setCurrentTrack(track);
  }, [preCacheTrack, queue.length]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  const next = useCallback(async () => {
    if (!queue.length) return;
    const currentIndex = findCurrentIndex();
    if (currentIndex < 0) {
      await playTrack(queue[0], queue);
      return;
    }

    let nextIndex = currentIndex + 1;
    if (shuffle && queue.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * queue.length);
      } while (nextIndex === currentIndex);
    } else if (nextIndex >= queue.length) {
      nextIndex = 0;
    }

    await playTrack(queue[nextIndex], queue);
  }, [findCurrentIndex, playTrack, queue, shuffle]);

  const previous = useCallback(async () => {
    if (!queue.length) return;
    const currentIndex = findCurrentIndex();
    if (currentIndex < 0) {
      await playTrack(queue[0], queue);
      return;
    }

    const prevIndex = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;
    await playTrack(queue[prevIndex], queue);
  }, [findCurrentIndex, playTrack, queue]);

  const seekTo = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    const max = Number.isFinite(audioRef.current.duration) ? audioRef.current.duration : Math.max(duration, 0);
    const nextTime = Math.min(Math.max(0, seconds), Math.max(0, max));
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
    lastTimeRef.current = nextTime;
  }, [duration]);

  const skipBy = useCallback((deltaSeconds: number) => {
    if (!audioRef.current) return;
    const target = (audioRef.current.currentTime || 0) + deltaSeconds;
    const max = Number.isFinite(audioRef.current.duration) ? audioRef.current.duration : Math.max(duration, 0);
    const nextTime = Math.min(Math.max(0, target), Math.max(0, max));
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
    lastTimeRef.current = nextTime;
  }, [duration]);

  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
      audioRef.current.crossOrigin = 'anonymous';
      audioRef.current.setAttribute('playsinline', 'true');
    }

    const audio = audioRef.current;
    audio.volume = volume;
    audio.loop = loop;

    const onTimeUpdate = () => {
      const now = audio.currentTime || 0;
      setCurrentTime(now);

      const delta = Math.max(0, now - lastTimeRef.current);
      lastTimeRef.current = now;
      if (delta > 0 && currentTrack?.id) {
        setListenedSecondsByTrack((current) => ({
          ...current,
          [currentTrack.id]: (current[currentTrack.id] || 0) + delta,
        }));
      }
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration || currentTrack?.durationSeconds || 0);
    };

    const onEnded = () => {
      if (loop) {
        void audio.play();
        return;
      }
      setIsPlaying(false);
      void next();
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [currentTrack, loop, next, volume]);

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    const audio = audioRef.current;

    const source = getPlayableUrl(currentTrack.audioUrl);
    if (audio.src !== source) {
      audio.pause();
      audio.src = source;
      audio.load();
      setCurrentTime(0);
      setDuration(currentTrack.durationSeconds || 0);
      lastTimeRef.current = 0;
    }

    if (pendingAutoPlayRef.current) {
      pendingAutoPlayRef.current = false;
      void audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [currentTrack, getPlayableUrl]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.loop = loop;
  }, [loop]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack?.title || 'MANAS360',
      artist: 'MANAS360 Clinical Audio',
      album: currentTrack?.source ? currentTrack.source.toUpperCase() : 'Sound Therapy',
      artwork: artworkFromTrack(currentTrack),
    });

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    navigator.mediaSession.setActionHandler('play', () => {
      void togglePlayPause();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      void togglePlayPause();
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      void next();
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      void previous();
    });
    navigator.mediaSession.setActionHandler('seekbackward', () => {
      skipBy(-15);
    });
    navigator.mediaSession.setActionHandler('seekforward', () => {
      skipBy(15);
    });
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (typeof details.seekTime === 'number') {
        seekTo(details.seekTime);
      }
    });

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
      navigator.mediaSession.setActionHandler('seekto', null);
    };
  }, [currentTrack, isPlaying, next, previous, seekTo, skipBy, togglePlayPause]);

  const value = useMemo<GlobalAudioContextValue>(() => ({
    currentTrack,
    queue,
    isPlaying,
    shuffle,
    loop,
    volume,
    currentTime,
    duration,
    listenedSecondsByTrack,
    playTrack,
    togglePlayPause,
    pause,
    stop,
    next,
    previous,
    seekTo,
    skipBy,
    setShuffle,
    setLoop,
    setVolume,
    setQueue,
    preCacheTrack,
    preCacheTracks,
  }), [
    currentTrack,
    queue,
    isPlaying,
    shuffle,
    loop,
    volume,
    currentTime,
    duration,
    listenedSecondsByTrack,
    playTrack,
    togglePlayPause,
    pause,
    stop,
    next,
    previous,
    seekTo,
    skipBy,
    setVolume,
    setQueue,
    preCacheTrack,
    preCacheTracks,
  ]);

  return <GlobalAudioContext.Provider value={value}>{children}</GlobalAudioContext.Provider>;
}

export function useGlobalAudio() {
  const context = useContext(GlobalAudioContext);
  if (!context) {
    throw new Error('useGlobalAudio must be used inside GlobalAudioProvider');
  }
  return context;
}
