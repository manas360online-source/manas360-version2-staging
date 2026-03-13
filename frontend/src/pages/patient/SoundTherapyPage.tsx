import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookHeart,
  Brain,
  ChevronLeft,
  ChevronRight,
  CloudMoon,
  Headphones,
  Heart,
  MoonStar,
  Pause,
  Play,
  Sparkles,
  Waves,
  Wind,
  X,
} from 'lucide-react';
import { patientApi } from '../../api/patient';

type WellnessFilter = 'all' | 'audio' | 'breathing' | 'sleep' | 'anxiety-relief' | 'cbt' | 'focus';
type WellnessRow = 'quick-resets' | 'cbt' | 'soundscapes';
type WellnessKind = 'audio' | 'interactive';

type WellnessItem = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  kind: WellnessKind;
  row: WellnessRow;
  filters: WellnessFilter[];
  icon: typeof Sparkles;
  accent: string;
  badge: string;
  tagLine: string;
  prompts?: string[];
};

type ExerciseRow = {
  id: string;
  title: string;
  assignedBy?: string;
  duration?: number;
  status?: string;
  createdAt?: string;
};

type MoodTodayPayload = {
  latest?: {
    mood?: number;
    metadata?: {
      tags?: string[];
      energy?: string;
      sleepHours?: string;
    };
  } | null;
};

const asPayload = <T,>(value: any): T => (value?.data ?? value) as T;

const filterPills: Array<{ value: WellnessFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'audio', label: '🎧 Audio' },
  { value: 'breathing', label: '🌬️ Breathing' },
  { value: 'sleep', label: '🛏️ Sleep' },
  { value: 'anxiety-relief', label: '🧠 Anxiety Relief' },
  { value: 'cbt', label: '📝 CBT' },
  { value: 'focus', label: '🌊 Focus' },
];

const rowLabels: Record<WellnessRow, { title: string; subtitle: string }> = {
  'quick-resets': {
    title: 'Quick Resets (< 5 mins)',
    subtitle: 'Fast regulation tools for busy or overloaded moments.',
  },
  cbt: {
    title: 'Cognitive Behavioral Therapy',
    subtitle: 'Interactive thought work and guided reframing.',
  },
  soundscapes: {
    title: 'Soundscapes & Focus',
    subtitle: 'Ambient sessions for sleep, focus, and nervous system calm.',
  },
};

