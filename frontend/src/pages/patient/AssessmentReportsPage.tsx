import { useEffect, useState, useMemo } from 'react';
import { patientApi } from '../../api/patient';
import { BarChart3, LineChart as LineChartIcon, TrendingUp, Calendar, Filter } from 'lucide-react';

interface AssessmentEntry {
  id: string;
  type: string;
  score: number;
  maxScore: number;
  level: 'mild' | 'moderate' | 'severe';
  date: string;
  createdAt?: string;
  answers?: Record<string, number>;
}

export default function AssessmentReportsPage() {
  const [assessments, setAssessments] = useState<AssessmentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'quick' | 'clinical' | 'daily'>('all');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    const loadAssessments = async () => {
      setLoading(true);
      try {
        // Fetch from mood history (generic assessment tracking)
        const response = await patientApi.getMoodHistory();
        const payload: any = response as any;
        
        // Transform mood history into assessment entries
        const transformed: AssessmentEntry[] = (payload || []).map((entry: any) => ({
          id: entry.id || `mood-${entry.date || Date.now()}`,
          type: entry.type || 'Mood Check',
          score: entry.mood || entry.score || 0,
          maxScore: 10,
          level: (entry.level || 'mild') as 'mild' | 'moderate' | 'severe',
          date: entry.date || new Date().toLocaleDateString(),
          createdAt: entry.createdAt || new Date().toISOString(),
        }));

        setAssessments(transformed);
      } catch (error) {
        console.error('Failed to load assessments:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadAssessments();
  }, []);

  // Filter assessments
  const filteredAssessments = useMemo(() => {
    let filtered = assessments;

    if (selectedFilter !== 'all') {
      filtered = filtered.filter((a) => a.type.toLowerCase().includes(selectedFilter.toLowerCase()));
    }

    // Filter by time range
    const now = new Date();
    const cutoffDate = new Date();
    if (timeRange === 'week') {
      cutoffDate.setDate(now.getDate() - 7);
    } else if (timeRange === 'month') {
      cutoffDate.setMonth(now.getMonth() - 1);
    } else if (timeRange === 'year') {
      cutoffDate.setFullYear(now.getFullYear() - 1);
    }

    filtered = filtered.filter((a) => {
      const date = new Date(a.createdAt || a.date);
      return date >= cutoffDate;
    });

    return filtered;
  }, [assessments, selectedFilter, timeRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (filteredAssessments.length === 0) {
      return {
        totalAssessments: 0,
        avgScore: 0,
        severeCount: 0,
        moderateCount: 0,
        mildCount: 0,
        trend: 'stable',
      };
    }

    const scores = filteredAssessments.map((a) => a.score);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    // Calculate trend
    const recent = scores.slice(0, Math.ceil(scores.length / 3));
    const older = scores.slice(Math.ceil(scores.length / 2));
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;
    const trend = recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable';

    return {
      totalAssessments: filteredAssessments.length,
      avgScore,
      severeCount: filteredAssessments.filter((a) => a.level === 'severe').length,
      moderateCount: filteredAssessments.filter((a) => a.level === 'moderate').length,
      mildCount: filteredAssessments.filter((a) => a.level === 'mild').length,
      trend,
    };
  }, [filteredAssessments]);

  // Generate trend chart data
  const chartData = useMemo(() => {
    return filteredAssessments
      .slice()
      .reverse()
      .slice(0, 14)
      .map((a, idx) => ({
        label: idx % 2 === 0 ? a.date : '',
        score: a.score,
        max: a.maxScore,
      }));
  }, [filteredAssessments]);

  const severityBreakdown = [
    { label: 'Severe', count: stats.severeCount, color: 'bg-red-500' },
    { label: 'Moderate', count: stats.moderateCount, color: 'bg-amber-500' },
    { label: 'Mild', count: stats.mildCount, color: 'bg-green-500' },
  ];

  return (
    <div className="space-y-5 pb-20 lg:pb-6">
      <h1 className="font-serif text-3xl font-light md:text-4xl">Assessment Reports & Analytics</h1>
      <p className="text-sm text-charcoal/65">Track your assessment progress and identify patterns over time.</p>

      {/* Filters */}
      <section className="rounded-2xl border border-calm-sage/15 bg-white/85 p-4 shadow-soft-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              <Filter className="inline h-4 w-4 mr-1" />
              Assessment Type
            </label>
            <div className="flex flex-wrap gap-2">
              {['all', 'quick', 'clinical', 'daily'].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedFilter(type as typeof selectedFilter)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    selectedFilter === type
                      ? 'bg-calm-sage text-white'
                      : 'bg-calm-sage/10 text-charcoal hover:bg-calm-sage/20'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Time Range
            </label>
            <div className="flex flex-wrap gap-2">
              {['week', 'month', 'year'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range as typeof timeRange)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    timeRange === range
                      ? 'bg-calm-sage text-white'
                      : 'bg-calm-sage/10 text-charcoal hover:bg-calm-sage/20'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-charcoal/60">Loading assessment data...</p>
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="rounded-2xl border border-calm-sage/15 bg-white/85 p-8 text-center">
          <p className="text-charcoal/60">No assessments found for the selected filters.</p>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-calm-sage/15 bg-white/85 p-4 shadow-soft-sm">
              <p className="text-xs text-charcoal/60 uppercase tracking-wide">Total Assessments</p>
              <p className="mt-2 text-3xl font-semibold text-charcoal">{stats.totalAssessments}</p>
              <p className="mt-1 text-xs text-calm-sage">Last {timeRange}</p>
            </div>

            <div className="rounded-2xl border border-calm-sage/15 bg-white/85 p-4 shadow-soft-sm">
              <p className="text-xs text-charcoal/60 uppercase tracking-wide">Average Score</p>
              <p className="mt-2 text-3xl font-semibold text-charcoal">{stats.avgScore}</p>
              <p className="mt-1 text-xs text-calm-sage">out of 10-27</p>
            </div>

            <div className="rounded-2xl border border-calm-sage/15 bg-white/85 p-4 shadow-soft-sm">
              <p className="text-xs text-charcoal/60 uppercase tracking-wide">Trend</p>
              <p className="mt-2 flex items-center gap-2">
                {stats.trend === 'improving' && <span className="text-2xl text-green-500">📈</span>}
                {stats.trend === 'declining' && <span className="text-2xl text-red-500">📉</span>}
                {stats.trend === 'stable' && <span className="text-2xl text-amber-500">➡️</span>}
                <span className="text-lg font-semibold text-charcoal capitalize">{stats.trend}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-calm-sage/15 bg-white/85 p-4 shadow-soft-sm">
              <p className="text-xs text-charcoal/60 uppercase tracking-wide">Overall Status</p>
              <div className="mt-2 space-y-1">
                {severityBreakdown.map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs text-charcoal">{item.label}</span>
                    <span className="text-sm font-semibold text-charcoal">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Chart: Score Trend */}
          <section className="rounded-2xl border border-calm-sage/15 bg-white/85 p-5 shadow-soft-sm">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <LineChartIcon className="h-5 w-5 text-calm-sage" />
              Score Trend (Last 14 Assessments)
            </h2>
            <div className="mt-4">
              <div className="flex h-32 items-end justify-between gap-1.5">
                {chartData.map((data, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-calm-sage to-calm-sage/60"
                      style={{
                        height: `${Math.max(10, (data.score / data.max) * 120)}px`,
                        minWidth: '4px',
                      }}
                    />
                    {data.label && <span className="text-xs text-charcoal/60 text-center truncate max-w-full">{data.label}</span>}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Severity Breakdown */}
          <section className="rounded-2xl border border-calm-sage/15 bg-white/85 p-5 shadow-soft-sm">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="h-5 w-5 text-calm-sage" />
              Severity Breakdown
            </h2>
            <div className="mt-4 space-y-3">
              {severityBreakdown.map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-charcoal">{item.label}</span>
                    <span className="font-semibold text-charcoal">
                      {item.count} ({Math.round((item.count / stats.totalAssessments) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-charcoal/10 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${item.color}`}
                      style={{ width: `${(item.count / stats.totalAssessments) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Assessments Table */}
          <section className="rounded-2xl border border-calm-sage/15 bg-white/85 p-5 shadow-soft-sm">
            <h2 className="flex items-center gap-2 text-base font-semibold mb-4">
              <TrendingUp className="h-5 w-5 text-calm-sage" />
              Recent Assessments
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-calm-sage/15">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-charcoal/70">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-charcoal/70">Type</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-charcoal/70">Score</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-charcoal/70">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssessments.slice(0, 10).map((assessment, idx) => (
                    <tr key={assessment.id || idx} className="border-b border-calm-sage/10 hover:bg-calm-sage/5">
                      <td className="px-3 py-3 text-charcoal">{assessment.date}</td>
                      <td className="px-3 py-3 text-charcoal font-medium">{assessment.type}</td>
                      <td className="px-3 py-3 text-right font-semibold text-charcoal">
                        {assessment.score}/{assessment.maxScore}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            assessment.level === 'severe'
                              ? 'bg-red-100 text-red-700'
                              : assessment.level === 'moderate'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {assessment.level.charAt(0).toUpperCase() + assessment.level.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recommendations */}
          <section className="rounded-2xl border border-calm-sage/15 bg-white/85 p-5 shadow-soft-sm">
            <h2 className="text-base font-semibold mb-3">Insights & Recommendations</h2>
            <div className="space-y-3">
              {stats.trend === 'improving' && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                  <p className="text-sm text-green-900">
                    ✓ <strong>Great progress!</strong> Your overall wellbeing is trending upward. Continue with your current approach.
                  </p>
                </div>
              )}
              {stats.trend === 'declining' && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-900">
                    ⚠ <strong>Attention needed:</strong> Your scores are declining. Consider scheduling a session with your therapist.
                  </p>
                </div>
              )}
              {stats.trend === 'stable' && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="text-sm text-amber-900">
                    ➡ <strong>Status quo:</strong> Your wellbeing is stable. Consistency is key to improvement.
                  </p>
                </div>
              )}

              {stats.severeCount > 0 && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-900">
                    ⚠ <strong>High severity noted:</strong> {stats.severeCount} assessment(s) show severe levels. Please reach out to your care team.
                  </p>
                </div>
              )}

              <div className="rounded-lg bg-calm-sage/10 border border-calm-sage/20 p-3">
                <p className="text-sm text-charcoal font-medium">Next Steps:</p>
                <ul className="mt-2 space-y-1 text-sm text-charcoal/75">
                  <li>• Continue daily or weekly assessments to track patterns</li>
                  <li>• Share this report with your therapist</li>
                  <li>• Practice recommended exercises from your therapy plan</li>
                </ul>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
