import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Flame, MoonStar, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { patientApi } from '../../api/patient';
import {
  DAILY_CHECK_IN_TAGS,
  ENERGY_OPTIONS,
  MOOD_OPTIONS,
  SLEEP_OPTIONS,
  formatTagLabel,
  getDailyCheckInPlaceholder,
  getMoodOption,
  type DailyCheckInMetadata,
} from '../../utils/dailyCheckIn';

const asPayload = <T,>(value: any): T => (value?.data ?? value) as T;

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const toLocalDateKey = (value: Date = new Date()) => {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const isSameLocalDay = (value?: string | Date) => {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return toLocalDateKey(date) === toLocalDateKey();
};

type MoodItem = {
  id: string;
  mood: number;
  note?: string | null;
  metadata?: DailyCheckInMetadata | null;
  created_at: string;
};

type MoodStats = {
  totalCheckins: number;
  averageMood: number;
  last7DaysAverage: number;
  last30DaysAverage: number;
  currentStreak: number;
  longestStreak: number;
  highestMood: number;
  lowestMood: number;
  insights?: string[];
};

type TherapyPlanPayload = {
  activities?: Array<{ id: string; title: string; activityType: string; estimatedMinutes?: number; status: string }>;
};

const screenMotion = {
  initial: { opacity: 0, x: 28 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -28 },
};

export default function MoodTrackerPage() {
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState<number | null>(null);
  const [intensity, setIntensity] = useState(6);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [energy, setEnergy] = useState<'low' | 'medium' | 'high'>('medium');
  const [sleepHours, setSleepHours] = useState<string>('7-8 hours');
  const [note, setNote] = useState('');
  const [history, setHistory] = useState<MoodItem[]>([]);
  const [today, setToday] = useState<any>(null);
  const [stats, setStats] = useState<MoodStats | null>(null);
  const [therapyPlan, setTherapyPlan] = useState<TherapyPlanPayload | null>(null);
  const [successState, setSuccessState] = useState<{ streak: number; latestMood: number; ctaTitle: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [todayRes, historyRes, statsRes, therapyPlanRes] = await Promise.all([
      patientApi.getMoodToday(),
      patientApi.getMoodHistoryV2(),
      patientApi.getMoodStats(),
      patientApi.getTherapyPlan().catch(() => null),
    ]);

    const todayData = asPayload<any>(todayRes);
    const historyData = asPayload<MoodItem[]>(historyRes);
    const statsData = asPayload<MoodStats>(statsRes);
    const therapyPlanData = therapyPlanRes ? asPayload<TherapyPlanPayload>(therapyPlanRes) : null;

    setToday(todayData || null);
    setHistory(Array.isArray(historyData) ? historyData : []);
    setStats(statsData || null);
    setTherapyPlan(therapyPlanData || null);

    if (todayData?.latest?.mood) {
      setMood(Number(todayData.latest.mood));
      setNote(String(todayData.latest.note || ''));
      setIntensity(Number(todayData.latest.metadata?.intensity || 6));
      setSelectedTags(Array.isArray(todayData.latest.metadata?.tags) ? todayData.latest.metadata.tags.slice(0, 3) : []);
      setEnergy((todayData.latest.metadata?.energy || 'medium') as 'low' | 'medium' | 'high');
      setSleepHours(String(todayData.latest.metadata?.sleepHours || '7-8 hours'));
    }

    return { today: todayData, history: historyData, stats: statsData, therapyPlan: therapyPlanData };
  };

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        await load();
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Unable to load mood tracker right now.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const chartData = useMemo(() => {
    return [...history]
      .slice(0, 14)
      .reverse()
      .map((item) => ({ day: formatDate(item.created_at), mood: Number(item.mood || 0) }));
  }, [history]);

  const hasSubmittedToday = useMemo(() => {
    const count = Number(today?.entryCount || 0);
    if (count > 0) return true;

    const latestDate = today?.latest?.created_at || today?.latest?.createdAt || today?.latest?.date;
    return isSameLocalDay(latestDate);
  }, [today]);

  const latestMood = getMoodOption(mood);
  const dynamicPlaceholder = getDailyCheckInPlaceholder(mood);
  const suggestedAudio = useMemo(() => {
    const activities = Array.isArray(therapyPlan?.activities) ? therapyPlan?.activities : [];
    return activities.find((item) => item.activityType === 'AUDIO_THERAPY') || null;
  }, [therapyPlan]);

  const recentEntries = useMemo(() => history.slice(0, 6), [history]);

  const toggleTag = (tag: string) => {
    if (navigator.vibrate) navigator.vibrate(8);
    setSelectedTags((current) => {
      if (current.includes(tag)) return current.filter((item) => item !== tag);
      if (current.length >= 3) return [...current.slice(1), tag];
      return [...current, tag];
    });
  };

  const selectMood = (value: number) => {
    if (navigator.vibrate) navigator.vibrate(12);
    setMood(value);
  };

  const saveMood = async () => {
    if (!mood) return;
    if (hasSubmittedToday) {
      setError('Daily check-in can be submitted only once per day. Please come back tomorrow.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const response = await patientApi.addMoodLog({
        mood,
        note: note.trim() || undefined,
        intensity,
        tags: selectedTags,
        energy,
        sleepHours,
      });
      const refreshed = await load();
      setSuccessState({
        streak: Number(refreshed.stats?.currentStreak || 0),
        latestMood: Number((response as any)?.data?.mood ?? (response as any)?.mood ?? mood),
        ctaTitle: suggestedAudio?.title || '2-minute audio reset',
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to save mood check-in.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-3xl border border-calm-sage/15 bg-white p-6">Loading your daily check-in...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-6 pb-20 lg:pb-6">
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {hasSubmittedToday ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Today&apos;s check-in is already completed. You can submit the next one tomorrow.
        </div>
      ) : null}

      <section className="relative overflow-hidden rounded-[32px] border border-[#d8e2dd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(232,239,230,0.92)_42%,_rgba(247,243,234,0.95)_100%)] p-5 shadow-soft-sm sm:p-8">
        <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(196,217,207,0.24),rgba(255,223,186,0.24))]" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#557366] shadow-sm">
                Daily Check-in
              </span>
              <span className="inline-flex items-center rounded-full bg-[#20332f] px-3 py-1 text-xs font-semibold text-white/90">
                under 15 seconds
              </span>
            </div>

            <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-charcoal sm:text-4xl">
              A gentle micro-journal that captures how today feels, why it feels that way, and what your patterns are teaching you.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-charcoal/70 sm:text-base">
              Three quick screens. One clean signal for you, your therapy plan, and Anytime Buddy.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {[0, 1, 2].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    if (!hasSubmittedToday) setStep(value);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    step === value ? 'bg-charcoal text-white shadow-sm' : 'bg-white/80 text-charcoal/70 hover:bg-white'
                  }`}
                >
                  {value === 0 ? '1. Feeling' : value === 1 ? '2. Context' : '3. Reflection'}
                </button>
              ))}
            </div>

            <div className="mt-8 overflow-hidden rounded-[28px] border border-white/70 bg-white/70 p-4 shadow-[0_16px_48px_rgba(42,61,54,0.08)] backdrop-blur sm:p-6">
              <AnimatePresence mode="wait">
                <motion.div key={step} {...screenMotion} transition={{ duration: 0.28 }}>
                  {step === 0 ? (
                    <div className="space-y-6">
                      <div>
                        <p className="text-sm font-medium uppercase tracking-[0.12em] text-[#557366]">Step 1</p>
                        <h2 className="mt-2 text-2xl font-semibold text-charcoal">What is the core feeling today?</h2>
                        <p className="mt-2 text-sm text-charcoal/65">Tap the face that fits best. The intensity slider appears right after.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                        {MOOD_OPTIONS.map((option) => {
                          const active = mood === option.value;
                          return (
                            <motion.button
                              key={option.value}
                              type="button"
                              whileTap={{ scale: 0.97 }}
                              animate={{ scale: active ? 1.06 : 1, opacity: active || !mood ? 1 : 0.55 }}
                              onClick={() => {
                                if (!hasSubmittedToday) selectMood(option.value);
                              }}
                              className={`relative overflow-hidden rounded-[24px] border px-4 py-5 text-left transition ${
                                active ? 'border-transparent bg-[#18322d] text-white shadow-lg' : 'border-[#dbe6e1] bg-white hover:border-[#b7cabc]'
                              }`}
                            >
                              <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${option.accent}`} />
                              <div className="text-4xl">{option.emoji}</div>
                              <div className="mt-4 text-sm font-semibold">{option.label}</div>
                            </motion.button>
                          );
                        })}
                      </div>

                      <AnimatePresence>
                        {mood ? (
                          <motion.div
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="rounded-[24px] border border-[#dbe6e1] bg-[#f7f3ea] p-5"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm font-medium text-charcoal/60">How strong is this feeling?</p>
                                <p className="mt-1 text-xl font-semibold text-charcoal">{intensity}/10 intensity</p>
                              </div>
                              <div className="rounded-full bg-white px-3 py-1 text-sm font-medium text-[#557366]">
                                {latestMood?.emoji} {latestMood?.label}
                              </div>
                            </div>
                            <input
                              type="range"
                              min={1}
                              max={10}
                              step={1}
                              value={intensity}
                              disabled={hasSubmittedToday}
                              onChange={(event) => setIntensity(Number(event.target.value))}
                              className="mt-5 h-2 w-full cursor-pointer accent-[#557366]"
                              aria-label="Mood intensity"
                            />
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  ) : null}

                  {step === 1 ? (
                    <div className="space-y-6">
                      <div>
                        <p className="text-sm font-medium uppercase tracking-[0.12em] text-[#557366]">Step 2</p>
                        <h2 className="mt-2 text-2xl font-semibold text-charcoal">What is influencing this?</h2>
                        <p className="mt-2 text-sm text-charcoal/65">Tap up to three quick tags, then add your energy and sleep in one glance.</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {DAILY_CHECK_IN_TAGS.map((tag) => {
                          const active = selectedTags.includes(tag.value);
                          return (
                            <button
                              key={tag.value}
                              type="button"
                              onClick={() => toggleTag(tag.value)}
                              className={`flex items-center justify-between rounded-full border px-4 py-3 text-left text-sm transition ${
                                active ? 'border-transparent bg-[#1e6d61] text-white shadow-sm' : 'border-[#dbe6e1] bg-white text-charcoal hover:border-[#9bb8ab]'
                              }`}
                            >
                              <span>{tag.emoji} {tag.label}</span>
                              {active ? <Check className="h-4 w-4" /> : null}
                            </button>
                          );
                        })}
                      </div>

                      <div className="grid gap-5 rounded-[24px] border border-[#dbe6e1] bg-white p-5 lg:grid-cols-2">
                        <div>
                          <p className="text-sm font-medium text-charcoal/70">Energy level</p>
                          <div className="mt-3 inline-flex rounded-full bg-[#eef4f1] p-1">
                            {ENERGY_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setEnergy(option.value)}
                                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                                  energy === option.value ? 'bg-[#18322d] text-white shadow-sm' : 'text-charcoal/65'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-charcoal/70">Sleep hours</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {SLEEP_OPTIONS.map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => setSleepHours(option)}
                                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                                  sleepHours === option ? 'bg-[#f0b65a] text-[#3d2d0f]' : 'bg-[#f8f6f0] text-charcoal/70 hover:bg-[#f1ece2]'
                                }`}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {step === 2 ? (
                    <div className="space-y-6">
                      <div>
                        <p className="text-sm font-medium uppercase tracking-[0.12em] text-[#557366]">Step 3</p>
                        <h2 className="mt-2 text-2xl font-semibold text-charcoal">Anything you want to release or remember?</h2>
                        <p className="mt-2 text-sm text-charcoal/65">Optional. Keep it short. This is your space, not another task list.</p>
                      </div>

                      <div className="rounded-[24px] border border-[#dbe6e1] bg-white p-5">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-charcoal/65">
                          {latestMood ? <span className="rounded-full bg-[#eef4f1] px-3 py-1">{latestMood.emoji} {latestMood.label}</span> : null}
                          <span className="rounded-full bg-[#f7f3ea] px-3 py-1">Intensity {intensity}/10</span>
                          <span className="rounded-full bg-[#f7f3ea] px-3 py-1">{energy} energy</span>
                          <span className="rounded-full bg-[#f7f3ea] px-3 py-1">{sleepHours}</span>
                        </div>
                        <textarea
                          id="mood-note"
                          className="mt-4 min-h-[156px] w-full rounded-[22px] border border-[#dbe6e1] bg-[#fcfcfa] px-4 py-4 text-sm text-charcoal outline-none transition focus:border-[#8db2a2]"
                          value={note}
                          disabled={hasSubmittedToday}
                          onChange={(event) => setNote(event.target.value)}
                          placeholder={dynamicPlaceholder}
                        />
                        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm text-charcoal/55">Optional journal, structured data underneath, and one tap to save.</p>
                          <button
                            type="button"
                            onClick={() => void saveMood()}
                            disabled={saving || !mood || hasSubmittedToday}
                            className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#18322d] px-6 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                            {saving ? 'Saving your check-in...' : hasSubmittedToday ? 'Completed today' : 'Save My Check-in'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>

              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                  disabled={step === 0 || hasSubmittedToday}
                  className="inline-flex items-center rounded-full bg-[#eef4f1] px-4 py-2 text-sm font-medium text-charcoal transition disabled:opacity-40"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </button>
                {step < 2 ? (
                  <button
                    type="button"
                    onClick={() => setStep((current) => Math.min(2, current + 1))}
                    disabled={hasSubmittedToday || (step === 0 && !mood)}
                    className="inline-flex items-center rounded-full bg-[#18322d] px-5 py-2.5 text-sm font-medium text-white transition disabled:opacity-40"
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#557366]">Momentum</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <article className="rounded-[22px] bg-[#18322d] p-4 text-white">
                  <p className="text-xs uppercase tracking-[0.14em] text-white/70">Current streak</p>
                  <p className="mt-3 flex items-center text-3xl font-semibold"><Flame className="mr-2 h-6 w-6 text-[#f0b65a]" />{stats?.currentStreak ?? 0}</p>
                  <p className="mt-1 text-xs text-white/70">Longest: {stats?.longestStreak ?? 0} days</p>
                </article>
                <article className="rounded-[22px] bg-[#f7f3ea] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-charcoal/55">Last 7 days</p>
                  <p className="mt-3 text-3xl font-semibold text-charcoal">{stats?.last7DaysAverage ?? 0}</p>
                  <p className="mt-1 text-xs text-charcoal/55">Average mood</p>
                </article>
                <article className="rounded-[22px] bg-[#eef4f1] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-charcoal/55">Today</p>
                  <p className="mt-3 text-3xl font-semibold text-charcoal">{today?.entryCount ?? 0}</p>
                  <p className="mt-1 text-xs text-charcoal/55">Check-ins logged</p>
                </article>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-[#fffdf8] p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#557366]">Why this matters</p>
              <div className="mt-4 space-y-3">
                {(stats?.insights || []).slice(0, 3).map((insight) => (
                  <div key={insight} className="rounded-[20px] border border-[#e7e2d7] bg-white px-4 py-3 text-sm leading-6 text-charcoal/80">
                    <span className="mr-2">💡</span>{insight}
                  </div>
                ))}
                {!stats?.insights?.length ? (
                  <div className="rounded-[20px] border border-dashed border-[#d8e2dd] px-4 py-4 text-sm text-charcoal/55">
                    Your context tags will start turning into pattern insights after a few check-ins.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {successState ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-[#13211dcc]/70 p-4 backdrop-blur-sm"
            >
              <div className="w-full max-w-xl rounded-[32px] bg-[radial-gradient(circle_at_top,_rgba(255,245,214,0.92),_rgba(255,255,255,0.96)_45%,_rgba(237,244,241,0.98)_100%)] p-7 shadow-[0_30px_90px_rgba(0,0,0,0.22)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#1f6b60] text-white shadow-lg">
                  <Check className="h-8 w-8" />
                </div>
                <h2 className="mt-5 text-center text-3xl font-semibold text-charcoal">Check-in saved</h2>
                <p className="mt-3 text-center text-base leading-7 text-charcoal/72">
                  <span className="font-semibold text-[#1f6b60]"><Flame className="-mt-1 mr-1 inline h-5 w-5 text-[#f0b65a]" />{successState.streak}-day streak</span>
                  {' '}and counting. You’re building real momentum, one calm data point at a time.
                </p>

                <div className="mt-6 rounded-[24px] border border-[#d9e5df] bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#557366]">Immediate next step</p>
                  <p className="mt-2 text-base font-medium text-charcoal">Based on this check-in, Anytime Buddy has a quick audio reset ready.</p>
                  <p className="mt-1 text-sm text-charcoal/65">{successState.ctaTitle}</p>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <Link to="/patient/sound-therapy" className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-[#18322d] px-5 text-sm font-semibold text-white transition hover:opacity-95">
                      Play now
                    </Link>
                    <button
                      type="button"
                      onClick={() => setSuccessState(null)}
                      className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-[#eef4f1] px-5 text-sm font-semibold text-charcoal"
                    >
                      Keep journaling
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </section>

      <section className="rounded-[28px] border border-ink-100 bg-white p-5 shadow-soft-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-charcoal">Check-in trend</h2>
            <p className="mt-1 text-sm text-charcoal/60">The line stays simple. The insight cards make it useful.</p>
          </div>
          <div className="inline-flex items-center rounded-full bg-[#eef4f1] px-3 py-1 text-sm font-medium text-[#557366]">
            Last 14 entries
          </div>
        </div>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(44, 51, 51, 0.08)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#5C6666' }} axisLine={false} tickLine={false} />
              <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: '#7C8585' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value: any) => [`${getMoodOption(Number(value))?.label || value}`, 'Mood']} />
              <Line type="monotone" dataKey="mood" stroke="#4f7c6a" strokeWidth={3} dot={{ r: 3, fill: '#4f7c6a' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-[28px] border border-ink-100 bg-white p-5 shadow-soft-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-charcoal">Recent reflections</h2>
            <p className="mt-1 text-sm text-charcoal/60">Each check-in brings back the feeling, the context, and the optional journal note.</p>
          </div>
          <div className="rounded-full bg-[#f7f3ea] px-3 py-1 text-sm font-medium text-charcoal/70">
            <MoonStar className="-mt-0.5 mr-1 inline h-4 w-4" /> daily signal
          </div>
        </div>
        <div className="mt-5 divide-y divide-calm-sage/10">
          {recentEntries.map((item) => (
            <div key={item.id} className="flex flex-col gap-4 py-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium text-charcoal">{getMoodOption(item.mood)?.emoji} {getMoodOption(item.mood)?.label || `${item.mood}/5`}</p>
                <p className="text-xs text-charcoal/55">{formatDateTime(item.created_at)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(item.metadata?.tags || []).map((tag) => (
                    <span key={`${item.id}-${tag}`} className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-medium text-[#557366]">
                      {formatTagLabel(tag)}
                    </span>
                  ))}
                  {item.metadata?.energy ? (
                    <span className="rounded-full bg-[#f7f3ea] px-3 py-1 text-xs font-medium text-charcoal/70">
                      {item.metadata.energy} energy
                    </span>
                  ) : null}
                  {item.metadata?.sleepHours ? (
                    <span className="rounded-full bg-[#f7f3ea] px-3 py-1 text-xs font-medium text-charcoal/70">
                      {item.metadata.sleepHours}
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-charcoal/72 lg:text-right">{item.note || 'No journal note added.'}</p>
            </div>
          ))}
          {!history.length && <p className="py-4 text-sm text-charcoal/60">No mood entries yet.</p>}
        </div>
      </section>
    </div>
  );
}
