import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import TherapistTable from '../../components/therapist/dashboard/TherapistTable';
import { payoutsTable } from './dashboardData';

export default function TherapistPayoutHistoryPage() {
  return (
    <TherapistPageShell title="Payout History" subtitle="Review processed transfers and payout timelines.">
      <TherapistCard className="overflow-hidden">
        <TherapistTable
          columns={[
            { key: 'date', header: 'Date', render: (row) => row.date },
            { key: 'amount', header: 'Amount', render: (row) => <span className="font-semibold">{row.amount}</span> },
            {
              key: 'status',
              header: 'Status',
              render: (row) => <TherapistBadge label={row.status} variant="success" />,
            },
          ]}
          rows={payoutsTable}
          rowKey={(row) => row.id}
        />
      </TherapistCard>
    </TherapistPageShell>
  );
}
