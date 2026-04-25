import { Pause, Play, Repeat, RotateCcw, RotateCw, Shuffle, Volume2 } from 'lucide-react';
import { useGlobalAudio } from '../../context/GlobalAudioContext';
import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

const formatClock = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function GlobalAudioPlayerConsole() {
  const location = useLocation();
  const {
    currentTrack,
    isPlaying,
    shuffle,
    loop,
    volume,
    currentTime,
    duration,
    togglePlayPause,
    skipBy,
    seekTo,
    setShuffle,
    setLoop,
    setVolume,
  } = useGlobalAudio();

  const [collapsed, setCollapsed] = useState(true);

  const isSoundTherapyPage = location.pathname.includes('/patient/sound-therapy') || location.pathname.includes('/sound-therapy');

  useEffect(() => {
    // Keep player minimal when paused, and default to compact mode outside PT04.
    if (!isPlaying) {
      setCollapsed(true);
      return;
    }

    if (!isSoundTherapyPage) {
      setCollapsed(true);
      return;
    }

    setCollapsed(false);
  }, [isPlaying, isSoundTherapyPage, currentTrack?.id]);

  if (!currentTrack) return null;

  const Wave = () => (
    <div className="ml-2 inline-flex h-4 items-end gap-0.5" aria-hidden>
      {[5, 9, 7, 11].map((h, i) => (
        <span
          key={i}
          className={`w-0.5 rounded-full bg-[#10B981] ${isPlaying ? 'animate-pulse' : ''}`}
          style={{ height: `${h}px`, animationDelay: `${i * 0.08}s` }}
        />
      ))}
    </div>
  );

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => {
          if (!isPlaying) {
            void togglePlayPause();
          }
          setCollapsed(false);
        }}
        className="fixed bottom-4 right-4 z-[81] inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-white/75 text-[#10B981] shadow-[0_8px_20px_rgba(15,23,42,0.12)] backdrop-blur-xl"
        aria-label={isPlaying ? 'Open player' : 'Play and open player'}
      >
        {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] border-t border-white/70 bg-white/70 px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3 text-charcoal shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-2">
        <div className="flex items-center gap-2 text-[11px] text-charcoal/65">
          <span className="min-w-[38px] text-right">{formatClock(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={Math.max(duration, 1)}
            step={0.1}
            value={Math.min(currentTime, Math.max(duration, 1))}
            onChange={(event) => seekTo(Number(event.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#dbe7df] accent-[#10B981]"
            aria-label="Seek"
          />
          <span className="min-w-[38px]">{formatClock(duration)}</span>
        </div>

        <div className="grid items-center gap-3 md:grid-cols-[1.7fr_auto_1fr]">
          <div className="min-w-0">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#d1d5db] text-[10px] text-charcoal/60"
                aria-label="Minimize player"
              >
                -
              </button>
              <p className="truncate text-sm font-semibold text-charcoal">{currentTrack.title}</p>
              <Wave />
            </div>
            <p className="truncate text-xs text-charcoal/60">
              {currentTrack.source === 'freesound' ? 'Freesound Earthly Nature' : 'MANAS360 Curated'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setShuffle(!shuffle)}
              className={`rounded-full border p-2 ${shuffle ? 'border-[#10B981] text-[#10B981]' : 'border-[#d1d5db] text-charcoal/65'}`}
              aria-label="Shuffle"
            >
              <Shuffle className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => skipBy(-15)}
              className="rounded-full border border-[#d1d5db] p-2 text-charcoal/75"
              aria-label="Back 15 seconds"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => void togglePlayPause()}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#10B981] text-white"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => skipBy(15)}
              className="rounded-full border border-[#d1d5db] p-2 text-charcoal/75"
              aria-label="Forward 15 seconds"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setLoop(!loop)}
              className={`rounded-full border p-2 ${loop ? 'border-[#10B981] text-[#10B981]' : 'border-[#d1d5db] text-charcoal/65'}`}
              aria-label="Loop"
            >
              <Repeat className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 text-xs text-charcoal/70">
            <div className="hidden items-center gap-2 sm:flex">
              <Volume2 className="h-4 w-4" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="w-24 accent-[#10B981]"
                aria-label="Volume"
              />
            </div>
            <span className="rounded-full bg-[#ecfdf5] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#047857]">
              Wellness Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