const wellnessItems: WellnessItem[] = [
  {
    id: 'box-breathing-reset',
    title: 'Box Breathing Reset',
    description: 'A four-step breathing loop to slow the nervous system in under five minutes.',
    durationMinutes: 4,
    kind: 'interactive',
    row: 'quick-resets',
    filters: ['breathing', 'anxiety-relief'],
    icon: Wind,
    accent: 'from-[#bfe3db] via-[#d5efe8] to-[#f7f3ea]',
    badge: '📝 Interactive',
    tagLine: 'Breathing',
    prompts: [
      'What feels most activated in your body right now?',
      'Name one thought you can let pass without arguing with it.',
      'What would feeling 10% calmer let you do next?',
    ],
  },
  {
    id: 'three-minute-grounding',
    title: '3-Minute Grounding',
    description: 'A short sensory reset for moments when your thoughts are moving too fast.',
    durationMinutes: 3,
    kind: 'interactive',
    row: 'quick-resets',
    filters: ['anxiety-relief'],
    icon: Heart,
    accent: 'from-[#f5ddc1] via-[#f9ebdc] to-[#f3f7f4]',
    badge: '📝 Interactive',
    tagLine: 'Grounding',
    prompts: [
      'What are 3 things you can see around you?',
      'What physical sensation feels safest right now?',
      'What is one tiny next step for the next 10 minutes?',
    ],
  },
  {
    id: 'micro-body-scan',
    title: 'Micro Body Scan',
    description: 'Release accumulated tension from your jaw, shoulders, chest, and hands.',
    durationMinutes: 5,
    kind: 'audio',
    row: 'quick-resets',
    filters: ['audio', 'anxiety-relief'],
    icon: Sparkles,
    accent: 'from-[#d9ebe5] via-[#edf6f2] to-[#fff7ef]',
    badge: '🎧 Audio',
    tagLine: 'Reset',
  },
  {
    id: 'thought-record-lite',
    title: 'Thought Record Lite',
    description: 'Capture a stressful thought, test it gently, and write a more balanced version.',
    durationMinutes: 6,
    kind: 'interactive',
    row: 'cbt',
    filters: ['cbt', 'anxiety-relief'],
    icon: Brain,
    accent: 'from-[#d7e6f6] via-[#eef5ff] to-[#f7f3ea]',
    badge: '📝 Interactive',
    tagLine: 'Thought Work',
    prompts: [
      'What situation is bothering you most right now?',
      'What is the automatic thought that showed up first?',
      'What would a kinder, more balanced reframe sound like?',
    ],
  },
  {
    id: 'worry-download',
    title: 'Worry Download',
    description: 'Separate solvable problems from open loops so your mind has less to hold.',
    durationMinutes: 7,
    kind: 'interactive',
    row: 'cbt',
    filters: ['cbt', 'anxiety-relief'],
    icon: BookHeart,
    accent: 'from-[#efe2f6] via-[#f7effd] to-[#f6f2ea]',
    badge: '📝 Interactive',
    tagLine: 'Journal',
    prompts: [
      'List the top worry in one sentence.',
      'Can you act on it today, or does it need to wait?',
      'What would be a compassionate next step if you stop spiraling for tonight?',
    ],
  },
  {
    id: 'sleep-story',
    title: 'Deep Sleep Soundscape',
    description: 'A darker ambient wash designed for low-energy, bad-sleep nights.',
    durationMinutes: 10,
    kind: 'audio',
    row: 'soundscapes',
    filters: ['audio', 'sleep'],
    icon: MoonStar,
    accent: 'from-[#16253e] via-[#283b60] to-[#364f73]',
    badge: '🎧 Audio',
    tagLine: 'Sleep',
  },
  {
    id: 'rainfall-sleep',
    title: 'Rainfall Wind Down',
    description: 'Soft rain and distant room tone for bedtime decompression.',
    durationMinutes: 12,
    kind: 'audio',
    row: 'soundscapes',
    filters: ['audio', 'sleep'],
    icon: CloudMoon,
    accent: 'from-[#35526d] via-[#54728f] to-[#92a9ba]',
    badge: '🎧 Audio',
    tagLine: 'Sleep',
  },
  {
    id: 'ocean-focus',
    title: 'Ocean Focus Drift',
    description: 'Steady ocean rhythm for focused work blocks and cognitive recovery.',
    durationMinutes: 8,
    kind: 'audio',
    row: 'soundscapes',
    filters: ['audio', 'focus'],
    icon: Waves,
    accent: 'from-[#c8ebf0] via-[#dff5f7] to-[#f5fbfb]',
    badge: '🎧 Audio',
    tagLine: 'Focus',
  },
  {
    id: 'guided-mindfulness',
    title: 'Guided Mindfulness',
    description: 'A clear, calm check-in to slow mental noise and get present again.',
    durationMinutes: 9,
    kind: 'audio',
    row: 'soundscapes',
    filters: ['audio', 'anxiety-relief', 'focus'],
    icon: Headphones,
    accent: 'from-[#f0dcb1] via-[#f8ebcf] to-[#fcf8ef]',
    badge: '🎧 Audio',
    tagLine: 'Mindfulness',
  },
];

const getHeroRecommendation = (latest: MoodTodayPayload['latest'] | null | undefined) => {
  const metadata = latest?.metadata || {};
  const tags = Array.isArray(metadata.tags) ? metadata.tags : [];
  const sleepHours = String(metadata.sleepHours || '').toLowerCase();
  const energy = String(metadata.energy || '').toLowerCase();
  const mood = Number(latest?.mood || 0);

  if (energy === 'low' && (sleepHours.includes('<4') || sleepHours.includes('5-6') || tags.includes('sleep'))) {
    return {
      item: wellnessItems.find((entry) => entry.id === 'sleep-story') || wellnessItems[0],
      eyebrow: 'Recommended for tonight',
      title: 'Having trouble resting? Try our 10-minute Deep Sleep Soundscape.',
      description: 'Your last Daily Check-in pointed to low energy and interrupted sleep, so this session is surfaced first.',
    };
  }

  if (mood > 0 && mood <= 2) {
    return {
      item: wellnessItems.find((entry) => entry.id === 'box-breathing-reset') || wellnessItems[0],
      eyebrow: 'Start here',
      title: 'Feeling overloaded? Take a short guided breathing reset before you do anything else.',
      description: 'This is the fastest path back to regulation when your check-in lands in the sad or awful range.',
    };
  }

  if (tags.includes('work')) {
    return {
      item: wellnessItems.find((entry) => entry.id === 'thought-record-lite') || wellnessItems[0],
      eyebrow: 'Context-aware pick',
      title: 'Work pressure showing up again? Try a quick Thought Record to unpack the loop.',
      description: 'A CBT-style reflection can make the pressure more specific and less overwhelming.',
    };
  }

  return {
    item: wellnessItems.find((entry) => entry.id === 'guided-mindfulness') || wellnessItems[0],
    eyebrow: 'Featured today',
    title: 'Need a calm starting point? Guided Mindfulness is a strong all-purpose reset.',
    description: 'Browse the library while it plays, or save it as a favorite for your daily ritual.',
  };
};

