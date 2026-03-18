import { useEffect, useState } from 'react';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import { psychologistApi } from '../../api/psychologist.api';
import { TherapistLoadingState, TherapistErrorState } from '../../components/therapist/dashboard/TherapistDataState';

export default function PsychologistSchedulePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await psychologistApi.getSchedule();
      setItems(res.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <TherapistPageShell title="Evaluation Schedule" subtitle="View and manage scheduled evaluations.">
      {loading ? <TherapistLoadingState title="Loading schedule" description="Fetching upcoming evaluations." /> : null}
      {error ? <TherapistErrorState title="Schedule error" description={error} onRetry={() => void load()} /> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TherapistCard className="p-4 lg:col-span-2">
          <div className="text-sm text-ink-600">(Calendar view placeholder) - integrate full calendar component as next step.</div>
          <div className="mt-4 space-y-2">
            {items.map((it) => (
              <div key={it.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2">
                <div>
                  <p className="font-semibold">{it.patientName || 'Patient'}</p>
                  <p className="text-xs text-ink-500">{it.scheduledAt ? new Date(it.scheduledAt).toLocaleString() : ''}</p>
                </div>
                <div className="text-xs text-ink-500">{it.status}</div>
              </div>
            ))}
          </div>
        </TherapistCard>

        <TherapistCard className="p-4">
          <h4 className="font-semibold">Upcoming Evaluations</h4>
          <ul className="mt-3 space-y-2">
            {items.slice(0, 5).map((it) => (
              <li key={it.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2">
                <div className="text-sm">{it.patientName || 'Patient'}</div>
                <div className="text-xs text-ink-500">{it.scheduledAt ? new Date(it.scheduledAt).toLocaleString() : ''}</div>
              </li>
            ))}
          </ul>
        </TherapistCard>
      </div>
    </TherapistPageShell>
  );
}
