import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { psychologistApi } from '../../api/psychologist.api';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import { TherapistEmptyState, TherapistErrorState, TherapistLoadingState } from '../../components/therapist/dashboard/TherapistDataState';

export default function PsychologistDiagnosticReportsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await psychologistApi.getReports();
        setItems(res.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = items.filter((r) => {
    const matchesSearch = !search || String(r.title || '').toLowerCase().includes(search.toLowerCase());
    const s = String(r.status || '').toLowerCase();
    const matchesStatus = !status || s === status;
    return matchesSearch && matchesStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <TherapistPageShell title="Diagnostic Reports" subtitle="Clinical diagnosis, severity, recommendations, and referrals.">
      {loading ? <TherapistLoadingState title="Loading reports" description="Fetching diagnostic reports." /> : null}
      {error ? <TherapistErrorState title="Could not load reports" description={error} onRetry={() => window.location.reload()} /> : null}
      <TherapistCard className="p-4">
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_220px]">
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search report title..." className="rounded-lg border border-ink-100 px-3 py-2 text-sm" />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-lg border border-ink-100 px-3 py-2 text-sm">
            <option value="">All status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="reviewed">Reviewed</option>
          </select>
        </div>
        {paged.length === 0 ? <TherapistEmptyState title="No reports found" description="Try changing filters or search." /> : null}
        <div className="space-y-2">
          {paged.map((r) => (
            <div key={r.id} className="rounded-lg border border-ink-100 px-3 py-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-ink-800">{r.title || 'Diagnostic Report'}</p>
                <p className="text-xs text-ink-500">Status: {String(r.status || 'draft')}</p>
              </div>
              <div className="flex gap-2">
                <TherapistButton variant="secondary">Open</TherapistButton>
                <TherapistButton variant="secondary"><Download className="h-4 w-4" /></TherapistButton>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-ink-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <TherapistButton variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</TherapistButton>
            <TherapistButton variant="secondary" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</TherapistButton>
          </div>
        </div>
      </TherapistCard>
    </TherapistPageShell>
  );
}
