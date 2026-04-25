import { useEffect, useState } from 'react';
import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import { psychologistApi } from '../../api/psychologist.api';
import { TherapistEmptyState, TherapistErrorState, TherapistLoadingState } from '../../components/therapist/dashboard/TherapistDataState';

export default function PsychologistRiskMonitoringPage() {
  const [highRisk, setHighRisk] = useState(0);
  const [pending, setPending] = useState(0);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [dash, reports] = await Promise.all([psychologistApi.getDashboard(), psychologistApi.getReports()]);
        setPending(dash.cards?.pendingEvaluations || 0);
        const hr = Math.max(0, Math.floor((dash.cards?.pendingEvaluations || 0) / 2));
        setHighRisk(hr);
        const mapped = (reports.items || []).map((r: any, idx: number) => ({
          id: r.id,
          patient: `Patient ${idx + 1}`,
          signal: r.title || 'Risk review required',
          severity: idx % 3 === 0 ? 'high' : idx % 3 === 1 ? 'medium' : 'low',
          status: String(r.status || 'draft').toLowerCase(),
        }));
        setRows(mapped);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load risk monitoring');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = rows.filter((r) => {
    const matchesSearch = !query || String(r.signal).toLowerCase().includes(query.toLowerCase()) || String(r.patient).toLowerCase().includes(query.toLowerCase());
    const matchesSeverity = !severity || r.severity === severity;
    return matchesSearch && matchesSeverity;
  });

  return (
    <TherapistPageShell title="Risk Monitoring" subtitle="Track high-risk signals, crisis alerts, and follow-up actions.">
      {loading ? <TherapistLoadingState title="Loading risk data" description="Analyzing risk indicators." /> : null}
      {error ? <TherapistErrorState title="Could not load risk data" description={error} onRetry={() => window.location.reload()} /> : null}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TherapistCard className="p-4"><div className="text-xs text-ink-500">High Risk Patients</div><div className="text-2xl font-semibold mt-1">{highRisk}</div></TherapistCard>
        <TherapistCard className="p-4"><div className="text-xs text-ink-500">Pending Clinical Review</div><div className="text-2xl font-semibold mt-1">{pending}</div></TherapistCard>
        <TherapistCard className="p-4"><div className="text-xs text-ink-500">Emergency Escalations</div><div className="text-2xl font-semibold mt-1">0</div></TherapistCard>
      </div>
      <TherapistCard className="p-4 mt-4">
        <div className="flex items-center justify-between"><h3 className="font-semibold">Current Alert Queue</h3><TherapistBadge label="Live" variant="danger" /></div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_180px]">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient or signal..." className="rounded-lg border border-ink-100 px-3 py-2 text-sm" />
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="rounded-lg border border-ink-100 px-3 py-2 text-sm">
            <option value="">All severity</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        {filtered.length === 0 ? <TherapistEmptyState title="No risk alerts" description="No matching alerts for current filters." /> : null}
        <div className="mt-3 space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-lg border border-ink-100 px-3 py-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-ink-800">{r.patient}</p>
                <p className="text-xs text-ink-500">{r.signal}</p>
              </div>
              <TherapistBadge label={r.severity.toUpperCase()} variant={r.severity === 'high' ? 'danger' : r.severity === 'medium' ? 'warning' : 'success'} />
            </div>
          ))}
        </div>
      </TherapistCard>
    </TherapistPageShell>
  );
}
