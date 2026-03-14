import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { patientApi } from '../../api/patient';

type ProgressTab = 'mood' | 'clinical' | 'habits';
type ClinicalFilter = 'all' | 'phq' | 'gad';
type TimeRangeFilter = '1m' | '3m' | '6m' | '1y';

const asPayload = <T,>(value: any): T => (value?.data ?? value) as T;

const moodLabelMap: Record<number, string> = {
  1: 'Awful',
  2: 'Sad',
  3: 'Okay',
  4: 'Good',
  5: 'Great',
};

const tabs: Array<{ key: ProgressTab; label: string }> = [
  { key: 'mood', label: 'Mood & Wellness' },
  { key: 'clinical', label: 'Clinical Scores' },
  { key: 'habits', label: 'Habits & Effort' },
];

const parseDate = (value: unknown): Date | null => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDay = (value: unknown) => {
  const date = parseDate(value);
  if (!date) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const getActiveTab = (raw: string | null): ProgressTab => {
  if (raw === 'clinical') return 'clinical';
  if (raw === 'habits') return 'habits';
  return 'mood';
};

const startOfWeek = (date: Date) => {
  const cloned = new Date(date);
  const day = cloned.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  cloned.setDate(cloned.getDate() + diff);
  cloned.setHours(0, 0, 0, 0);
  return cloned;
};

const weekKey = (date: Date) => {
  const weekStart = startOfWeek(date);
  return `${weekStart.getFullYear()}-${weekStart.getMonth() + 1}-${weekStart.getDate()}`;
};

function MetricCard({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return (
    <article className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm">
      <p className="text-xs uppercase tracking-[0.14em] text-charcoal/45">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-charcoal">{value}</p>
      <p className="mt-1 text-xs text-charcoal/58">{helper}</p>
    </article>
  );
}

function MoodTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload || {};
  return (
    <div className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-xs shadow-soft-md">
      <p className="font-semibold text-charcoal">{label}</p>
      <p className="mt-1 text-charcoal/75">Mood: {point.mood}/5</p>
      <p className="text-charcoal/75">Triggers: {point.tagsLabel || 'None logged'}</p>
    </div>
  );
}

export default function ProgressPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = getActiveTab(searchParams.get('tab'));
  const clinicalFilter = (searchParams.get('clinicalType') || 'all') as ClinicalFilter;
  const timeRange = (searchParams.get('timeRange') || '3m') as TimeRangeFilter;

  const moodQuery = useQuery(['my-progress', 'mood'], async () => {
    const [historyRes, statsRes] = await Promise.all([
      patientApi.getMoodHistoryV2().catch(() => []),
      patientApi.getMoodStats().catch(() => null),
    ]);
    return {
      history: asPayload<any[]>(historyRes) || [],
      stats: asPayload<any>(statsRes) || {},
    };
  });

  const clinicalQuery = useQuery(
    ['my-progress', 'clinical'],
    async () => {
      const [historyRes, insightsRes] = await Promise.all([
        patientApi.getStructuredAssessmentHistory().catch(() => []),
        patientApi.getInsights().catch(() => null),
      ]);
      return {
        structured: asPayload<any[]>(historyRes) || [],
        insights: asPayload<any>(insightsRes) || {},
      };
    },
    { enabled: activeTab === 'clinical' },
  );

  const habitsQuery = useQuery(
    ['my-progress', 'habits'],
    async () => {
      const [progressRes, sessionsRes, exercisesRes, moodHistoryRes] = await Promise.all([
        patientApi.getProgress().catch(() => null),
        patientApi.getSessionHistory().catch(() => []),
        patientApi.getExercises().catch(() => []),
        patientApi.getMoodHistoryV2().catch(() => []),
      ]);
      return {
        progress: asPayload<any>(progressRes) || {},
        sessions: asPayload<any[]>(sessionsRes) || [],
        exercises: asPayload<any[]>(exercisesRes) || [],
        moodHistory: asPayload<any[]>(moodHistoryRes) || [],
      };
    },
    { enabled: activeTab === 'habits' },
  );

  const moodHistory = useMemo(() => {
    const rows = Array.isArray(moodQuery.data?.history) ? moodQuery.data?.history : [];
    return rows
      .map((entry: any) => {
        const date = parseDate(entry?.createdAt || entry?.date);
        if (!date) return null;
        const mood = Number(entry?.mood || 0);
        const tags = Array.isArray(entry?.metadata?.tags) ? entry.metadata.tags : [];
        return {
          date,
          mood,
          tags,
          energy: entry?.metadata?.energy,
          sleepHours: entry?.metadata?.sleepHours,
        };
      })
      .filter(Boolean) as Array<{ date: Date; mood: number; tags: string[]; energy?: string; sleepHours?: string }>;
  }, [moodQuery.data?.history]);

  const moodChartData = useMemo(() => {
    return moodHistory
      .slice()
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-14)
      .map((item) => ({
        dateLabel: item.date.toLocaleDateString(undefined, { weekday: 'short' }),
        mood: item.mood,
        tagsLabel: item.tags.length ? item.tags.join(', ') : 'None',
      }));
  }, [moodHistory]);

  const weeklyAverageMood = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const rows = moodHistory.filter((item) => item.date >= cutoff);
    if (!rows.length) return 0;
    return Number((rows.reduce((sum, item) => sum + item.mood, 0) / rows.length).toFixed(1));
  }, [moodHistory]);

  const topEmotion = useMemo(() => {
    const frequency: Record<string, number> = {};
    for (const item of moodHistory) {
      const moodName = moodLabelMap[item.mood] || 'Unrated';
      frequency[moodName] = (frequency[moodName] || 0) + 1;
    }
    const winner = Object.entries(frequency).sort((a, b) => b[1] - a[1])[0];
    return winner?.[0] || '—';
  }, [moodHistory]);

  const topTrigger = useMemo(() => {
    const frequency: Record<string, number> = {};
    for (const item of moodHistory) {
      for (const tag of item.tags) {
        const normalized = String(tag || '').trim();
        if (!normalized) continue;
        frequency[normalized] = (frequency[normalized] || 0) + 1;
      }
    }
    const winner = Object.entries(frequency).sort((a, b) => b[1] - a[1])[0];
    return winner?.[0] || '—';
  }, [moodHistory]);

  const aiMoodInsight = useMemo(() => {
    const statsInsights = Array.isArray(moodQuery.data?.stats?.insights) ? moodQuery.data?.stats?.insights : [];
    if (statsInsights.length) return statsInsights[0];
    if (moodChartData.length < 3) return 'Keep checking in daily. Your recovery story becomes clearer as we gather more trend points.';
    const minPoint = moodChartData.reduce((acc, row) => (row.mood < acc.mood ? row : acc), moodChartData[0]);
    const maxPoint = moodChartData.reduce((acc, row) => (row.mood > acc.mood ? row : acc), moodChartData[0]);
    return `Your recent low point appeared on ${minPoint.dateLabel}, while your strongest day was ${maxPoint.dateLabel}. Keep using Daily Check-in context to stabilize the week.`;
  }, [moodChartData, moodQuery.data?.stats?.insights]);

  const clinicalRows = useMemo(() => {
    const structured = Array.isArray(clinicalQuery.data?.structured) ? clinicalQuery.data?.structured : [];
    return structured
      .map((item: any) => {
        const key = String(item?.templateKey || item?.template?.key || '').toLowerCase();
        const type = key.includes('phq-9') ? 'PHQ-9' : key.includes('gad-7') ? 'GAD-7' : String(item?.templateTitle || 'Assessment');
        const date = parseDate(item?.submittedAt || item?.createdAt);
        if (!date) return null;
        return {
          attemptId: item?.attemptId,
          date,
          dateLabel: formatDay(item?.submittedAt || item?.createdAt),
          type,
          score: Number(item?.totalScore || 0),
          severity: String(item?.severityLevel || 'Unknown'),
          interpretation: String(item?.interpretation || ''),
        };
      })
      .filter(Boolean) as Array<{ attemptId?: string; date: Date; dateLabel: string; type: string; score: number; severity: string; interpretation: string }>;
  }, [clinicalQuery.data?.structured]);

  const filteredClinicalRows = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    if (timeRange === '1m') cutoff.setMonth(now.getMonth() - 1);
    if (timeRange === '3m') cutoff.setMonth(now.getMonth() - 3);
    if (timeRange === '6m') cutoff.setMonth(now.getMonth() - 6);
    if (timeRange === '1y') cutoff.setFullYear(now.getFullYear() - 1);

    return clinicalRows
      .filter((row) => row.date >= cutoff)
      .filter((row) => {
        if (clinicalFilter === 'all') return true;
        if (clinicalFilter === 'phq') return row.type === 'PHQ-9';
        if (clinicalFilter === 'gad') return row.type === 'GAD-7';
        return true;
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [clinicalRows, clinicalFilter, timeRange]);

  const clinicalChartData = useMemo(() => {
    const byDate: Record<string, { label: string; phq9?: number; gad7?: number }> = {};
    for (const row of filteredClinicalRows) {
      const key = row.date.toISOString().slice(0, 10);
      if (!byDate[key]) {
        byDate[key] = { label: row.dateLabel };
      }
      if (row.type === 'PHQ-9') byDate[key].phq9 = row.score;
      if (row.type === 'GAD-7') byDate[key].gad7 = row.score;
    }
    return Object.values(byDate);
  }, [filteredClinicalRows]);

  const recentClinicalRows = useMemo(() => {
    return filteredClinicalRows.slice().sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8);
  }, [filteredClinicalRows]);

  const habitsStats = useMemo(() => {
    const sessions = Array.isArray(habitsQuery.data?.sessions) ? habitsQuery.data?.sessions : [];
    const exercises = Array.isArray(habitsQuery.data?.exercises) ? habitsQuery.data?.exercises : [];

    const exercisesCompleted = exercises.filter((item: any) => String(item?.status || '').toLowerCase() === 'completed').length;
    const audioMinutesListened = exercises
      .filter((item: any) => String(item?.assignedBy || '').startsWith('WELLNESS_LIBRARY:AUDIO'))
      .reduce((sum: number, item: any) => sum + Number(item?.duration || 0), 0);
    const sessionsAttended = sessions.filter((item: any) => String(item?.status || '').toLowerCase() === 'completed').length;

    return { exercisesCompleted, audioMinutesListened, sessionsAttended };
  }, [habitsQuery.data?.sessions, habitsQuery.data?.exercises]);

  const correlationData = useMemo(() => {
    const exercises = Array.isArray(habitsQuery.data?.exercises) ? habitsQuery.data?.exercises : [];
    const moodRows = Array.isArray(habitsQuery.data?.moodHistory) ? habitsQuery.data?.moodHistory : [];

    const weeklyExerciseCount: Record<string, number> = {};
    for (const row of exercises) {
      if (String(row?.status || '').toLowerCase() !== 'completed') continue;
      const date = parseDate(row?.createdAt);
      if (!date) continue;
      const key = weekKey(date);
      weeklyExerciseCount[key] = (weeklyExerciseCount[key] || 0) + 1;
    }

    const weeklyMood: Record<string, { total: number; count: number }> = {};
    for (const row of moodRows) {
      const mood = Number(row?.mood || 0);
      if (!mood) continue;
      const date = parseDate(row?.createdAt || row?.date);
      if (!date) continue;
      const key = weekKey(date);
      if (!weeklyMood[key]) weeklyMood[key] = { total: 0, count: 0 };
      weeklyMood[key].total += mood;
      weeklyMood[key].count += 1;
    }

    const weekKeys = Array.from(new Set([...Object.keys(weeklyExerciseCount), ...Object.keys(weeklyMood)]));
    let highMoodTotal = 0;
    let highMoodCount = 0;
    let lowMoodTotal = 0;
    let lowMoodCount = 0;

    for (const key of weekKeys) {
      const exerciseCount = weeklyExerciseCount[key] || 0;
      const mood = weeklyMood[key];
      if (!mood?.count) continue;
      const avgMood = mood.total / mood.count;
      if (exerciseCount >= 2) {
        highMoodTotal += avgMood;
        highMoodCount += 1;
      } else {
        lowMoodTotal += avgMood;
        lowMoodCount += 1;
      }
    }

    return [
      {
        name: 'High Completion Weeks',
        mood: highMoodCount ? Number((highMoodTotal / highMoodCount).toFixed(2)) : 0,
      },
      {
        name: 'Low Completion Weeks',
        mood: lowMoodCount ? Number((lowMoodTotal / lowMoodCount).toFixed(2)) : 0,
      },
    ];
  }, [habitsQuery.data?.exercises, habitsQuery.data?.moodHistory]);

  const setTab = (tab: ProgressTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const setClinicalFilter = (type: ClinicalFilter) => {
    const next = new URLSearchParams(searchParams);
    next.set('clinicalType', type);
    setSearchParams(next, { replace: true });
  };

  const setTimeRange = (range: TimeRangeFilter) => {
    const next = new URLSearchParams(searchParams);
    next.set('timeRange', range);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 pb-20 lg:pb-8">
      <section className="rounded-3xl border border-ink-100 bg-white/90 p-6 shadow-soft-sm">
        <h1 className="text-3xl font-semibold text-charcoal md:text-4xl">My Progress</h1>
        <p className="mt-2 text-sm text-charcoal/68">Track your emotional wellbeing, clinical growth, and daily habits.</p>

        <div className="mt-5 flex gap-2 overflow-x-auto border-b border-ink-100 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTab(tab.key)}
              className={`shrink-0 rounded-t-xl px-4 py-3 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? 'border-b-2 border-calm-sage text-calm-sage'
                  : 'text-charcoal/60 hover:text-charcoal'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'mood' && (
        <div className="space-y-6">
          {moodQuery.isLoading && <div className="rounded-2xl border border-ink-100 bg-white p-5">Loading mood and wellness data...</div>}
          {!!moodQuery.error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Unable to load mood insights right now.</div>}

          {!moodQuery.isLoading && !moodQuery.error && (
            <>
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Average Mood (This Week)" value={weeklyAverageMood || '—'} helper="Daily Check-in average" />
                <MetricCard label="Current Streak" value={moodQuery.data?.stats?.currentStreak ?? 0} helper="Consecutive check-in days" />
                <MetricCard label="Top Emotion" value={topEmotion} helper="Most frequent mood label" />
                <MetricCard label="Top Trigger" value={topTrigger} helper="Most tagged context" />
              </section>

              <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft-sm">
                <h2 className="text-lg font-semibold text-charcoal">Mood Trend</h2>
                <p className="mt-1 text-sm text-charcoal/62">Daily Check-in scores with trigger context.</p>
                <div className="mt-5 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={moodChartData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="myProgressMoodGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7ea695" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#7ea695" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(38,51,51,0.08)" vertical={false} />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 12, fill: '#5f6b6b' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: '#7c8686' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<MoodTooltip />} />
                      <Area type="monotone" dataKey="mood" stroke="#7ea695" strokeWidth={3} fill="url(#myProgressMoodGradient)" fillOpacity={1} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-2xl border border-calm-sage/25 bg-gradient-to-r from-[#edf4f1] to-[#f8f5ee] p-5 shadow-soft-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-calm-sage">Anytime Buddy Insight</p>
                <p className="mt-2 text-sm leading-6 text-charcoal/78">{aiMoodInsight}</p>
              </section>
            </>
          )}
        </div>
      )}

      {activeTab === 'clinical' && (
        <div className="space-y-6">
          {clinicalQuery.isLoading && <div className="rounded-2xl border border-ink-100 bg-white p-5">Loading clinical score history...</div>}
          {!!clinicalQuery.error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Unable to load clinical analytics right now.</div>}

          {!clinicalQuery.isLoading && !clinicalQuery.error && (
            <>
              <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft-sm">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold text-charcoal">Assessment Type</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[
                        { value: 'all', label: 'All' },
                        { value: 'phq', label: 'PHQ-9' },
                        { value: 'gad', label: 'GAD-7' },
                      ].map((pill) => (
                        <button
                          key={pill.value}
                          type="button"
                          onClick={() => setClinicalFilter(pill.value as ClinicalFilter)}
                          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                            clinicalFilter === pill.value
                              ? 'bg-calm-sage text-white'
                              : 'bg-[#f2f6f4] text-charcoal/70 hover:bg-[#e7efe9]'
                          }`}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-charcoal">Time Range</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[
                        { value: '1m', label: '1 Month' },
                        { value: '3m', label: '3 Months' },
                        { value: '6m', label: '6 Months' },
                        { value: '1y', label: '1 Year' },
                      ].map((pill) => (
                        <button
                          key={pill.value}
                          type="button"
                          onClick={() => setTimeRange(pill.value as TimeRangeFilter)}
                          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                            timeRange === pill.value
                              ? 'bg-charcoal text-white'
                              : 'bg-[#f2f6f4] text-charcoal/70 hover:bg-[#e7efe9]'
                          }`}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft-sm">
                <h2 className="text-lg font-semibold text-charcoal">PHQ-9 & GAD-7 Score Timeline</h2>
                <p className="mt-1 text-sm text-charcoal/62">Severity zones are shaded so score interpretation is instant.</p>
                <div className="mt-5 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={clinicalChartData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(38,51,51,0.08)" vertical={false} />
                      <ReferenceArea y1={0} y2={4} fill="#2f9e4418" ifOverflow="extendDomain" />
                      <ReferenceArea y1={5} y2={9} fill="#f0b42916" ifOverflow="extendDomain" />
                      <ReferenceArea y1={10} y2={14} fill="#f08f2414" ifOverflow="extendDomain" />
                      <ReferenceArea y1={15} y2={27} fill="#df475914" ifOverflow="extendDomain" />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#5f6b6b' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 27]} tick={{ fontSize: 11, fill: '#7c8686' }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="phq9" name="PHQ-9" stroke="#d97706" strokeWidth={3} dot={{ r: 3 }} connectNulls />
                      <Line type="monotone" dataKey="gad7" name="GAD-7" stroke="#dc2626" strokeWidth={3} dot={{ r: 3 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft-sm">
                <h3 className="text-base font-semibold text-charcoal">Recent Clinical Scores</h3>
                <div className="mt-4 space-y-3">
                  {recentClinicalRows.map((row, index) => (
                    <div key={`${row.attemptId || row.date.getTime()}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 px-3 py-3">
                      <div>
                        <p className="text-sm font-semibold text-charcoal">{row.type} • {row.score}</p>
                        <p className="text-xs text-charcoal/58">{row.dateLabel} • {row.severity}</p>
                      </div>
                      <Link
                        to="/patient/assessments"
                        className="rounded-full border border-calm-sage/30 px-3 py-2 text-xs font-semibold text-calm-sage hover:bg-calm-sage/10"
                      >
                        View Full Breakdown
                      </Link>
                    </div>
                  ))}
                  {!recentClinicalRows.length && <p className="text-sm text-charcoal/60">No clinical score history available for the selected filters.</p>}
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {activeTab === 'habits' && (
        <div className="space-y-6">
          {habitsQuery.isLoading && <div className="rounded-2xl border border-ink-100 bg-white p-5">Loading habits and adherence analytics...</div>}
          {!!habitsQuery.error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Unable to load habits and effort analytics right now.</div>}

          {!habitsQuery.isLoading && !habitsQuery.error && (
            <>
              <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <MetricCard label="Exercises Completed" value={habitsStats.exercisesCompleted} helper="Completed CBT and wellness actions" />
                <MetricCard label="Audio Minutes Listened" value={`${habitsStats.audioMinutesListened} mins`} helper="From Wellness Library audio sessions" />
                <MetricCard label="Sessions Attended" value={habitsStats.sessionsAttended} helper="Completed therapist sessions" />
              </section>

              <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft-sm">
                <h2 className="text-lg font-semibold text-charcoal">Correlation: Exercise Completion vs Average Mood</h2>
                <p className="mt-1 text-sm text-charcoal/62">This visual compares mood between weeks with stronger action adherence and weeks with lighter activity.</p>
                <div className="mt-5 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={correlationData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(38,51,51,0.08)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#5f6b6b' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#7c8686' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value: any) => [`${value}/5`, 'Average Mood']} />
                      <Bar dataKey="mood" fill="#7ea695" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-2xl border border-calm-sage/25 bg-gradient-to-r from-[#edf4f1] to-[#f8f5ee] p-5 shadow-soft-sm">
                <p className="text-sm text-charcoal/80">
                  The recovery story is clearest when effort is visible. Keep closing your planned exercises and wellness sessions to reinforce the gains shown in your mood trend.
                </p>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
