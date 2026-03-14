import { useEffect, useState } from 'react';
import { Plus, Download } from 'lucide-react';
import { psychologistApi } from '../../api/psychologist.api';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import { TherapistErrorState, TherapistLoadingState } from '../../components/therapist/dashboard/TherapistDataState';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import ProviderReportEditor from '../../components/psychologist/ProviderReportEditor';

export default function PsychologistReportsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [clones, setClones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, cloned] = await Promise.all([
        psychologistApi.getReports(),
        psychologistApi.getPatientReportClones(),
      ]);
      setRows(res.items || []);
      setClones(cloned.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <TherapistPageShell title="Reports" subtitle="Create, edit, submit, and download psychological reports.">
      {loading ? <TherapistLoadingState title="Loading reports" description="Fetching report list." /> : null}
      {error ? <TherapistErrorState title="Report action failed" description={error} onRetry={() => void load()} /> : null}

      <TherapistCard className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-ink-800">Psychological Reports</h3>
          <TherapistButton variant="primary">
            <Plus className="h-4 w-4" />
            New Report
          </TherapistButton>
        </div>

        <div className="mt-4 space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-ink-100 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-ink-800">{r.title || `${r.patientName || 'Patient'} Report`}</p>
                <p className="text-xs text-ink-500">{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <TherapistButton variant="secondary">Edit</TherapistButton>
                <TherapistButton variant="secondary">Submit</TherapistButton>
                <TherapistButton variant="secondary">
                  <Download className="h-4 w-4" />
                </TherapistButton>
              </div>
            </div>
          ))}
        </div>

        <ProviderReportEditor reports={rows} clones={clones} onReload={load} />
      </TherapistCard>
    </TherapistPageShell>
  );
}
