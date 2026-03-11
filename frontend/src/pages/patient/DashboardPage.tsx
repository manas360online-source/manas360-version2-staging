import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { isOnboardingRequiredError, patientApi } from '../../api/patient';
import { parseJourneyPayload, type JourneyPayload } from '../../utils/journey';

const moodEmojiMap: Record<number, string> = {
  1: '😢',
  2: '😔',
  3: '😐',
  4: '🙂',
  5: '😊',
};

const moodLabelMap: Record<number, string> = {
  1: 'It’s okay to feel this way. We’re here for you.',
  2: 'You’re not alone in this.',
  3: 'Small steps matter.',
  4: 'You’re doing well today.',
  5: 'You’re doing well. Keep the momentum going.',
};

const moodName = (value: number) => {
  if (value <= 1) return 'Terrible';
  if (value <= 2) return 'Low';
  if (value <= 3) return 'Okay';
  if (value <= 4) return 'Good';
  return 'Great';
};

const formatDate = (value?: string | Date) => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatDateTime = (value?: string | Date) => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const isSubscriptionActive = (subscription: any): boolean => {
  if (!subscription) return false;

  const status = String(subscription?.status || '').toLowerCase();
  if (status === 'active' || status === 'trialing') return true;
  if (subscription?.isActive === true || subscription?.active === true) return true;

  return false;
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [journey, setJourney] = useState<JourneyPayload | null>(null);
  const [moodValue, setMoodValue] = useState<number>(3);
  const [savingMood, setSavingMood] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    const [dashboardRes, subscriptionRes, historyRes] = await Promise.all([
      patientApi.getDashboardV2(),
      patientApi.getSubscription().catch(() => null),
      patientApi.getSessionHistory(),
    ]);
    const journeyRes = await patientApi.getJourneyRecommendation().catch(() => null);

    const dashboardData = dashboardRes?.data ?? dashboardRes;
    const subscriptionData = subscriptionRes ? (subscriptionRes.data ?? subscriptionRes) : null;
    const sessionHistory = historyRes?.data ?? historyRes;

    setDashboard(dashboardData || null);
    setSubscription(subscriptionData || null);
    setSessions(Array.isArray(sessionHistory) ? sessionHistory : []);
    setJourney(journeyRes ? parseJourneyPayload(journeyRes) : null);

    const latestMood = dashboardData?.moodTrend?.[dashboardData.moodTrend.length - 1]?.score;
    if (typeof latestMood === 'number') setMoodValue(latestMood);
  };

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        await fetchDashboardData();
      } catch (err: any) {
        if (isOnboardingRequiredError(err)) {
          navigate('/patient/onboarding', { replace: true });
          return;
        }
        setError(err?.response?.data?.message || err?.message || 'Unable to load dashboard right now.');
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

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

  const userName = dashboard?.user?.name || 'there';
  const upcomingSession = dashboard?.upcomingSession || null;
  const moodTrend = Array.isArray(dashboard?.moodTrend) ? dashboard.moodTrend : [];
  const recentActivity = Array.isArray(dashboard?.recentActivity) ? dashboard.recentActivity : [];
  const exercises = Array.isArray(dashboard?.exercises) ? dashboard.exercises : [];
  const hasPlatformAccess = isSubscriptionActive(subscription);

  const normalizedMoodTrend = useMemo(() => {
    if (!moodTrend.length) return [];
    return moodTrend.map((item: any) => ({
      day: formatDate(item.date),
      score: Number(item.score || 0),
    }));
  }, [moodTrend]);

  const avgMood = useMemo(() => {
    if (!normalizedMoodTrend.length) return 0;
    const total = normalizedMoodTrend.reduce((sum: number, point: any) => sum + Number(point.score || 0), 0);
    return Number((total / normalizedMoodTrend.length).toFixed(1));
  }, [normalizedMoodTrend]);

  const wellnessScore = useMemo(() => {
    const moodScore = avgMood ? (avgMood / 5) * 40 : 0;
    const totalExercises = Number(dashboard?.progress?.totalExercises || 0);
    const completedExercises = Number(dashboard?.progress?.exercisesCompleted || 0);
    const exerciseRatio = totalExercises > 0 ? completedExercises / totalExercises : 0;
    const exerciseScore = exerciseRatio * 25;

    const totalSessions = Number(dashboard?.totalSessions || 0);
    const completedSessions = Number(dashboard?.sessionsCompleted || 0);
    const attendanceRatio = totalSessions > 0 ? completedSessions / totalSessions : 0;
    const attendanceScore = attendanceRatio * 25;

    const hasAssessment = Array.isArray(dashboard?.recentActivity)
      ? dashboard.recentActivity.some((item: any) =>
          String(item?.title || '').toLowerCase().includes('assessment'),
        )
      : false;
    const assessmentScore = hasAssessment ? 10 : 0;

    return Math.round(Math.min(100, moodScore + exerciseScore + attendanceScore + assessmentScore));
  }, [avgMood, dashboard]);

  const weeklyDelta = useMemo(() => {
    if (normalizedMoodTrend.length < 4) return 0;
    const mid = Math.floor(normalizedMoodTrend.length / 2);
    const first = normalizedMoodTrend.slice(0, mid);
    const second = normalizedMoodTrend.slice(mid);
    if (!first.length || !second.length) return 0;

    const firstAvg = first.reduce((sum: number, point: any) => sum + Number(point.score || 0), 0) / first.length;
    const secondAvg = second.reduce((sum: number, point: any) => sum + Number(point.score || 0), 0) / second.length;
    const deltaPoints = (secondAvg - firstAvg) * 8;
    return Math.round(deltaPoints);
  }, [normalizedMoodTrend]);

  const todayPlanItems = useMemo(() => {
    const moodChecked = normalizedMoodTrend.length > 0;
    const pendingExercise = exercises.find((item: any) => String(item?.status || '').toUpperCase() !== 'COMPLETED');
    const hasUpcomingSession = Boolean(upcomingSession?.scheduledAt);

    return [
      { label: 'Mood check-in', done: moodChecked, to: '/patient/mood' },
      { label: pendingExercise ? `CBT Exercise (${pendingExercise.duration || 5} min)` : 'CBT Exercise', done: !pendingExercise, to: '/patient/exercises' },
      { label: 'Meditation session', done: false, to: '/patient/sound-therapy' },
      { label: hasUpcomingSession ? 'Therapist session tomorrow' : 'Schedule next therapist session', done: hasUpcomingSession, to: hasUpcomingSession ? '/patient/sessions' : '/patient/care-team?tab=browse' },
    ];
  }, [normalizedMoodTrend.length, exercises, upcomingSession]);

  const aiSuggestions = useMemo(() => {
    const items: { text: string; to: string }[] = [];

    if (avgMood > 0 && avgMood <= 2.5) {
      items.push({ text: 'Grounding + breathing reset (5 min)', to: '/patient/sound-therapy' });
      items.push({ text: 'Low-mood thought reframing worksheet', to: '/patient/exercises' });
    } else if (avgMood > 2.5 && avgMood < 4) {
      items.push({ text: 'Sleep improvement CBT micro exercise', to: '/patient/exercises' });
      items.push({ text: 'Evening reflection journal', to: '/patient/mood' });
    } else {
      items.push({ text: 'Maintain momentum with gratitude practice', to: '/patient/exercises' });
      items.push({ text: 'Short mindfulness session', to: '/patient/sound-therapy' });
    }

    const pendingCount = exercises.filter((item: any) => String(item?.status || '').toUpperCase() !== 'COMPLETED').length;
    if (pendingCount > 0) {
      items.push({ text: 'Complete one pending assigned exercise today', to: '/patient/exercises' });
    }

    return items.slice(0, 3);
  }, [avgMood, exercises]);

  const onSaveMood = async () => {
    setSavingMood(true);
    try {
      await patientApi.addMoodLog({ mood: moodValue });
      await fetchDashboardData();
    } finally {
      setSavingMood(false);
    }
  };

  const onCompleteExercise = async (exerciseId: string) => {
    await patientApi.completeExercise(exerciseId);
    await fetchDashboardData();
  };

  if (loading) {
    return <div className="rounded-2xl border border-calm-sage/15 bg-white/80 p-6">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 text-sm text-rose-800">{error}</div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-20 lg:pb-6">
      <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm sm:p-5">
        <p className="text-xs text-charcoal/55 sm:text-sm">{todayLabel}</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-charcoal sm:text-3xl">Good day, {userName}</h1>
        <p className="mt-1 text-sm text-charcoal/70">How are you feeling today?</p>
        <p className="mt-2 text-xs font-medium text-calm-sage sm:text-sm">{moodLabelMap[moodValue] ?? moodLabelMap[3]}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMoodValue(value)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-xl transition sm:h-12 sm:w-12 sm:text-2xl ${
                moodValue === value ? 'bg-calm-sage/25 ring-2 ring-calm-sage/40' : 'bg-cream/80 hover:bg-calm-sage/10'
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

          <Link
            to="/patient/mood"
            className="inline-flex min-h-[40px] items-center rounded-xl border border-calm-sage/20 bg-white px-4 text-sm font-medium text-charcoal transition hover:bg-calm-sage/10"
          >
            Open Mood Tracker
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="h-full rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Wellness Score</p>
          <p className="mt-2 text-3xl font-semibold text-calm-sage">{dashboard?.wellnessScore ?? wellnessScore}/100</p>
          <p className={`mt-1 text-xs ${weeklyDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {weeklyDelta >= 0 ? `+${weeklyDelta}` : `${weeklyDelta}`} this week
          </p>
        </article>

        <article className="h-full rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Sessions Done</p>
          <p className="mt-2 text-3xl font-semibold text-charcoal">{dashboard?.sessionsCompleted ?? 0}</p>
          <p className="text-xs text-charcoal/55">of {dashboard?.totalSessions ?? 0} planned</p>
        </article>

        <article className="h-full rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Streak</p>
          <p className="mt-2 text-3xl font-semibold text-charcoal">{dashboard?.streak ?? 0}</p>
          <p className="text-xs text-charcoal/55">days of mood tracking</p>
        </article>

        <article className="h-full rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Exercises</p>
          <p className="mt-2 text-3xl font-semibold text-charcoal">{dashboard?.progress?.exercisesCompleted ?? 0}</p>
          <p className="text-xs text-charcoal/55">of {dashboard?.progress?.totalExercises ?? 0} completed</p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm">
          <h2 className="text-base font-semibold text-charcoal">Today's Plan</h2>
          <div className="mt-3 space-y-2">
            {todayPlanItems.map((item) => (
              <Link key={item.label} to={item.to} className="flex items-center gap-2 rounded-lg p-1 transition hover:bg-calm-sage/5">
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-500'}`}>
                  {item.done ? '✓' : '○'}
                </span>
                <p className="text-sm text-charcoal/80">{item.label}</p>
              </Link>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm">
          <h2 className="text-base font-semibold text-charcoal">Therapist Status</h2>
          {!upcomingSession ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-charcoal/70">No therapist session is currently scheduled.</p>
              <Link to="/patient/care-team?tab=browse" className="inline-flex min-h-[36px] items-center rounded-full border border-calm-sage/25 px-3 text-xs font-medium text-charcoal/80">
                Find Therapist
              </Link>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-semibold text-charcoal">{upcomingSession?.provider?.name || 'Assigned Therapist'}</p>
              <p className="text-xs text-charcoal/65">Next Session: {formatDateTime(upcomingSession.scheduledAt)}</p>
              <div className="flex flex-wrap gap-2">
                <Link to="/patient/sessions" className="inline-flex min-h-[34px] items-center rounded-full border border-calm-sage/25 px-3 text-xs">View Plan</Link>
                <Link to="/patient/messages" className="inline-flex min-h-[34px] items-center rounded-full border border-calm-sage/25 px-3 text-xs">Message Support</Link>
              </div>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm">
          <h2 className="text-base font-semibold text-charcoal">AI Suggestions</h2>
          <p className="mt-1 text-xs text-charcoal/60">Based on your mood trend and activity</p>
          <ul className="mt-3 space-y-1 pl-1 text-sm text-charcoal/80">
            {aiSuggestions.map((item) => (
              <li key={item.text}>
                <Link to={item.to} className="flex items-start gap-2 rounded-lg p-1 transition hover:bg-calm-sage/5">
                  <span className="mt-1 text-calm-sage">•</span>
                  <span>{item.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <article className="relative overflow-hidden rounded-2xl bg-sage-700 p-4 text-white shadow-soft-md sm:p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/5" />
            <div className="relative z-10">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-medium text-white">Next Session</span>
                {upcomingSession?.scheduledAt && (
                  <span className="text-[11px] text-white/70">{formatDateTime(upcomingSession.scheduledAt)}</span>
                )}
              </div>

              {!upcomingSession ? (
                <p className="text-sm text-white/90">No upcoming session booked yet.</p>
              ) : (
                <div className="space-y-2">
                  <h2 className="font-display text-lg font-semibold text-white sm:text-xl">{upcomingSession?.provider?.name || 'Assigned Therapist'}</h2>
                  <p className="text-sm text-white/85">Session status: {upcomingSession.status || 'scheduled'}</p>
                  <Link to="/patient/sessions" className="inline-flex min-h-[42px] items-center rounded-xl bg-white px-4 text-sm font-semibold text-sage-700 hover:bg-sage-50">
                    View Session Details
                  </Link>
                </div>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold text-charcoal">Mood Trend</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-calm-sage">Average: {avgMood || '—'} / 5</span>
                <Link to="/patient/insights" className="text-xs font-medium text-calm-sage hover:underline">View Progress →</Link>
              </div>
            </div>

            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={normalizedMoodTrend} margin={{ top: 5, right: 6, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(44, 51, 51, 0.08)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#5C6666' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: '#7C8585' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, borderColor: 'rgba(168,181,160,0.25)', fontSize: 12 }}
                    formatter={(value: number) => [`${moodName(value)} (${value}/5)`, 'Mood']}
                  />
                  <Line type="monotone" dataKey="score" stroke="#A8B5A0" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#A8B5A0', stroke: '#ffffff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft-sm">
            <div className="flex items-center justify-between border-b border-calm-sage/15 px-4 py-3 sm:px-5 sm:py-4">
              <h2 className="text-base font-semibold text-charcoal">Recent Sessions</h2>
              <Link to="/patient/sessions" className="text-xs font-medium text-calm-sage hover:underline">
                View All →
              </Link>
            </div>

            <div className="divide-y divide-calm-sage/10">
              {sessions.slice(0, 4).map((session) => (
                <div key={session.id} className="flex items-center gap-3 px-4 py-4 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-charcoal">{session.provider?.name || 'Assigned Therapist'}</p>
                    <p className="truncate text-xs text-charcoal/60">{formatDateTime(session.scheduled_at || session.scheduledAt)} · {session.status || 'scheduled'}</p>
                  </div>
                </div>
              ))}
              {!sessions.length && <p className="px-5 py-6 text-sm text-charcoal/60">No sessions yet.</p>}
            </div>
          </article>
        </div>

        <div className="space-y-6">
          <article className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft-sm">
            <h2 className="text-base font-semibold text-charcoal">Journey Timeline</h2>
            {!journey ? (
              <p className="mt-2 text-sm text-charcoal/70">No journey data yet. Complete an assessment to start building your timeline.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {Array.isArray(journey?.actions) && journey.actions.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-4 text-xs text-charcoal/70">
                    {journey.actions.slice(0, 3).map((item: string) => <li key={item}>{item}</li>)}
                  </ul>
                ) : (
                  <p className="text-sm text-charcoal/70">Your therapy journey is being tracked. View your full timeline for details.</p>
                )}
                <div className="mt-2">
                  <Link to="/patient/timeline" className="inline-flex min-h-[34px] items-center rounded-full border border-calm-sage/25 px-3 text-xs font-medium text-charcoal/80 hover:bg-calm-sage/10">
                    Open Timeline
                  </Link>
                </div>
              </div>
            )}
          </article>

          <article className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft-sm">
            <div className="flex items-center justify-between border-b border-calm-sage/15 px-5 py-4">
              <h2 className="text-base font-semibold text-charcoal">Exercises</h2>
              <span className="rounded-full bg-calm-sage/10 px-2 py-0.5 text-[11px] font-medium text-charcoal">
                {exercises.filter((item: any) => String(item.status).toUpperCase() !== 'COMPLETED').length} pending
              </span>
            </div>
            <div className="divide-y divide-calm-sage/10">
              {exercises.slice(0, 5).map((exercise: any) => {
                const done = String(exercise.status).toUpperCase() === 'COMPLETED';
                return (
                  <div key={exercise.id} className={`flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center ${done ? 'opacity-60' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium text-charcoal ${done ? 'line-through' : ''}`}>{exercise.title}</p>
                      <p className="text-xs text-charcoal/55">{exercise.duration} min · Assigned by {exercise.assignedBy || 'care team'}</p>
                    </div>
                    {done ? (
                      <span className="w-full text-xs font-medium text-calm-sage sm:w-auto">Done ✓</span>
                    ) : (
                      <button type="button" onClick={() => void onCompleteExercise(exercise.id)} className="w-full rounded-xl bg-calm-sage px-3 py-2 text-xs font-medium text-white hover:opacity-95 sm:w-auto">
                        Mark Complete
                      </button>
                    )}
                  </div>
                );
              })}
              {!exercises.length && <p className="px-5 py-6 text-sm text-charcoal/60">No exercises assigned yet.</p>}
            </div>
          </article>

          <article className="rounded-2xl bg-gradient-to-br from-sage-700 to-sage-800 p-5 text-white shadow-soft-md">
            {hasPlatformAccess ? (
              <>
                <p className="text-sm font-semibold text-white">{subscription?.planName || 'Platform Access'}</p>
                <p className="mt-1 text-xs text-white/80">
                  ₹{subscription?.price || 0}/{String(subscription?.billingCycle || 'monthly').toLowerCase()} · Renews {formatDate(subscription?.renewalDate)}
                </p>
                {subscription?.nextRenewalPrice ? (
                  <p className="mt-1 text-xs text-white/85">
                    Next renewal price: ₹{subscription.nextRenewalPrice} (locked until {formatDate(subscription?.priceLockedUntil || subscription?.renewalDate)})
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-white/85">Status: {subscription?.status || 'active'} · Auto-renew: {subscription?.autoRenew ? 'On' : 'Off'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to="/patient/assessments" className="inline-flex rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-sage-700 hover:bg-sage-50">
                    Take Advanced Assessments
                  </Link>
                  <Link to="/patient/pricing" className="inline-flex rounded-lg border border-white/40 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10">
                    Manage Plan
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-white">Platform Access Not Active</p>
                <p className="mt-1 text-xs text-white/85">
                  Unlock advanced assessments (PHQ-9, GAD-7, PSS-10, ISI), AI insights, and provider matching.
                </p>
                <p className="mt-2 text-xs text-white/85">Pay platform fee first. Provider session fees are paid later at booking.</p>
                <Link to="/patient/pricing" className="mt-3 inline-flex rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-sage-700 hover:bg-sage-50">
                  Activate Platform Access
                </Link>
              </>
            )}
          </article>
        </div>
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft-sm">
        <h2 className="text-base font-semibold text-charcoal">Recent Activity</h2>
        <div className="mt-4 space-y-4">
          {recentActivity.map((item: any, index: number) => (
            <div key={`${item.id || `activity-${item.type || 'item'}-${item.date || index}`}-${index}`} className="flex items-start gap-3 sm:gap-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream text-sm">•</div>
              <div className="min-w-0">
                <p className="text-sm leading-relaxed text-charcoal">{item.title}</p>
                <p className="text-xs text-charcoal/55">{item.description}</p>
                <p className="text-xs text-charcoal/55">{formatDateTime(item.date)}</p>
              </div>
            </div>
          ))}
          {!recentActivity.length && <p className="text-sm text-charcoal/60">No recent activity available yet.</p>}
        </div>
      </section>
    </div>
  );
}
