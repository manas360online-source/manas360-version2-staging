import { useEffect, useState } from 'react';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import { psychologistApi } from '../../api/psychologist.api';
import { TherapistLoadingState, TherapistErrorState } from '../../components/therapist/dashboard/TherapistDataState';

export default function PsychologistMessagesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await psychologistApi.getMessages();
      setItems(res.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <TherapistPageShell title="Messages" subtitle="Communicate with care team and administrators.">
      {loading ? <TherapistLoadingState title="Loading messages" description="Fetching messages." /> : null}
      {error ? <TherapistErrorState title="Messages error" description={error} onRetry={() => void load()} /> : null}

      <TherapistCard className="p-4">
        <ul className="space-y-2">
          {items.map((m) => (
            <li key={m.id} className="rounded-lg border border-ink-100 px-3 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-ink-800">{m.title}</p>
                  <p className="text-xs text-ink-500">{m.message}</p>
                </div>
                <div className="text-xs text-ink-500">{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</div>
              </div>
            </li>
          ))}
        </ul>
      </TherapistCard>
    </TherapistPageShell>
  );
}
