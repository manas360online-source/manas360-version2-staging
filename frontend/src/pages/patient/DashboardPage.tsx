import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { patientApi } from '../../api/patient';

const moodEmojiMap: Record<number, string> = {
  1: '😢',
  2: '😔',
  3: '😐',
  4: '🙂',
  5: '😊',
};

const moodLabelMap: Record<number, string> = {
  1: 'It’s okay to feel this way. We’re here for you 🫶',
  2: 'You’re not alone in this 💚',
  3: 'Small steps matter 💚',
  4: 'You’re doing great 🌸',
  5: 'You’re doing great 🌸 Small steps matter 💚',
};

const compactDate = (date: Date) =>
  date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const weekdayShort = (date: Date) =>
  date.toLocaleDateString(undefined, { weekday: 'short' });

const moodName = (value: number) => {
  if (value <= 1) return 'Terrible';
  if (value <= 2) return 'Low';
  if (value <= 3) return 'Okay';
  if (value <= 4) return 'Good';
  return 'Great';
};

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [moodValue, setMoodValue] = useState<number>(5);
  const [savingMood, setSavingMood] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoadError(null);
        const [dashboardRes, historyRes] = await Promise.all([
          patientApi.getDashboard(),
          patientApi.getSessionHistory(),
        ]);
        const dashboard = dashboardRes.data ?? dashboardRes;
        const history = historyRes.data ?? historyRes;
        setData(dashboard);
        setSessionHistory(history || []);

        if (dashboard?.recentMoodLogs?.[0]?.moodScore) {
          setMoodValue(Number(dashboard.recentMoodLogs[0].moodScore));
        }
      } catch (error: any) {
        setLoadError(error?.response?.data?.message || error?.message || 'Unable to load dashboard right now.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const upcoming = (data?.upcomingSessions || []) as any[];
  const nextSession = upcoming[0] || null;

  const canJoinNow = useMemo(() => {
    if (!nextSession?.scheduledAt) return false;
    const startsAt = new Date(nextSession.scheduledAt).getTime();
    const now = Date.now();
    const fiveMinutesBefore = startsAt - 5 * 60 * 1000;
    return now >= fiveMinutesBefore && Boolean(nextSession.agoraChannel);
  }, [nextSession]);

  const completedSessions = useMemo(
    () => sessionHistory.filter((session) => session.status === 'completed').length,
    [sessionHistory],
  );

  const moodTrendValues = useMemo(() => {
    const logs = [...(data?.recentMoodLogs || [])].reverse();
    return logs.map((log: any) => ({
      score: Number(log.moodScore ?? log.mood ?? 0),
      createdAt: log.createdAt,
    }));
  }, [data]);

  const moodTrend7Days = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const entry of moodTrendValues) {
      const date = entry.createdAt ? new Date(entry.createdAt) : null;
      if (!date || Number.isNaN(date.getTime())) continue;
      byDay.set(compactDate(date), entry.score);
    }

    const points = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = compactDate(date);
      const score = byDay.get(key) ?? 3;
      return { day: weekdayShort(date), score };
    });

    return points;
  }, [moodTrendValues]);

  const avgMood = useMemo(() => {
    if (!moodTrend7Days.length) return 3;
    const total = moodTrend7Days.reduce((sum, item) => sum + item.score, 0);
    return Number((total / moodTrend7Days.length).toFixed(1));
  }, [moodTrend7Days]);

  const bestMoodDay = useMemo(() => {
    if (!moodTrend7Days.length) return '—';
    return [...moodTrend7Days].sort((a, b) => b.score - a.score)[0].day;
  }, [moodTrend7Days]);

  const wellnessScore = Math.max(0, Math.min(100, Math.round((avgMood / 5) * 100)));
  const streakDays = data?.streakDays ?? data?.moodStreakDays ?? 7;
  const cbtExercises = data?.cbtExercisesThisWeek ?? data?.cbtCompletedThisWeek ?? 5;

  const nextSessionTherapist =
    nextSession?.provider?.name || nextSession?.therapist?.name || 'Assigned Therapist';

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [],
  );

  const onSaveMood = async () => {
    setSavingMood(true);
    try {
      await patientApi.addMood({ mood: moodValue });
      const refreshed = await patientApi.getDashboard();
      setData(refreshed.data ?? refreshed);
    } finally {
      setSavingMood(false);
    }
  };

  if (loading) return <div className="rounded-2xl border border-calm-sage/15 bg-white/80 p-6">Loading dashboard...</div>;

  if (loadError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 text-sm text-rose-800">
        {loadError}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-20 lg:pb-6">
      <section className="rounded-2xl border border-calm-sage/20 bg-white/95 p-4 shadow-soft-sm sm:p-5">
        <p className="text-xs text-charcoal/55 sm:text-sm">{todayLabel}</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-charcoal sm:text-3xl">Good morning, Priya 🌸</h1>
        <p className="mt-1 text-sm text-charcoal/70">How are you feeling today?</p>
        <p className="mt-2 text-xs font-medium text-calm-sage sm:text-sm">{moodLabelMap[moodValue] ?? moodLabelMap[3]}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMoodValue(value)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-xl transition sm:h-12 sm:w-12 sm:text-2xl ${
                moodValue === value
                  ? 'bg-calm-sage/25 ring-2 ring-calm-sage/40'
                  : 'bg-cream/80 hover:bg-calm-sage/10'
              }`}
              aria-label={`Set mood to ${moodName(value)}`}
            >
              {moodEmojiMap[value]}
            </button>
          ))}

          <button
            type="button"
            onClick={onSaveMood}
            disabled={savingMood}
            className="inline-flex min-h-[40px] items-center rounded-xl bg-charcoal px-4 text-sm font-medium text-cream transition hover:opacity-95 disabled:opacity-60"
          >
            {savingMood ? 'Saving...' : 'Save check-in'}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="h-full rounded-2xl border border-calm-sage/20 bg-white/95 p-4 shadow-soft-sm">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Wellness Score</p>
          <div className="mt-2 flex items-end gap-2">
            <p className="text-3xl font-semibold text-calm-sage">{wellnessScore}</p>
            <p className="text-xs font-medium text-emerald-600">+8</p>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-calm-sage/20">
            <div className="h-full rounded-full bg-calm-sage" style={{ width: `${wellnessScore}%` }} />
          </div>
        </article>

        <article className="h-full rounded-2xl border border-calm-sage/20 bg-white/95 p-4 shadow-soft-sm">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Sessions Done</p>
          <p className="mt-2 text-3xl font-semibold text-charcoal">{completedSessions}</p>
          <p className="text-xs text-charcoal/55">of {Math.max(16, completedSessions + 4)} planned</p>
        </article>

        <article className="h-full rounded-2xl border border-calm-sage/20 bg-white/95 p-4 shadow-soft-sm">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Streak</p>
          <p className="mt-2 text-3xl font-semibold text-charcoal">{streakDays}</p>
          <p className="text-xs text-amber-700">days of mood tracking</p>
        </article>

        <article className="h-full rounded-2xl border border-calm-sage/20 bg-white/95 p-4 shadow-soft-sm">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">CBT Exercises</p>
          <p className="mt-2 text-3xl font-semibold text-charcoal">{cbtExercises}</p>
          <p className="text-xs text-soft-lavender">completed this week</p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <article className="relative overflow-hidden rounded-2xl bg-gradient-calm p-4 text-white shadow-soft-md sm:p-6">
            <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-white/10" />

            <div className="relative z-10">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-medium">Next Session</span>
                {nextSession?.scheduledAt && (
                  <span className="text-[11px] text-white/80">
                    {new Date(nextSession.scheduledAt).toLocaleString()}
                  </span>
                )}
              </div>

              {!nextSession ? (
                <p className="text-sm text-white/85">No upcoming session booked yet.</p>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-2xl">🧠</div>

                  <div className="min-w-0 flex-1">
                    <h2 className="font-serif text-lg font-semibold sm:text-xl">{nextSessionTherapist}</h2>
                    <p className="text-sm text-white/80">Clinical session · Personalized care plan</p>
                    <p className="mt-2 text-xs text-white/80">Small steps matter 💚</p>
                  </div>

                  {canJoinNow ? (
                    <Link
                      to={`/patient/sessions/${nextSession.id}/live`}
                      className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-charcoal shadow-soft-sm sm:w-auto"
                    >
                      Join Session
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-white/30 px-5 text-sm font-semibold text-white sm:w-auto"
                    >
                      Join (5 mins before)
                    </button>
                  )}
                </div>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-calm-sage/20 bg-white/95 p-4 shadow-soft-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold text-charcoal">Mood Trend — Last 7 Days</h2>
              <Link to="/patient/assessments" className="text-xs font-medium text-calm-sage hover:underline">
                View 30 Days →
              </Link>
            </div>

            <div className="h-40 sm:h-44 lg:h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={moodTrend7Days} margin={{ top: 5, right: 6, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(44, 51, 51, 0.08)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#5C6666' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: '#7C8585' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, borderColor: 'rgba(168,181,160,0.25)', fontSize: 12 }}
                    formatter={(value: number) => [`${moodName(value)} (${value}/5)`, 'Mood']}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#A8B5A0"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: '#A8B5A0', stroke: '#ffffff' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-calm-sage/15 pt-4 text-xs text-charcoal/70">
              <span>
                Average mood: <span className="font-semibold text-calm-sage">{avgMood} / 5</span>
              </span>
              <span>
                Best day: <span className="font-semibold text-charcoal">{bestMoodDay}</span>
              </span>
              <span>
                Pattern: <span className="font-semibold text-charcoal">Improves after sessions</span>
              </span>
            </div>

            <p className="mt-3 text-xs font-medium text-calm-sage">It’s okay to feel this way. We’re here for you 🫶</p>
          </article>

          <article className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Link
              to="/patient/providers"
              className="rounded-2xl border border-calm-sage/20 bg-white/95 p-4 text-center shadow-soft-sm transition hover:bg-calm-sage/10"
            >
              <p className="text-lg">📅</p>
              <p className="mt-2 text-xs font-semibold text-charcoal">Book Session</p>
            </Link>
            <Link
              to="/patient/messages"
              className="rounded-2xl border border-calm-sage/20 bg-white/95 p-4 text-center shadow-soft-sm transition hover:bg-calm-sage/10"
            >
              <p className="text-lg">🤖</p>
              <p className="mt-2 text-xs font-semibold text-charcoal">Talk to Buddy</p>
            </Link>
            <Link
              to="/patient/assessments"
              className="rounded-2xl border border-calm-sage/20 bg-white/95 p-4 text-center shadow-soft-sm transition hover:bg-calm-sage/10"
            >
              <p className="text-lg">🧠</p>
              <p className="mt-2 text-xs font-semibold text-charcoal">CBT Exercise</p>
            </Link>
            <Link
              to="/patient/support"
              className="rounded-2xl border border-calm-sage/20 bg-white/95 p-4 text-center shadow-soft-sm transition hover:bg-calm-sage/10"
            >
              <p className="text-lg">🎵</p>
              <p className="mt-2 text-xs font-semibold text-charcoal">Sound Therapy</p>
            </Link>
          </article>

          <article className="overflow-hidden rounded-2xl border border-calm-sage/20 bg-white/95 shadow-soft-sm">
            <div className="flex items-center justify-between border-b border-calm-sage/15 px-4 py-3 sm:px-5 sm:py-4">
              <h2 className="text-base font-semibold text-charcoal">Recent Sessions</h2>
              <Link to="/patient/sessions" className="text-xs font-medium text-calm-sage hover:underline">
                View All →
              </Link>
            </div>

            <div className="divide-y divide-calm-sage/10">
              {sessionHistory.slice(0, 3).map((session) => (
                <div key={session.id} className="flex items-center gap-3 px-4 py-4 sm:px-5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-calm-sage/20 text-xs font-semibold text-charcoal">
                    {(session.provider?.name || 'TH').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-charcoal">{session.provider?.name || 'Assigned Therapist'}</p>
                    <p className="truncate text-xs text-charcoal/60">
                      {session.concern || 'Therapy Session'} · {session.durationMinutes || 60} min
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-charcoal/70">
                      {session.scheduledAt ? new Date(session.scheduledAt).toLocaleDateString() : '—'}
                    </p>
                    <p className="text-[11px] text-amber-600">Rated ★★★★★</p>
                  </div>
                </div>
              ))}
              {!sessionHistory.length && (
                <p className="px-5 py-6 text-sm text-charcoal/60">No sessions yet. You can book your first one anytime.</p>
              )}
            </div>
          </article>
        </div>

        <div className="space-y-6">
          <article className="overflow-hidden rounded-2xl border border-calm-sage/20 bg-white/95 shadow-soft-sm">
            <div className="flex items-center gap-2 border-b border-calm-sage/15 px-4 py-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-calm-sage text-white">🤖</div>
              <h2 className="text-base font-semibold text-charcoal">AnytimeBuddy</h2>
              <span className="ml-auto rounded-full bg-calm-sage/15 px-2 py-0.5 text-[10px] font-medium text-calm-sage">Online</span>
            </div>

            <div className="h-56 space-y-3 overflow-y-auto bg-cream/60 p-4 sm:h-52">
              <div className="flex gap-2">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-calm-sage text-[10px] text-white">🤖</div>
                <div className="max-w-[88%] rounded-xl rounded-tl-sm bg-white px-3.5 py-2.5 shadow-soft-xs sm:max-w-[85%]">
                  <p className="text-sm text-charcoal/80">Good morning Priya! 🌸 You’ve been consistent this week. How are you feeling right now?</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <div className="max-w-[88%] rounded-xl rounded-tr-sm bg-calm-sage px-3.5 py-2.5 text-white sm:max-w-[85%]">
                  <p className="text-sm">A bit anxious about my meeting today, but overall okay.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-calm-sage text-[10px] text-white">🤖</div>
                <div className="max-w-[88%] rounded-xl rounded-tl-sm bg-white px-3.5 py-2.5 shadow-soft-xs sm:max-w-[85%]">
                  <p className="text-sm text-charcoal/80">That’s completely understandable. Would you like a quick 3-minute breathing exercise before your meeting? 💚</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 border-t border-calm-sage/15 p-3">
              <input
                type="text"
                placeholder="Type a message..."
                className="min-w-0 flex-1 rounded-xl border-0 bg-cream px-3 py-2 text-sm focus:ring-2 focus:ring-calm-sage/30"
              />
              <button type="button" className="shrink-0 rounded-xl bg-calm-sage px-3 py-2 text-sm text-white hover:opacity-95">
                Send
              </button>
            </div>
          </article>

          <article className="rounded-2xl border border-calm-sage/20 bg-white/95 p-5 shadow-soft-sm">
            <h2 className="text-base font-semibold text-charcoal">Treatment Progress</h2>
            <p className="mt-1 text-xs text-charcoal/60">You’re building momentum with every session 💚</p>

            <div className="my-4 flex justify-center">
              <div className="relative h-24 w-24 sm:h-28 sm:w-28">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  <circle cx="60" cy="60" r="52" stroke="rgba(168,181,160,0.25)" strokeWidth="10" fill="none" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    stroke="#A8B5A0"
                    strokeWidth="10"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="327"
                    strokeDashoffset={82}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-semibold text-calm-sage sm:text-2xl">75%</span>
                  <span className="text-[10px] text-charcoal/55">Complete</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-charcoal/65">Sessions completed</span>
                  <span className="font-semibold text-charcoal">{completedSessions} / 16</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-calm-sage/20">
                  <div className="h-full rounded-full bg-calm-sage" style={{ width: `${Math.min(100, (completedSessions / 16) * 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-charcoal/65">CBT exercises done</span>
                  <span className="font-semibold text-charcoal">{cbtExercises} / 24</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-calm-sage/20">
                  <div className="h-full rounded-full bg-soft-lavender" style={{ width: `${Math.min(100, (cbtExercises / 24) * 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-charcoal/65">PHQ-9 improvement</span>
                  <span className="font-semibold text-emerald-600">16 → 9 (↓43%)</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-calm-sage/20">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: '43%' }} />
                </div>
              </div>
            </div>
          </article>

          <article className="overflow-hidden rounded-2xl border border-calm-sage/20 bg-white/95 shadow-soft-sm">
            <div className="flex items-center justify-between border-b border-calm-sage/15 px-5 py-4">
              <h2 className="text-base font-semibold text-charcoal">Homework</h2>
              <span className="rounded-full bg-soft-lavender/20 px-2 py-0.5 text-[11px] font-medium text-charcoal">2 pending</span>
            </div>
            <div className="divide-y divide-calm-sage/10">
              {[
                { title: 'Thought Reframing Exercise', subtitle: 'Assigned by therapist · 15 min', done: false },
                { title: 'Gratitude Journal Entry', subtitle: 'Daily exercise · 5 min', done: false },
                { title: '5-4-3-2-1 Grounding', subtitle: 'Completed yesterday', done: true },
              ].map((exercise) => (
                <div key={exercise.title} className={`flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center ${exercise.done ? 'opacity-60' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium text-charcoal ${exercise.done ? 'line-through' : ''}`}>{exercise.title}</p>
                    <p className="text-xs text-charcoal/55">{exercise.subtitle}</p>
                  </div>
                  {exercise.done ? (
                    <span className="w-full text-xs font-medium text-calm-sage sm:w-auto">Done ✓</span>
                  ) : (
                    <button type="button" className="w-full rounded-xl bg-calm-sage px-3 py-2 text-xs font-medium text-white hover:opacity-95 sm:w-auto">
                      Start
                    </button>
                  )}
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl bg-gradient-calm p-5 text-white shadow-soft-md">
            <p className="text-sm font-semibold">Premium Plan</p>
            <p className="mt-1 text-xs text-white/80">₹299/month · Renews 15 Mar 2026</p>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-white/20 pt-3 text-[10px]">
              <span className="rounded-full bg-white/20 px-2 py-0.5">Unlimited Buddy</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5">Full CBT</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5">Priority</span>
            </div>
            <p className="mt-3 text-[11px] text-white/85">We’re here for you 🫶</p>
          </article>
        </div>
      </section>

      <section className="rounded-2xl border border-calm-sage/20 bg-white/95 p-5 shadow-soft-sm">
        <h2 className="text-base font-semibold text-charcoal">Recent Activity</h2>
        <p className="mt-1 text-xs text-charcoal/60">Your consistency is helping your healing journey.</p>

        <div className="mt-4 space-y-4">
          {[
            { icon: '😊', text: 'Mood logged — Feeling great (5/5)', time: 'Today at 08:30 AM' },
            { icon: '✅', text: 'CBT exercise completed — 5-4-3-2-1 Grounding', time: 'Yesterday at 09:15 PM' },
            { icon: '🎥', text: `Session completed with ${nextSessionTherapist}`, time: '27 Feb at 11:30 AM · Rated ★★★★★' },
            { icon: '🤖', text: 'AnytimeBuddy conversation — Guided breathing exercise (3 min)', time: '27 Feb at 08:45 AM' },
          ].map((item) => (
            <div key={item.text} className="flex items-start gap-3 sm:gap-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream text-sm">{item.icon}</div>
              <div className="min-w-0">
                <p className="text-sm leading-relaxed text-charcoal">{item.text}</p>
                <p className="text-xs text-charcoal/55">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
