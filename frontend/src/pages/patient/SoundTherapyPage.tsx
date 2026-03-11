import { useState, useRef } from 'react';
import { Play, Pause, Volume2, Moon, Wind, Waves, Heart, Sun, CloudRain, Music } from 'lucide-react';

type SoundCategory = 'all' | 'meditation' | 'sleep' | 'relaxation' | 'breathing';

interface SoundTrack {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: SoundCategory;
  icon: typeof Music;
  gradient: string;
}

const tracks: SoundTrack[] = [
  {
    id: 'guided-meditation-1',
    title: 'Guided Mindfulness',
    description: 'A calming 10-minute mindfulness meditation for stress relief.',
    duration: '10:00',
    category: 'meditation',
    icon: Sun,
    gradient: 'from-amber-400/20 to-orange-300/10',
  },
  {
    id: 'body-scan',
    title: 'Body Scan Meditation',
    description: 'Progressive body relaxation from head to toe.',
    duration: '15:00',
    category: 'meditation',
    icon: Heart,
    gradient: 'from-rose-400/20 to-pink-300/10',
  },
  {
    id: 'deep-sleep',
    title: 'Deep Sleep Soundscape',
    description: 'Gentle ambient sounds to help you drift into deep sleep.',
    duration: '30:00',
    category: 'sleep',
    icon: Moon,
    gradient: 'from-indigo-400/20 to-purple-300/10',
  },
  {
    id: 'rain-sleep',
    title: 'Rainfall for Sleep',
    description: 'Soft rain sounds perfect for falling asleep.',
    duration: '45:00',
    category: 'sleep',
    icon: CloudRain,
    gradient: 'from-sky-400/20 to-blue-300/10',
  },
  {
    id: 'ocean-waves',
    title: 'Ocean Waves',
    description: 'Rhythmic ocean waves for deep relaxation and focus.',
    duration: '20:00',
    category: 'relaxation',
    icon: Waves,
    gradient: 'from-cyan-400/20 to-teal-300/10',
  },
  {
    id: 'nature-calm',
    title: 'Forest & Nature',
    description: 'Birds, gentle breeze, and forest ambiance.',
    duration: '25:00',
    category: 'relaxation',
    icon: Wind,
    gradient: 'from-emerald-400/20 to-green-300/10',
  },
  {
    id: 'box-breathing',
    title: 'Box Breathing Guide',
    description: '4-4-4-4 breathing pattern for anxiety relief.',
    duration: '8:00',
    category: 'breathing',
    icon: Wind,
    gradient: 'from-teal-400/20 to-cyan-300/10',
  },
  {
    id: '478-breathing',
    title: '4-7-8 Breathing',
    description: 'Calming breath technique for instant relaxation.',
    duration: '6:00',
    category: 'breathing',
    icon: Heart,
    gradient: 'from-violet-400/20 to-purple-300/10',
  },
];

const categories: { key: SoundCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'meditation', label: 'Meditation' },
  { key: 'sleep', label: 'Sleep Sounds' },
  { key: 'relaxation', label: 'Relaxation' },
  { key: 'breathing', label: 'Breathing' },
];

