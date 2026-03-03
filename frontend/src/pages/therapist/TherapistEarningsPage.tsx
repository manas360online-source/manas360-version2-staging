import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistEarningsChart from '../../components/therapist/dashboard/TherapistEarningsChart';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import { chartData } from './dashboardData';

const summary = [
  { title: 'This Month', value: '₹72,400' },
  { title: 'Platform Share', value: '₹48,266' },
  { title: 'Sessions Completed', value: '56' },
];

export default function TherapistEarningsPage() {
  return (
    <TherapistPageShell title="Earnings" subtitle="Review monthly revenue and payout trends.">
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
            labels={chartData.labels}
            therapistShare={chartData.therapistShare}
            platformShare={chartData.platformShare}
          />
        </div>
      </TherapistCard>
    </TherapistPageShell>
  );
}
