import { useEffect, useState } from 'react';
import { psychiatristApi } from '../../api/psychiatrist.api';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

const formatInr = (minor: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(minor / 100);

export default function PsychiatristEarningsPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    void psychiatristApi.getSelfMode().then((res) => setData(res));
  }, []);

  const totalRevenueMinor = Math.round(Number(data?.incomeMinor || 0));
  const revenue = data?.revenue || [];

  return (
    <TherapistPageShell
      title="Earnings"
      subtitle="API-backed earnings and revenue trend values from psychiatrist self mode."
    >
      <section className="grid gap-4 md:grid-cols-3">
        <Metric title="Consultations This Week" value={String(data?.consultationsThisWeek || 0)} />
        <Metric title="Total Revenue" value={formatInr(totalRevenueMinor)} />
        <Metric title="Reported Ratings" value={data?.ratings == null ? 'N/A' : String(data.ratings)} />
      </section>

      <TherapistCard className="p-4">
        <h3 className="font-display text-lg font-semibold text-ink-800">Revenue Trend</h3>
        <div className="mt-3 space-y-2 text-sm">
          {revenue.length === 0 ? (
            <p className="text-ink-500">No revenue trend rows returned by API yet.</p>
          ) : (
            revenue.map((row: { label: string; amountMinor: number }) => (
              <Row key={row.label} label={row.label} value={formatInr(Number(row.amountMinor || 0))} />
            ))
          )}
        </div>
      </TherapistCard>
    </TherapistPageShell>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <TherapistCard className="p-4">
      <p className="text-xs uppercase tracking-[0.08em] text-ink-500">{title}</p>
      <p className="mt-2 font-display text-2xl font-bold text-ink-800">{value}</p>
    </TherapistCard>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2">
      <span className="text-ink-500">{label}</span>
      <span className="font-semibold text-ink-800">{value}</span>
    </div>
  );
}
