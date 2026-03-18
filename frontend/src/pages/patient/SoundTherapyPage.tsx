import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Pause, Play, Search } from 'lucide-react';
import { http } from '../../lib/http';
import { GlobalAudioTrack, useGlobalAudio } from '../../context/GlobalAudioContext';

type Category = 'earthly' | 'curated';

type DiscoveryTrack = GlobalAudioTrack & {
  durationLabel: string;
  rxTag: 'Focus' | 'Sleep' | 'Anxiety' | 'Calm';
  sourceLabel: string;
};

type FreesoundRow = {
  id: string;
  title: string;
  durationSeconds: number;
  audioUrl: string;
};

type CuratedLibraryItem = {
  id: string;
  title: string;
  duration: number;
  rx?: string[];
  audioUrl: string;
  subCategory?: string;
};

type CuratedLibraryPayload = {
  library?: CuratedLibraryItem[];
};

const FAVORITES_KEY = 'pt04_sound_favorites';

const rxPalette: Record<DiscoveryTrack['rxTag'], string> = {
  Focus: 'bg-[#dbeafe] text-[#1e40af]',
  Sleep: 'bg-[#dcfce7] text-[#166534]',
  Anxiety: 'bg-[#fee2e2] text-[#b91c1c]',
  Calm: 'bg-[#ccfbf1] text-[#0f766e]',
};

const categoryCards: Array<{ key: Category; title: string; subtitle: string; icon: string }> = [
  {
    key: 'earthly',
    title: 'Earthly Nature',
    subtitle: 'High-fidelity rain, forest, and ocean recordings from Freesound.',
    icon: '🌍',
  },
  {
    key: 'curated',
    title: 'Curated Playlists',
    subtitle: 'Internal clinical playlists including Raga and restorative sessions.',
    icon: '🎧',
  },
];