export default function SoundTherapyPage() {
  const [activeFilter, setActiveFilter] = useState<WellnessFilter>('all');
  const [latestCheckIn, setLatestCheckIn] = useState<MoodTodayPayload['latest'] | null>(null);
  const [completedLibraryRows, setCompletedLibraryRows] = useState<ExerciseRow[]>([]);
  const [settingsSnapshot, setSettingsSnapshot] = useState<Record<string, any>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [playerItem, setPlayerItem] = useState<WellnessItem | null>(null);
  const [playerProgress, setPlayerProgress] = useState(0);
  const [playerPlaying, setPlayerPlaying] = useState(false);
  const [drawerItem, setDrawerItem] = useState<WellnessItem | null>(null);
  const [drawerStep, setDrawerStep] = useState(0);
  const [drawerAnswers, setDrawerAnswers] = useState<string[]>([]);
  const [drawerInput, setDrawerInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingFavorite, setSavingFavorite] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loggedCompletionIds, setLoggedCompletionIds] = useState<string[]>([]);

  const loadCompletionRows = async () => {
    const exercisesRes = await patientApi.getExercises().catch(() => []);
    const exercises = asPayload<ExerciseRow[]>(exercisesRes);
    const rows = Array.isArray(exercises)
      ? exercises.filter((entry) => String(entry.assignedBy || '').startsWith('WELLNESS_LIBRARY:'))
      : [];
    setCompletedLibraryRows(rows);
    return rows;
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [todayRes, rows, settingsRes] = await Promise.all([
          patientApi.getMoodToday().catch(() => null),
          loadCompletionRows(),
          patientApi.getSettings().catch(() => null),
        ]);

        const today = todayRes ? asPayload<MoodTodayPayload>(todayRes) : null;
        const settingsPayload = settingsRes ? asPayload<any>(settingsRes) : null;
        const settings = settingsPayload?.settings || settingsPayload || {};

        setLatestCheckIn(today?.latest || null);
        setSettingsSnapshot(settings);
        setFavorites(Array.isArray(settings?.wellnessLibrary?.favorites) ? settings.wellnessLibrary.favorites : []);
        setLoggedCompletionIds(rows.map((entry) => String(entry.title || '')));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!drawerItem) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerItem]);

  useEffect(() => {
    if (!playerItem || !playerPlaying) return;
    const tick = window.setInterval(() => {
      setPlayerProgress((current) => {
        const next = Math.min(100, current + Math.max(3, 100 / (playerItem.durationMinutes * 3)));
        return next;
      });
    }, 900);
    return () => window.clearInterval(tick);
  }, [playerItem, playerPlaying]);

  useEffect(() => {
    if (!playerItem || playerProgress < 100) return;
    setPlayerPlaying(false);
    void handleCompletion(playerItem, 'Audio session finished. +10 Wellness Points.');
  }, [playerItem, playerProgress]);

  const hero = useMemo(() => getHeroRecommendation(latestCheckIn), [latestCheckIn]);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return wellnessItems;
    return wellnessItems.filter((item) => item.filters.includes(activeFilter) || (activeFilter === 'audio' && item.kind === 'audio'));
  }, [activeFilter]);

  const rowsBySection = useMemo(() => {
    const map: Record<WellnessRow, WellnessItem[]> = {
      'quick-resets': [],
      cbt: [],
      soundscapes: [],
    };
    for (const item of filteredItems) {
      map[item.row].push(item);
    }
    return map;
  }, [filteredItems]);

  const completedTitles = useMemo(() => new Set(completedLibraryRows.map((item) => String(item.title || ''))), [completedLibraryRows]);

  const completedCount = completedLibraryRows.length;

  const persistFavorites = async (nextFavorites: string[]) => {
    const nextSettings = {
      ...settingsSnapshot,
      wellnessLibrary: {
        ...(settingsSnapshot?.wellnessLibrary || {}),
        favorites: nextFavorites,
      },
    };

    setSettingsSnapshot(nextSettings);
    setFavorites(nextFavorites);
    await patientApi.updateSettings(nextSettings);
  };

  const toggleFavorite = async (itemId: string) => {
    setSavingFavorite(itemId);
    try {
      const nextFavorites = favorites.includes(itemId)
        ? favorites.filter((entry) => entry !== itemId)
        : [...favorites, itemId];
      await persistFavorites(nextFavorites);
      setNotice(nextFavorites.includes(itemId) ? 'Saved to favorites.' : 'Removed from favorites.');
    } catch {
      setNotice('Could not update favorites right now.');
    } finally {
      setSavingFavorite(null);
    }
  };

  const handleCompletion = async (item: WellnessItem, successMessage?: string) => {
    if (loggedCompletionIds.includes(item.title)) {
      if (successMessage) setNotice(successMessage);
      return;
    }

    try {
      await patientApi.logWellnessLibraryActivity({
        title: item.title,
        duration: item.durationMinutes,
        category: item.tagLine,
        kind: item.kind,
      });
      const rows = await loadCompletionRows();
      setLoggedCompletionIds(rows.map((entry) => String(entry.title || '')));
      setNotice(successMessage || 'Completed. +10 Wellness Points.');
      // Notify TherapyPlanPage to mark AUDIO_THERAPY tasks as done
      window.dispatchEvent(new CustomEvent('audio-complete', { detail: { title: item.title } }));
    } catch {
      setNotice('Completion could not be logged right now.');
    }
  };

  const startAudio = (item: WellnessItem) => {
    setPlayerItem(item);
    setPlayerProgress(0);
    setPlayerPlaying(true);
  };

  const openExercise = (item: WellnessItem) => {
    setDrawerItem(item);
    setDrawerStep(0);
    setDrawerAnswers([]);
    setDrawerInput('');
  };

  const closeDrawer = () => {
    setDrawerItem(null);
    setDrawerStep(0);
    setDrawerInput('');
    setDrawerAnswers([]);
  };

  const submitDrawerStep = async () => {
    if (!drawerItem) return;
    const prompts = drawerItem.prompts || [];
    const nextAnswers = [...drawerAnswers, drawerInput.trim()];
    if (drawerStep < prompts.length - 1) {
      setDrawerAnswers(nextAnswers);
      setDrawerStep((current) => current + 1);
      setDrawerInput('');
      return;
    }
    await handleCompletion(drawerItem, 'Exercise completed. +10 Wellness Points.');
    closeDrawer();
  };

  const renderCard = (item: WellnessItem) => {
    const Icon = item.icon;
    const isFavorite = favorites.includes(item.id);
    const isComplete = completedTitles.has(item.title);

    return (
      <article
        key={item.id}
        className="group relative flex min-w-[250px] snap-start flex-col overflow-hidden rounded-[30px] bg-white/92 shadow-wellness-sm transition hover:-translate-y-1.5 hover:shadow-wellness-md sm:min-w-[286px]"
      >
        <div className={`relative aspect-[4/5] bg-gradient-to-br ${item.accent} p-5`}>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.22))]" />
          <div className="flex items-start justify-between gap-3">
            <div className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${item.kind === 'audio' ? 'bg-[#eaf4ff] text-[#1E90FF]' : 'bg-[#e8f5f2] text-charcoal/78'}`}>
              {item.badge}
            </div>
            <button
              type="button"
              disabled={savingFavorite === item.id}
              onClick={() => void toggleFavorite(item.id)}
              className={`rounded-full p-2 transition ${isFavorite ? 'bg-charcoal text-white' : 'bg-white/80 text-charcoal/70 hover:bg-white'}`}
              aria-label={isFavorite ? `Remove ${item.title} from favorites` : `Save ${item.title} to favorites`}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>

          <div className="mt-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-white/78 text-charcoal shadow-wellness-sm">
              <Icon className="h-7 w-7" />
            </div>
            <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/55">{item.tagLine}</p>
            <h3 className="mt-2 text-2xl font-semibold leading-tight text-charcoal">{item.title}</h3>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-charcoal/70">{item.description}</p>
          </div>
        </div>

        <div className="flex flex-1 items-end justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-charcoal/45">Duration</p>
            <p className="mt-1 text-sm font-semibold text-charcoal">⏳ {item.durationMinutes} min</p>
            {isComplete ? <p className="mt-1 text-xs font-medium text-[#1b7a67]">Completed</p> : null}
          </div>
          <button
            type="button"
            onClick={() => (item.kind === 'audio' ? startAudio(item) : openExercise(item))}
            className={`${item.kind === 'audio' ? 'wellness-primary-btn' : 'wellness-secondary-btn'} h-11 px-5`}
          >
            {item.kind === 'audio' ? 'Play' : 'Open'}
          </button>
        </div>
      </article>
    );
  };

  if (loading) {
    return <div className="wellness-panel rounded-[28px] p-6">Loading Wellness Library...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 pb-28 lg:pb-24">
      {notice ? (
        <div className="fixed right-5 top-20 z-40 rounded-2xl bg-charcoal px-4 py-3 text-sm font-medium text-white shadow-lg">
          {notice}
        </div>
      ) : null}

      <section className="relative overflow-hidden rounded-[34px] bg-gradient-wellness-hero p-6 shadow-wellness-md sm:p-8">
        <div className="absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_center,_rgba(17,34,47,0.14),transparent_65%)]" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="inline-flex rounded-full bg-white/88 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-charcoal/55 shadow-wellness-sm">
              Wellness Library
            </p>
            <h1 className="mt-4 max-w-3xl font-serif text-3xl font-semibold tracking-tight text-charcoal sm:text-4xl">
              Your self-care hub for quick resets, guided CBT, and sound-based calm.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-charcoal/70 sm:text-base">
              One place to browse what helps, save favorites, and keep your self-care activity connected to the rest of your treatment journey.
            </p>
          </div>

          <div className="rounded-[30px] border border-white/60 bg-gradient-to-br from-[#224153] via-[#2f5d6b] to-[#3a7086] p-6 text-white shadow-[0_24px_80px_rgba(18,30,45,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">{hero.eyebrow}</p>
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="max-w-md text-2xl font-semibold leading-tight">{hero.title}</h2>
                <p className="mt-3 text-sm leading-6 text-white/76">{hero.description}</p>
              </div>
              <hero.item.icon className="mt-1 h-10 w-10 shrink-0 text-white/85" />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => (hero.item.kind === 'audio' ? startAudio(hero.item) : openExercise(hero.item))}
                className="inline-flex min-h-[46px] items-center rounded-full bg-white px-5 text-sm font-semibold text-charcoal transition hover:bg-white/90"
              >
                <Play className="mr-2 h-4 w-4" />
                Play now
              </button>
              <Link to="/patient/therapy-plan" className="inline-flex min-h-[46px] items-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white/88 transition hover:bg-white/10">
                View therapy plan
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="wellness-panel flex flex-wrap items-center gap-3 rounded-[26px] p-4 sm:px-5">
        <div className="mr-1 rounded-full bg-white px-3 py-2 text-sm font-semibold text-charcoal/65 shadow-wellness-sm">
          Filter library
        </div>
        <div className="flex flex-1 gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filterPills.map((pill) => (
            <button
              key={pill.value}
              type="button"
              onClick={() => setActiveFilter(pill.value)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                activeFilter === pill.value ? 'bg-[#1E90FF] text-white shadow-wellness-sm' : 'bg-white text-charcoal/70 hover:bg-wellness-aqua'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm text-charcoal/65">
          <span>{favorites.length} favorites</span>
          <span>{completedCount} completed</span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="wellness-panel p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-charcoal/50">Hero source</p>
          <p className="mt-3 text-lg font-semibold text-charcoal">Daily Check-in aware</p>
          <p className="mt-1 text-sm text-charcoal/62">Low sleep, low energy, and high-pressure tags can change what surfaces first.</p>
        </article>
        <article className="wellness-panel p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-charcoal/50">Consumption model</p>
          <p className="mt-3 text-lg font-semibold text-charcoal">Browse while audio plays</p>
          <p className="mt-1 text-sm text-charcoal/62">Audio stays in a bottom-sheet player so patients can keep exploring the app.</p>
        </article>
        <article className="wellness-panel p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-charcoal/50">Clinical loop</p>
          <p className="mt-3 text-lg font-semibold text-charcoal">Completion is logged</p>
          <p className="mt-1 text-sm text-charcoal/62">Finished sessions now feed the patient timeline and add wellness momentum.</p>
        </article>
      </section>

      {(Object.keys(rowsBySection) as WellnessRow[]).map((rowKey) => {
        const rowItems = rowsBySection[rowKey];
        if (!rowItems.length) return null;
        return (
          <section key={rowKey} className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-charcoal">{rowLabels[rowKey].title}</h2>
                <p className="mt-1 text-sm text-charcoal/62">{rowLabels[rowKey].subtitle}</p>
              </div>
              <div className="hidden items-center gap-2 text-charcoal/45 md:flex">
                <ChevronLeft className="h-4 w-4" />
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {rowItems.map(renderCard)}
            </div>
          </section>
        );
      })}

      {playerItem ? (
        <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-4xl rounded-[26px] border border-white/60 bg-[#14303acc] p-4 text-white shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.16em] text-white/60">Now playing</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <playerItem.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">{playerItem.title}</p>
                  <p className="truncate text-sm text-white/68">{playerItem.description}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPlayerPlaying((current) => !current)}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-charcoal"
              >
                {playerPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={() => void handleCompletion(playerItem, 'Session completed. +10 Wellness Points.')}
                className="rounded-full border border-white/15 px-4 py-3 text-sm font-semibold text-white/90"
              >
                Finish session
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlayerItem(null);
                  setPlayerPlaying(false);
                  setPlayerProgress(0);
                }}
                className="rounded-full border border-white/15 p-3 text-white/75"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#f0b65a] transition-all" style={{ width: `${playerProgress}%` }} />
          </div>
        </div>
      ) : null}

      {drawerItem ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-charcoal/40 backdrop-blur-sm" onClick={closeDrawer}>
          <div
            className="h-full w-full max-w-2xl overflow-y-auto bg-[#fcfefd] p-6 shadow-2xl sm:p-8"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={drawerItem.title}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#557366]">Interactive exercise</p>
                <h2 className="mt-2 text-3xl font-semibold text-charcoal">{drawerItem.title}</h2>
                <p className="mt-2 text-sm leading-6 text-charcoal/65">One prompt at a time, just like a conversation.</p>
              </div>
              <button type="button" onClick={closeDrawer} className="rounded-full border border-ink-100 p-3 text-charcoal/65">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-8 rounded-[28px] bg-gradient-wellness-surface p-6 shadow-wellness-sm">
              <div className="mb-5 flex items-center justify-between text-sm text-charcoal/55">
                <span>Prompt {drawerStep + 1} of {(drawerItem.prompts || []).length}</span>
                <span>{drawerItem.durationMinutes} min</span>
              </div>
              <h3 className="text-2xl font-semibold leading-tight text-charcoal">{drawerItem.prompts?.[drawerStep]}</h3>
              <textarea
                value={drawerInput}
                onChange={(event) => setDrawerInput(event.target.value)}
                className="mt-6 min-h-[180px] w-full rounded-[24px] border border-wellness-border bg-white px-4 py-4 text-sm text-charcoal outline-none transition focus:border-[#1E90FF]"
                placeholder="Write whatever comes up. Short answers are fine."
              />
              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (drawerStep === 0) return;
                    setDrawerAnswers((current) => current.slice(0, -1));
                    setDrawerStep((current) => current - 1);
                    setDrawerInput(drawerAnswers[drawerStep - 1] || '');
                  }}
                  disabled={drawerStep === 0}
                  className="rounded-full bg-wellness-aqua px-4 py-3 text-sm font-semibold text-charcoal disabled:opacity-40"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void submitDrawerStep()}
                  className="wellness-primary-btn px-5 py-3"
                >
                  {drawerStep === (drawerItem.prompts || []).length - 1 ? 'Complete exercise' : 'Next prompt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
