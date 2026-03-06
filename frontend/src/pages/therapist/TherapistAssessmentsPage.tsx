import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { therapistApi, type TherapistAssessmentItem } from '../../api/therapist.api';
import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import { TherapistErrorState, TherapistLoadingState } from '../../components/therapist/dashboard/TherapistDataState';
import TherapistModeGate from '../../components/therapist/dashboard/TherapistModeGate';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';

type AssessmentType = 'PHQ-9' | 'GAD-7' | 'Stress Score' | 'Custom Assessment';

export default function TherapistAssessmentsPage() {
  const { dashboardMode } = useProviderDashboardContext();
  const [rows, setRows] = useState<TherapistAssessmentItem[]>([]);
  const [type, setType] = useState<AssessmentType>('PHQ-9');
  const [patient, setPatient] = useState('');
  const [score, setScore] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await therapistApi.getAssessments();
      setRows(res.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    const p = patient.trim();
    const s = Number(score);
    if (!p || !Number.isFinite(s)) return;

    setSaving(true);
    setError(null);
    try {
      await therapistApi.createAssessment({
        type,
        patient: p,
        score: s,
      });
      setPatient('');
      setScore('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assessment');
    } finally {
      setSaving(false);
    }
  };

  const trendData = useMemo(() => {
    const grouped = new Map<string, number[]>();
    for (const row of rows) {
      const key = row.type;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)?.push(row.score);
    }

    return Array.from(grouped.entries()).map(([label, list]) => {
      const avg = list.reduce((acc, item) => acc + item, 0) / list.length;
      return { label, avg };
    });
  }, [rows]);

  return (
    <TherapistPageShell title="Assessments" subtitle="Manage PHQ-9, GAD-7, stress, and custom assessments with assignment and trend tracking.">
      {dashboardMode !== 'professional' ? (
        <TherapistModeGate
          requiredMode="professional"
          title="Assessments Available in Professional Mode"
          description="Assessment assignment and trend review are available only in Professional Mode."
        />
      ) : null}

      {dashboardMode === 'professional' ? (
        <>
          {loading ? <TherapistLoadingState title="Loading assessments" description="Fetching assessment records from backend." /> : null}
          {error ? <TherapistErrorState title="Assessment action failed" description={error} onRetry={() => void load()} /> : null}

          <TherapistCard className="p-5">
            <h3 className="font-display text-base font-bold text-ink-800">Assign Assessment</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <select value={type} onChange={(event) => setType(event.target.value as AssessmentType)} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0">
                <option>PHQ-9</option>
                <option>GAD-7</option>
                <option>Stress Score</option>
                <option>Custom Assessment</option>
              </select>
              <input value={patient} onChange={(event) => setPatient(event.target.value)} placeholder="Patient name" className="rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0" />
              <input value={score} onChange={(event) => setScore(event.target.value)} placeholder="Score" className="rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0" />
              <TherapistButton onClick={create}><Plus className="h-4 w-4" />{saving ? 'Saving...' : 'Assign'}</TherapistButton>
            </div>
          </TherapistCard>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <TherapistCard className="p-5 xl:col-span-2">
              <h3 className="mb-3 font-display text-base font-bold text-ink-800">Assessment Results</h3>
              <div className="space-y-2">
                {rows.map((row) => (
                  <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-100 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-ink-800">{row.patient}</p>
                      <p className="text-xs text-ink-500">{row.type} · {row.date}</p>
                    </div>
                    <TherapistBadge label={`Score ${row.score}`} variant={row.score >= 15 ? 'danger' : row.score >= 10 ? 'warning' : 'success'} />
                  </div>
                ))}
              </div>
            </TherapistCard>

            <TherapistCard className="p-5">
              <h3 className="mb-3 font-display text-base font-bold text-ink-800">Trend Chart (Average)</h3>
              <div className="space-y-3">
                {trendData.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-xs text-ink-600">
                      <span>{item.label}</span>
                      <span>{item.avg.toFixed(1)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-ink-100">
                      <div className="h-2 rounded-full bg-sage-500" style={{ width: `${Math.max(5, Math.min(100, item.avg * 5))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </TherapistCard>
          </section>
        </>
      ) : null}
    </TherapistPageShell>
  );
}