const toDuration = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const compactTrackTitle = (title: string, max = 56): string => {
  const normalized = String(title || '')
    .replace(/\.mp3$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, Math.max(12, max - 1)).trimEnd()}…`;
};

const inferRx = (text: string): DiscoveryTrack['rxTag'] => {
  const t = text.toLowerCase();
  if (t.includes('sleep') || t.includes('night')) return 'Sleep';
  if (t.includes('focus') || t.includes('radio') || t.includes('space')) return 'Focus';
  if (t.includes('anxiety') || t.includes('stress')) return 'Anxiety';
  return 'Calm';
};

const equalizer = () => (
  <span className="inline-flex items-end gap-0.5" aria-hidden>
    {[5, 8, 6, 10].map((h, i) => (
      <span
        key={i}
        className="w-0.5 animate-pulse rounded-full bg-[#10B981]"
        style={{ height: `${h}px`, animationDelay: `${i * 0.08}s` }}
      />
    ))}
  </span>
);

async function fetchEarthly(query: string): Promise<DiscoveryTrack[]> {
  const response = await http.get<{ data?: FreesoundRow[] }>('/sounds/search', {
    params: {
      q: query || 'calm',
      minDuration: 180,
      limit: 40,
      topics: 'nature,binaural,ocean,forest,rain',
    },
  });

  return (response.data?.data || []).map((row) => ({
    id: row.id,
    title: compactTrackTitle(row.title, 52),
    audioUrl: row.audioUrl,
    durationSeconds: Number(row.durationSeconds || 300),
    durationLabel: toDuration(Number(row.durationSeconds || 300)),
    rxTag: inferRx(row.title),
    source: 'freesound',
    sourceLabel: 'Freesound',
  }));
}

async function fetchCurated(query: string): Promise<DiscoveryTrack[]> {
  const response = await fetch('/wellness-vimeo-library.json');
  if (!response.ok) return [];

  const payload = (await response.json()) as CuratedLibraryPayload;
  const rows = (payload.library || []).slice(0, 5).map((item) => ({
    id: item.id,
    title: compactTrackTitle(item.title, 56),
    audioUrl: item.audioUrl,
    durationSeconds: Number(item.duration || 300),
    durationLabel: toDuration(Number(item.duration || 300)),
    rxTag: inferRx((item.rx || []).join(' ') || item.subCategory || item.title),
    source: 'local' as const,
    sourceLabel: 'MANAS360 Curated',
  }));

  if (!query.trim()) return rows;
  const needle = query.trim().toLowerCase();
  return rows.filter((row) => row.title.toLowerCase().includes(needle));
}

export default function SoundTherapyPage() {
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [query, setQuery] = useState('calm');
  const [tracks, setTracks] = useState<DiscoveryTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const { currentTrack, isPlaying, playTrack, togglePlayPause, preCacheTracks } = useGlobalAudio();

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const loadTracks = async (category: Category, term: string) => {
    setLoading(true);
    setError(null);
    try {
      let data: DiscoveryTrack[] = [];
      if (category === 'earthly') data = await fetchEarthly(term);
      if (category === 'curated') data = await fetchCurated(term);
      setTracks(data);
      if (!data.length) setError('No tracks found for this selection.');
    } catch {
      setError('Unable to load tracks right now. Please retry.');
      setTracks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeCategory) return;
    void loadTracks(activeCategory, query);
  }, [activeCategory]);

  useEffect(() => {
    void preCacheTracks(tracks.slice(0, 12).map((track) => track.audioUrl));
  }, [preCacheTracks, tracks]);

  const featuredTrack = useMemo(() => {
    const best = tracks.find((track) => track.rxTag === 'Calm' || track.rxTag === 'Sleep');
    return best || tracks[0] || null;
  }, [tracks]);

  const favoriteTracks = useMemo(() => tracks.filter((track) => favorites.includes(track.id)), [tracks, favorites]);

  const onSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeCategory) return;
    void loadTracks(activeCategory, query);
  };

  const onPlayTrack = async (track: DiscoveryTrack) => {
    const isCurrent = Boolean(currentTrack && currentTrack.id === track.id);
    if (isCurrent) {
      await togglePlayPause();
      return;
    }
    await playTrack(track, tracks);
  };

  const toggleFavorite = (trackId: string) => {
    setFavorites((prev) => (prev.includes(trackId) ? prev.filter((id) => id !== trackId) : [...prev, trackId]));
  };

  const renderRow = (track: DiscoveryTrack) => {
    const isCurrent = currentTrack?.id === track.id;
    const liked = favorites.includes(track.id);

    return (
      <div
        key={track.id}
        className={`grid h-14 grid-cols-[42px_1fr_88px_88px_36px] items-center gap-2 border-b border-[#F9FAFB] px-4 ${isCurrent ? 'bg-[#eff6ff]' : 'bg-white hover:bg-[#f8fafc]'}`}
      >
        <button
          type="button"
          onClick={() => void onPlayTrack(track)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#3B82F6] text-white"
          aria-label={isCurrent && isPlaying ? 'Pause' : 'Play'}
        >
          {isCurrent && isPlaying ? equalizer() : isCurrent ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
        </button>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-charcoal">{track.title}</p>
          <p className="truncate text-[11px] text-charcoal/60">{track.sourceLabel}</p>
        </div>

        <span className="text-right text-xs font-medium text-charcoal/75">{track.durationLabel}</span>
        <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${rxPalette[track.rxTag]}`}>
          Rx {track.rxTag}
        </span>

        <button
          type="button"
          onClick={() => toggleFavorite(track.id)}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${liked ? 'text-[#ef476f]' : 'text-charcoal/45'}`}
          aria-label="Toggle favorite"
        >
          <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
        </button>
      </div>
    );
  };

  return (
    <section className="mx-auto w-full min-w-0 max-w-[1380px] overflow-x-hidden pb-8" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="relative overflow-hidden rounded-[28px] border border-white/50 bg-gradient-to-br from-[#e8f4f0] via-[#edf4f7] to-[#f7efe7] p-6 shadow-[0_18px_42px_rgba(20,44,68,0.08)] sm:p-7 lg:p-8">
        <div className="absolute -right-14 -top-12 h-56 w-56 rounded-full bg-white/35 blur-3xl" />
        <p className="inline-flex rounded-full bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/60">
          Wellness Command Center
        </p>
        <h1 className="mt-3 text-2xl font-bold text-charcoal sm:text-3xl">Sound Therapy Workstation</h1>
        <p className="mt-2 max-w-3xl text-sm text-charcoal/70">
          Choose a source, filter quickly, and keep playback continuous while you move across wellness modules.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!activeCategory ? (
          <motion.div
            key="gateway"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2"
          >
            {categoryCards.map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={() => setActiveCategory(card.key)}
                className="group overflow-hidden rounded-[20px] border border-[#F9FAFB] bg-white shadow-[0_14px_32px_rgba(23,41,61,0.10)]"
              >
                <div className="p-5 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-charcoal/55">PT04</p>
                      <h2 className="mt-1 text-xl font-bold text-charcoal">{card.title}</h2>
                    </div>
                    <span className="text-2xl" aria-hidden>{card.icon}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-charcoal/72">{card.subtitle}</p>
                </div>
              </button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="discovery"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="mt-6 space-y-4"
          >
            <div className="rounded-[20px] border border-[#F9FAFB] bg-white p-4 shadow-[0_14px_32px_rgba(23,41,61,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-lg bg-[#F3F4F6] p-1">
                  {categoryCards.map((card) => (
                    <button
                      key={card.key}
                      type="button"
                      onClick={() => setActiveCategory(card.key)}
                      className={`rounded-md px-3 py-2 text-sm font-semibold transition ${activeCategory === card.key ? 'bg-white text-charcoal shadow-sm' : 'text-charcoal/65'}`}
                    >
                      {card.icon} {card.title}
                    </button>
                  ))}
                </div>
                <Link to="/patient/wellness-library" className="text-sm font-medium text-[#2563eb]">Back to Wellness</Link>
              </div>

              <form onSubmit={onSearchSubmit} className="sticky top-2 z-10 mt-4 flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2">
                <Search className="h-4 w-4 text-charcoal/55" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search within active source..."
                  className="w-full bg-transparent text-sm text-charcoal outline-none placeholder:text-charcoal/45"
                />
                <button type="submit" className="rounded-md bg-[#10B981] px-3 py-1.5 text-xs font-semibold text-white">
                  Search
                </button>
              </form>
            </div>

            {featuredTrack ? (
              <div className="rounded-[20px] border border-[#F9FAFB] bg-white p-4 shadow-[0_14px_28px_rgba(23,41,61,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55">Featured Pick • Best For Calming</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-charcoal">{featuredTrack.title}</p>
                    <p className="text-xs text-charcoal/65">{featuredTrack.sourceLabel} • {featuredTrack.durationLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onPlayTrack(featuredTrack)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#10B981] text-white"
                    aria-label="Play featured"
                  >
                    {currentTrack?.id === featuredTrack.id && isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
                  </button>
                </div>
              </div>
            ) : null}

            {favoriteTracks.length ? (
              <div className="rounded-[20px] border border-[#F9FAFB] bg-white p-4 shadow-[0_14px_28px_rgba(23,41,61,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55">Favorites</p>
                <div className="mt-2 overflow-hidden rounded-xl border border-[#F1F5F9]">
                  {favoriteTracks.map(renderRow)}
                </div>
              </div>
            ) : null}

            <div className="min-w-0 rounded-[20px] border border-[#F9FAFB] bg-white shadow-[0_14px_32px_rgba(23,41,61,0.08)]">
              <div className="grid grid-cols-[42px_minmax(0,1fr)_88px_88px_36px] gap-2 border-b border-[#F9FAFB] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/55">
                <span />
                <span>Track</span>
                <span className="text-right">Duration</span>
                <span>Rx</span>
                <span />
              </div>

              <div className="min-h-[600px]">
                {loading ? (
                  <div className="px-4 py-6 text-sm text-charcoal/65">Loading tracks...</div>
                ) : tracks.length ? (
                  tracks.map(renderRow)
                ) : (
                  <div className="px-4 py-6 text-sm text-charcoal/65">No tracks available for this category.</div>
                )}
              </div>
            </div>

            {error ? <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3 text-sm text-[#b91c1c]">{error}</div> : null}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
