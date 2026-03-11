import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { patientApi } from '../../api/patient';

const asPayload = <T,>(value: any): T => (value?.data ?? value) as T;

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function MyProgressPage() {
  const [progress, setProgress] = useState<any>(null);
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [moodStats, setMoodStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const [progressRes, sessionRes, moodStatsRes] = await Promise.all([
          patientApi.getProgress(),
          patientApi.getSessionHistory().catch(() => []),
          patientApi.getMoodStats().catch(() => null),
        ]);
        setProgress(asPayload<any>(progressRes));
        setSessionHistory(asPayload<any[]>(sessionRes) || []);
        setMoodStats(asPayload<any>(moodStatsRes));
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Unable to load progress right now.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const summary = progress?.summary || {};
  const moodTrend = Array.isArray(progress?.moodTrend) ? progress.moodTrend : [];
  const assessments = Array.isArray(progress?.assessmentTrend) ? progress.assessmentTrend : [];
  const completedSessionsCount = sessionHistory.filter((item: any) => String(item?.status || '').toLowerCase() === 'completed').length;
  const cancelledSessionsCount = sessionHistory.filter((item: any) => String(item?.status || '').toLowerCase() === 'cancelled').length;

  const completionChart = useMemo(
    () => [
      {
        name: 'Sessions',
        Completed: Number(summary.completedSessions || 0),
        Remaining: Math.max(0, Number(summary.totalSessions || 0) - Number(summary.completedSessions || 0)),
      },
      {
        name: 'Exercises',
        Completed: Number(summary.completedExercises || 0),
        Remaining: Math.max(0, Number(summary.totalExercises || 0) - Number(summary.completedExercises || 0)),
      },
    ],
    [summary],
  );

  const clinicalDelta = useMemo(() => {
    if (assessments.length < 2) {
      return { absolute: 0, percent: 0, from: null as number | null, to: null as number | null };
    }
    const first = Number(assessments[0]?.score || 0);
    const last = Number(assessments[assessments.length - 1]?.score || 0);
    const absolute = last - first;
    const percent = first > 0 ? Number((((first - last) / first) * 100).toFixed(1)) : 0;
    return { absolute, percent, from: first, to: last };
  }, [assessments]);

  const moodImprovementPercent = useMemo(() => {
    const values = moodTrend.map((item: any) => Number(item?.averageMood || 0)).filter((value: number) => value > 0);
    if (values.length < 2) return 0;
    const first = values[0];
    const last = values[values.length - 1];
    if (first <= 0) return 0;
    return Number((((last - first) / first) * 100).toFixed(1));
  }, [moodTrend]);

  const unifiedTimeline = useMemo(() => {
    const assessmentItems = assessments.map((item: any) => ({
      id: `assessment-${item.id}`,
      date: item.createdAt,
      type: 'assessment' as const,
      title: `${item.type} score ${item.score}`,
      subtitle: `${item.severity || 'N/A'}`,
    }));

    const sessionItems = sessionHistory.map((item: any) => ({
      id: `session-${item.id}`,
      date: item.scheduled_at || item.scheduledAt,
      type: 'session' as const,
      title: `Session ${String(item.status || 'scheduled').toLowerCase()}`,
      subtitle: item.provider?.name || item.therapist?.name || 'Assigned therapist',
    }));

    return [...assessmentItems, ...sessionItems]
      .filter((item) => item.date)
      .sort((a, b) => new Date(String(b.date)).getTime() - new Date(String(a.date)).getTime())
      .slice(0, 12);
  }, [assessments, sessionHistory]);

  if (loading) {
    return <div className="rounded-2xl border border-calm-sage/15 bg-white p-5">Loading progress...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 pb-20 lg:pb-6">
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft-sm">
        <h1 className="text-xl font-semibold text-charcoal">Progress Insights</h1>
        <p className="mt-1 text-sm text-charcoal/65">Clinically meaningful tracking across mood, sessions, exercises, and assessment outcomes.</p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Session Completion</p>
          <p className="mt-2 text-3xl font-semibold text-charcoal">{summary.sessionCompletionRate ?? 0}%</p>
          <p className="mt-1 text-xs text-charcoal/55">{summary.completedSessions ?? 0} / {summary.totalSessions ?? 0}</p>
        </article>

        <article className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Exercise Completion</p>
          <p className="mt-2 text-3xl font-semibold text-charcoal">{summary.exerciseCompletionRate ?? 0}%</p>
          <p className="mt-1 text-xs text-charcoal/55">{summary.completedExercises ?? 0} / {summary.totalExercises ?? 0}</p>
        </article>

        <article className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Mood Check-ins</p>
          <p className="mt-2 text-3xl font-semibold text-calm-sage">{summary.moodCheckins ?? 0}</p>
          <p className="mt-1 text-xs text-charcoal/55">
            {moodImprovementPercent >= 0 ? '+' : ''}
            {moodImprovementPercent}% trend change
          </p>
        </article>

        <article className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Assessment Delta</p>
          <p className="mt-2 text-3xl font-semibold text-charcoal">{clinicalDelta.percent}%</p>
          <p className="mt-1 text-xs text-charcoal/55">
            {clinicalDelta.from ?? '—'} → {clinicalDelta.to ?? '—'}
          </p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Session Attendance</p>
          <p className="mt-2 text-2xl font-semibold text-charcoal">{completedSessionsCount}</p>
          <p className="mt-1 text-xs text-charcoal/55">Completed sessions</p>
        </article>
        <article className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Cancellation Load</p>
          <p className="mt-2 text-2xl font-semibold text-charcoal">{cancelledSessionsCount}</p>
          <p className="mt-1 text-xs text-charcoal/55">Cancelled sessions</p>
        </article>
        <article className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Mood Stability</p>
          <p className="mt-2 text-2xl font-semibold text-charcoal">{moodStats?.last7DaysAverage ?? '—'}</p>
          <p className="mt-1 text-xs text-charcoal/55">Last 7 days average</p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft-sm">
          <h2 className="text-base font-semibold text-charcoal">Completion Breakdown</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={completionChart} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="rgba(44, 51, 51, 0.08)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5C6666' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#7C8585' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="Completed" stackId="a" fill="#A8B5A0" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Remaining" stackId="a" fill="#E6ECE3" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft-sm">
          <h2 className="text-base font-semibold text-charcoal">Weekly Mood Trend</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={moodTrend} margin={{ top: 8, right: 8, left: -15, bottom: 0 }}>
                <CartesianGrid stroke="rgba(44, 51, 51, 0.08)" vertical={false} />
                <XAxis dataKey="week" tickFormatter={(value: string) => formatDate(value)} tick={{ fontSize: 11, fill: '#5C6666' }} axisLine={false} tickLine={false} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: '#7C8585' }} axisLine={false} tickLine={false} />
                <Tooltip labelFormatter={(value: string) => `Week of ${formatDate(value)}`} formatter={(value: any) => [value, 'Average mood']} />
                <Line type="monotone" dataKey="averageMood" stroke="#A8B5A0" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-charcoal">Treatment Timeline</h2>
          <p className="text-xs text-charcoal/60">Assessment delta: {progress?.insights?.assessmentScoreDelta ?? 0}</p>
        </div>
        <div className="mt-4 divide-y divide-calm-sage/10">
          {unifiedTimeline.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-charcoal">{item.title}</p>
                <p className="text-xs text-charcoal/55">{formatDate(item.date)}</p>
              </div>
              <span className="rounded-full bg-calm-sage/10 px-2 py-0.5 text-[11px] font-semibold text-calm-sage">{item.type}</span>
            </div>
          ))}
          {!unifiedTimeline.length && <p className="py-4 text-sm text-charcoal/60">No timeline activity available yet.</p>}
        </div>
      </section>
    </div>
  );
}
