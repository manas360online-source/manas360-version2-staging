import { useEffect, useState } from 'react';
import { therapistApi, type TherapistPayoutItem } from '../../api/therapist.api';
import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import {
  TherapistEmptyState,
  TherapistErrorState,
  TherapistLoadingState,
} from '../../components/therapist/dashboard/TherapistDataState';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import TherapistTable from '../../components/therapist/dashboard/TherapistTable';

const formatDate = (value: string): string =>
  new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

const formatInr = (minor: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(minor / 100);

export default function TherapistPayoutHistoryPage() {
  const [rows, setRows] = useState<TherapistPayoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayouts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await therapistApi.getPayoutHistory();
      setRows(res.items || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load payout history';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPayouts();
  }, []);

  return (
    <TherapistPageShell title="Payout History" subtitle="Review processed transfers and payout timelines.">
      {loading ? (
        <TherapistLoadingState title="Loading payouts" description="Fetching payout history from your completed sessions." />
      ) : error ? (
        <TherapistErrorState title="Could not load payouts" description={error} onRetry={() => void loadPayouts()} />
      ) : rows.length === 0 ? (
        <TherapistEmptyState title="No payouts yet" description="Processed payouts will appear after paid sessions are completed." />
      ) : (
        <TherapistCard className="overflow-hidden">
          <TherapistTable
            columns={[
              { key: 'date', header: 'Date', render: (row) => formatDate(row.date) },
              { key: 'amount', header: 'Amount', render: (row) => <span className="font-semibold">{formatInr(row.amountMinor)}</span> },
              {
                key: 'status',
                header: 'Status',
                render: (row) => <TherapistBadge label={row.status} variant="success" />,
              },
            ]}
            rows={rows}
            rowKey={(row) => row.id}
          />
        </TherapistCard>
      )}
    </TherapistPageShell>
  );
}
