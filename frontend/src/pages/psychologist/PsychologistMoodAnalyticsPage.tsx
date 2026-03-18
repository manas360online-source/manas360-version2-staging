import { useEffect, useState } from 'react';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import { psychologistApi } from '../../api/psychologist.api';
import { TherapistErrorState, TherapistLoadingState } from '../../components/therapist/dashboard/TherapistDataState';

export default function PsychologistMoodAnalyticsPage() {
  const [points, setPoints] = useState<Array<{ label: string; value: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await psychologistApi.getDashboard();
        setPoints(res.charts?.evaluationsPerWeek || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <TherapistPageShell title="Mood Analytics" subtitle="Mood and assessment trends for clinical monitoring.">
      {loading ? <TherapistLoadingState title="Loading analytics" description="Fetching mood analytics." /> : null}
      {error ? <TherapistErrorState title="Could not load analytics" description={error} onRetry={() => window.location.reload()} /> : null}
      <TherapistCard className="p-4">
        <h3 className="font-semibold text-ink-800">Weekly Activity Trend</h3>
        <div className="mt-3 space-y-2">
          {points.map((p) => (
            <div key={p.label}>
              <div className="text-xs text-ink-600 flex justify-between"><span>{p.label}</span><span>{p.value}</span></div>
              <div className="h-2 bg-ink-100 rounded-full">
                <div className="h-2 bg-sage-500 rounded-full" style={{ width: `${Math.min(100, p.value * 10)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </TherapistCard>
    </TherapistPageShell>
  );
}
