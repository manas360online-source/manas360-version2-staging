import { useEffect, useMemo, useState } from 'react';
import { BarChart3, TrendingUp, FileText } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { patientApi } from '../../api/patient';

type Tab = 'insights' | 'plan' | 'reports';

export default function ProgressPage() {
  const [activeTab, setActiveTab] = useState<Tab>('insights');
  const [insights, setInsights] = useState<any>(null);
  const [therapyPlan, setTherapyPlan] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        setLoading(true);

        // Fetch insights
        const insightsRes = await patientApi.getInsights().catch(() => null);
        if (insightsRes) {
          setInsights(insightsRes.data ?? insightsRes);
        }

        // Fetch therapy plan
        const planRes = await patientApi.getTherapyPlan().catch(() => null);
        if (planRes) {
          setTherapyPlan(planRes.data ?? planRes);
        }

        // Fetch reports
        const reportsRes = await patientApi.getReports().catch(() => null);
        if (reportsRes) {
          setReports(Array.isArray(reportsRes.data) ? reportsRes.data : Array.isArray(reportsRes) ? reportsRes : []);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load progress data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-5 pb-20 lg:pb-6">
      {/* Header */}
      <section className="rounded-2xl border border-calm-sage/15 bg-white/90 p-5 shadow-soft-sm">
        <h1 className="font-serif text-3xl font-light md:text-4xl">Your Progress</h1>
        <p className="mt-2 text-sm text-charcoal/70">Track your treatment journey and view analytics.</p>
      </section>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-calm-sage/15">
        <button
          onClick={() => setActiveTab('insights')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
            activeTab === 'insights'
              ? 'border-b-2 border-teal-600 text-teal-600'
              : 'text-charcoal/60 hover:text-charcoal'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Insights
        </button>

        <button
          onClick={() => setActiveTab('plan')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
            activeTab === 'plan'
              ? 'border-b-2 border-teal-600 text-teal-600'
              : 'text-charcoal/60 hover:text-charcoal'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Therapy Plan
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
            activeTab === 'reports'
              ? 'border-b-2 border-teal-600 text-teal-600'
              : 'text-charcoal/60 hover:text-charcoal'
          }`}
        >
          <FileText className="h-4 w-4" />
          Reports
        </button>
      </div>

      {/* Tab Content */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-charcoal/60">Loading...</div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {!loading && !error && activeTab === 'insights' && (
        <InsightsTab insights={insights} />
      )}

      {!loading && !error && activeTab === 'plan' && (
        <TherapyPlanTab plan={therapyPlan} />
      )}

      {!loading && !error && activeTab === 'reports' && (
        <ReportsTab reports={reports} />
      )}
    </div>
  );
}

// ===== INSIGHTS TAB =====
function InsightsTab({ insights }: { insights: any }) {
  const moodTrend = useMemo(() => {
    if (!insights?.moodTrend || !Array.isArray(insights.moodTrend)) return [];
    return insights.moodTrend.slice(-14).map((item: any) => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      mood: item.score || 0,
    }));
  }, [insights]);

  const assessmentScores = useMemo(() => {
    if (!insights?.assessmentTrend || !Array.isArray(insights.assessmentTrend)) return [];
    return insights.assessmentTrend.map((item: any) => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      phq9: item.phq9Score || 0,
      gad7: item.gad7Score || 0,
    }));
  }, [insights]);

  return (
    <div className="space-y-5">
      {/* Metric Cards */}
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard
          label="Mood Progress"
          value={insights?.moodImprovement || 0}
          unit="%"
          trend={insights?.moodTrend ? insights.moodTrend.length > 1 ? '↑' : '→' : '—'}
          trendColor="text-teal-600"
        />
        <MetricCard
          label="Session Attendance"
          value={insights?.sessionAttendance || 0}
          unit="%"
          trend={"✓"}
          trendColor="text-emerald-600"
        />
        <MetricCard
          label="Exercise Completion"
          value={insights?.exerciseCompletion || 0}
          unit="%"
          trend={"✓"}
          trendColor="text-blue-600"
        />
        <MetricCard
          label="Anxiety Reduction"
          value={insights?.anxietyReduction || 0}
          unit="%"
          trend={insights?.anxietyReduction ? '↓' : '—'}
          trendColor="text-rose-600"
        />
      </div>

      {/* Mood Trend Chart */}
      {moodTrend.length > 0 && (
        <div className="rounded-xl border border-calm-sage/15 bg-white/90 p-5">
          <h3 className="font-semibold text-charcoal">Mood Trend (Last 14 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={moodTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis domain={[0, 10]} stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Area type="monotone" dataKey="mood" stroke="#0d9488" fillOpacity={1} fill="url(#colorMood)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Assessment Scores */}
      {assessmentScores.length > 0 && (
        <div className="rounded-xl border border-calm-sage/15 bg-white/90 p-5">
          <h3 className="font-semibold text-charcoal">Assessment Scores Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={assessmentScores} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Line type="monotone" dataKey="phq9" stroke="#f59e0b" strokeWidth={2} name="PHQ-9 (Depression)" />
              <Line type="monotone" dataKey="gad7" stroke="#ef4444" strokeWidth={2} name="GAD-7 (Anxiety)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recommendations */}
      {insights?.recommendations && insights.recommendations.length > 0 && (
        <div className="rounded-xl border border-calm-sage/15 bg-white/90 p-5">
          <h3 className="font-semibold text-charcoal mb-3">AI Recommendations</h3>
          <ul className="space-y-2">
            {insights.recommendations.map((rec: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-charcoal/80">
                <span className="text-teal-600 font-bold">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ===== THERAPY PLAN TAB =====
function TherapyPlanTab({ plan }: { plan: any }) {
  const goals = useMemo(() => {
    if (!plan?.goals || !Array.isArray(plan.goals)) return [];
    return plan.goals;
  }, [plan]);

  const milestones = useMemo(() => {
    if (!plan?.milestones || !Array.isArray(plan.milestones)) return [];
    return plan.milestones;
  }, [plan]);

  return (
    <div className="space-y-5">
      {/* Treatment Overview */}
      <div className="rounded-xl border border-calm-sage/15 bg-white/90 p-5">
        <h3 className="font-semibold text-charcoal mb-2">Treatment Overview</h3>
        <p className="text-sm text-charcoal/70">{plan?.summary || 'No treatment overview available.'}</p>
        {plan?.therapist && (
          <p className="mt-3 text-sm text-charcoal">
            <span className="font-medium">Assigned Therapist:</span> {plan.therapist}
          </p>
        )}
      </div>

      {/* Goals */}
      {goals.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-charcoal">Treatment Goals</h3>
          {goals.map((goal: any, idx: number) => (
            <div key={idx} className="rounded-lg border border-calm-sage/15 bg-white/90 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium text-charcoal">{goal.title}</p>
                  <p className="text-xs text-charcoal/60 mt-1">{goal.description}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3 w-full bg-calm-sage/10 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-teal-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${goal.progress || 0}%` }}
                />
              </div>
              <p className="text-xs text-charcoal/60 mt-1">{goal.progress || 0}% completed</p>
            </div>
          ))}
        </div>
      )}

      {/* Milestones */}
      {milestones.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-charcoal">Next Milestones</h3>
          {milestones.map((milestone: any, idx: number) => (
            <div key={idx} className="rounded-lg border border-calm-sage/15 bg-white/90 p-4 flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 mt-0.5 bg-teal-100 rounded-full flex items-center justify-center text-xs font-bold text-teal-600">
                {idx + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium text-charcoal">{milestone.title}</p>
                <p className="text-xs text-charcoal/60 mt-1">{milestone.description}</p>
                {milestone.dueDate && (
                  <p className="text-xs text-charcoal/50 mt-2">
                    Due: {new Date(milestone.dueDate).toLocaleDateString()}
                  </p>
                )}
              </div>
              {milestone.completed && (
                <span className="text-emerald-600 text-sm font-medium">✓</span>
              )}
            </div>
          ))}
        </div>
      )}

      {goals.length === 0 && milestones.length === 0 && (
        <div className="rounded-lg border border-calm-sage/15 bg-white/90 p-6 text-center">
          <p className="text-sm text-charcoal/60">No therapy plan available yet.</p>
          <p className="text-xs text-charcoal/50 mt-1">Your therapist will create one after your first session.</p>
        </div>
      )}
    </div>
  );
}

