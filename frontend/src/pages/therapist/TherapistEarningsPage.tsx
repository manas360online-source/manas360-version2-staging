import { useEffect, useMemo, useState } from 'react';
import { therapistApi, type TherapistEarningsResponse } from '../../api/therapist.api';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import {
  TherapistErrorState,
  TherapistLoadingState,
} from '../../components/therapist/dashboard/TherapistDataState';
import TherapistEarningsChart from '../../components/therapist/dashboard/TherapistEarningsChart';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

const formatInr = (minor: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(minor / 100);

export default function TherapistEarningsPage() {
  const [data, setData] = useState<TherapistEarningsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEarnings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await therapistApi.getEarnings();
      setData(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load earnings';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEarnings();
  }, []);

  const summary = useMemo(() => {
    if (!data) return [] as Array<{ title: string; value: string }>;
    return [
      { title: 'Therapist Share', value: formatInr(data.summary.therapistShareMinor) },
      { title: 'Platform Share', value: formatInr(data.summary.platformShareMinor) },
      { title: 'Sessions Completed', value: String(data.summary.sessionsCompleted) },
    ];
  }, [data]);

  return (
    <TherapistPageShell title="Earnings" subtitle="Review monthly revenue and payout trends.">
      {loading ? (
        <TherapistLoadingState title="Loading earnings" description="Fetching revenue summary and chart data." />
      ) : error || !data ? (
        <TherapistErrorState
          title="Could not load earnings"
          description={error || 'Earnings data is unavailable.'}
          onRetry={() => void loadEarnings()}
        />
      ) : (
        <>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {summary.map((card) => (
          <TherapistCard key={card.title} className="p-5">
            <p className="text-xs uppercase tracking-[0.08em] text-ink-500">{card.title}</p>
            <p className="mt-2 font-display text-3xl font-bold text-ink-800">{card.value}</p>
          </TherapistCard>
        ))}
      </section>

      <TherapistCard className="p-5">
        <h3 className="mb-4 font-display text-base font-bold text-ink-800">6-Month Earnings Breakdown</h3>
        <div className="h-72">
          <TherapistEarningsChart
            labels={data.chart.labels}
            therapistShare={data.chart.therapistShare}
            platformShare={data.chart.platformShare}
          />
        </div>
      </TherapistCard>
        </>
      )}
    </TherapistPageShell>
  );
}
