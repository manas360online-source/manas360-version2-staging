import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { psychologistApi } from '../../api/psychologist.api';
import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import { TherapistErrorState, TherapistLoadingState } from '../../components/therapist/dashboard/TherapistDataState';
import TherapistModeGate from '../../components/therapist/dashboard/TherapistModeGate';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';

export default function PsychologistAssessmentsPage() {
  const { dashboardMode } = useProviderDashboardContext();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await psychologistApi.getAssessments();
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

  return (
    <TherapistPageShell title="Assessments" subtitle="Manage assessments, assign tests, and review results.">
      {dashboardMode !== 'professional' ? (
        <TherapistModeGate
          requiredMode="professional"
          title="Assessments Available in Professional Mode"
          description="Assessment assignment and review are available in Professional Mode."
        />
      ) : null}

      {loading ? <TherapistLoadingState title="Loading assessments" description="Fetching assessment records." /> : null}
      {error ? <TherapistErrorState title="Assessment action failed" description={error} onRetry={() => void load()} /> : null}

      <TherapistCard className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-ink-800">Assessments</h3>
          <TherapistButton variant="primary">
            <Plus className="h-4 w-4" />
            Create Assessment
          </TherapistButton>
        </div>

        <div className="mt-4 space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-ink-100 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-ink-800">{r.patientName || r.patient || 'Patient'}</p>
                <p className="text-xs text-ink-500">{r.assessment_type || r.type} · {r.evaluated_at || r.date || ''}</p>
              </div>
              <TherapistBadge
                label={String(r.status || '').toUpperCase()}
                variant={r.status === 'completed' ? 'success' : r.status === 'pending' ? 'warning' : 'default'}
              />
            </div>
          ))}
        </div>
      </TherapistCard>
    </TherapistPageShell>
  );
}
