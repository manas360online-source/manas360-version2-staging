import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import { psychiatristApi } from '../../api/psychiatrist.api';
import { useEffect, useState } from 'react';

export default function PsychiatristConsultationAnalyticsPage() {
  const { dashboardMode } = useProviderDashboardContext();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (dashboardMode !== 'practice') return;
    void psychiatristApi.getSelfMode().then((res) => setData(res));
  }, [dashboardMode]);

  return (
    <TherapistPageShell
      title="Consultation Analytics"
      subtitle="API-backed consultation metrics from psychiatrist self mode."
    >
      <section className="grid gap-4 md:grid-cols-3">
        <MiniCard title="Consultations This Week" value={String(data?.consultationsThisWeek || 0)} />
        <MiniCard title="Total Patients" value={String(data?.totalPatients || 0)} />
        <MiniCard title="Active Patients" value={String(data?.activePatients || 0)} />
      </section>

      <TherapistCard className="p-4">
        <h3 className="font-display text-lg font-semibold text-ink-800">Consultation Trend</h3>
        <p className="mt-2 text-sm text-ink-600">
          Monthly consultation trend is not yet exposed by the psychiatrist API. The cards above are from live
          self-mode data.
        </p>
      </TherapistCard>
    </TherapistPageShell>
  );
}

function MiniCard({ title, value }: { title: string; value: string }) {
  return (
    <TherapistCard className="p-4">
      <p className="text-xs uppercase tracking-[0.08em] text-ink-500">{title}</p>
      <p className="mt-2 font-display text-2xl font-bold text-ink-800">{value}</p>
    </TherapistCard>
  );
}