// ===== REPORTS TAB =====
function ReportsTab({ reports }: { reports: any[] }) {
  return (
    <div className="space-y-3">
      {reports.length > 0 ? (
        reports.map((report: any, idx: number) => (
          <div key={idx} className="rounded-lg border border-calm-sage/15 bg-white/90 p-4 hover:border-teal-200 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h4 className="font-medium text-charcoal">{report.title || report.type}</h4>
                <p className="text-xs text-charcoal/60 mt-1">
                  {new Date(report.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                {report.providerName && (
                  <p className="text-xs text-charcoal/60 mt-1">by {report.providerName}</p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button className="px-3 py-2 text-xs font-medium rounded-lg border border-teal-200 text-teal-600 hover:bg-teal-50 transition-colors">
                  View
                </button>
                <button className="px-3 py-2 text-xs font-medium rounded-lg border border-calm-sage/25 text-charcoal/60 hover:text-charcoal hover:border-calm-sage/50 transition-colors">
                  Download
                </button>
              </div>
            </div>
            {report.summary && (
              <p className="text-xs text-charcoal/70 mt-3">{report.summary}</p>
            )}
          </div>
        ))
      ) : (
        <div className="rounded-lg border border-calm-sage/15 bg-white/90 p-6 text-center">
          <p className="text-sm text-charcoal/60">No reports available yet.</p>
          <p className="text-xs text-charcoal/50 mt-1">Reports will appear after your therapist completes session notes.</p>
        </div>
      )}
    </div>
  );
}

// ===== HELPER COMPONENTS =====
function MetricCard({
  label,
  value,
  unit,
  trend,
  trendColor,
}: {
  label: string;
  value: number;
  unit: string;
  trend: string;
  trendColor: string;
}) {
  return (
    <div className="rounded-lg border border-calm-sage/15 bg-white/90 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-charcoal/60">{label}</p>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-charcoal">{value}</span>
        <span className="text-sm text-charcoal/60">{unit}</span>
      </div>
      <p className={`text-sm font-medium mt-2 ${trendColor}`}>{trend}</p>
    </div>
  );
}