export default function SoundTherapyPage() {
  const [activeCategory, setActiveCategory] = useState<SoundCategory>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const intervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const filteredTracks =
    activeCategory === 'all' ? tracks : tracks.filter((t) => t.category === activeCategory);

  const togglePlay = (trackId: string) => {
    if (playingId === trackId) {
      // Pause
      if (intervalsRef.current[trackId]) {
        clearInterval(intervalsRef.current[trackId]);
        delete intervalsRef.current[trackId];
      }
      setPlayingId(null);
    } else {
      // Stop previous
      if (playingId && intervalsRef.current[playingId]) {
        clearInterval(intervalsRef.current[playingId]);
        delete intervalsRef.current[playingId];
      }
      setPlayingId(trackId);

      // Simulate playback progress
      intervalsRef.current[trackId] = setInterval(() => {
        setProgress((prev) => {
          const current = prev[trackId] || 0;
          if (current >= 100) {
            clearInterval(intervalsRef.current[trackId]);
            delete intervalsRef.current[trackId];
            setPlayingId(null);
            return { ...prev, [trackId]: 0 };
          }
          return { ...prev, [trackId]: current + 0.5 };
        });
      }, 500);
    }
  };

  const completedCount = Object.values(progress).filter((p) => p >= 100).length;

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <section className="rounded-2xl border border-calm-sage/15 bg-white/90 p-5 shadow-soft-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-calm-sage/15">
            <Volume2 className="h-5 w-5 text-calm-sage" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-charcoal sm:text-3xl">Sound Therapy</h1>
            <p className="mt-1 text-sm text-charcoal/70">Meditation, sleep sounds, and breathing exercises for your wellbeing.</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-calm-sage/15 bg-white/90 p-3">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Available</p>
          <p className="mt-1 text-xl font-semibold text-charcoal">{tracks.length}</p>
          <p className="text-xs text-charcoal/55">audio sessions</p>
        </div>
        <div className="rounded-xl border border-calm-sage/15 bg-white/90 p-3">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Completed</p>
          <p className="mt-1 text-xl font-semibold text-calm-sage">{completedCount}</p>
          <p className="text-xs text-charcoal/55">sessions today</p>
        </div>
        <div className="rounded-xl border border-calm-sage/15 bg-white/90 p-3">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Categories</p>
          <p className="mt-1 text-xl font-semibold text-charcoal">4</p>
          <p className="text-xs text-charcoal/55">types of therapy</p>
        </div>
        <div className="rounded-xl border border-calm-sage/15 bg-white/90 p-3">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Now Playing</p>
          <p className="mt-1 text-xl font-semibold text-charcoal">{playingId ? '1' : '—'}</p>
          <p className="text-xs text-charcoal/55">{playingId ? 'active' : 'none'}</p>
        </div>
      </section>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setActiveCategory(cat.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeCategory === cat.key
                ? 'bg-calm-sage text-white shadow-sm'
                : 'border border-calm-sage/20 bg-white text-charcoal/70 hover:bg-calm-sage/10'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Track Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTracks.map((track) => {
          const Icon = track.icon;
          const isPlaying = playingId === track.id;
          const trackProgress = progress[track.id] || 0;

          return (
            <article
              key={track.id}
              className={`group relative overflow-hidden rounded-2xl border bg-white shadow-soft-sm transition hover:shadow-soft-md ${
                isPlaying ? 'border-calm-sage/40 ring-2 ring-calm-sage/20' : 'border-calm-sage/15'
              }`}
            >
              {/* Gradient Header */}
              <div className={`flex h-28 items-center justify-center bg-gradient-to-br ${track.gradient}`}>
                <Icon className={`h-10 w-10 ${isPlaying ? 'text-calm-sage animate-pulse' : 'text-charcoal/30'}`} />
              </div>

              {/* Progress Bar */}
              <div className="h-1 w-full bg-calm-sage/10">
                <div
                  className="h-full bg-calm-sage transition-all duration-500"
                  style={{ width: `${trackProgress}%` }}
                />
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-charcoal">{track.title}</h3>
                    <p className="mt-1 text-xs text-charcoal/60 line-clamp-2">{track.description}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-calm-sage/10 px-2 py-0.5 text-[10px] font-medium text-charcoal/70">
                    {track.duration}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="rounded-full border border-calm-sage/20 px-2 py-0.5 text-[10px] font-medium capitalize text-charcoal/60">
                    {track.category}
                  </span>

                  <button
                    type="button"
                    onClick={() => togglePlay(track.id)}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition ${
                      isPlaying
                        ? 'bg-calm-sage text-white shadow-md'
                        : 'bg-charcoal text-white hover:bg-charcoal/90'
                    }`}
                    aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {filteredTracks.length === 0 && (
        <div className="rounded-xl border border-calm-sage/15 bg-white/90 p-8 text-center">
          <p className="text-sm text-charcoal/60">No tracks in this category yet.</p>
        </div>
      )}
    </div>
  );
}
