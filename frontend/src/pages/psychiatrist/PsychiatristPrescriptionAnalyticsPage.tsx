import { useEffect, useState } from 'react';
import { psychiatristApi } from '../../api/psychiatrist.api';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

export default function PsychiatristPrescriptionAnalyticsPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    void psychiatristApi.getSelfMode().then((res) => setData(res));
  }, []);

  const prescriptionTrends = data?.prescriptionTrends || [];
  const outcomes = data?.patientOutcomes || [];

  return (
    <TherapistPageShell
      title="Prescription Analytics"
      subtitle="API-backed prescription and outcomes trends from psychiatrist self mode."
    >
      <section className="grid gap-4 md:grid-cols-3">
        <Metric title="Active Prescriptions" value={String(data?.activePrescriptions || 0)} />
        <Metric title="Medication Reviews Due" value={String(data?.medicationReviewsDue || 0)} />
        <Metric title="Adherence Alerts" value={String(data?.adherenceAlerts || 0)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TherapistCard className="p-4">
          <h3 className="font-display text-lg font-semibold text-ink-800">Prescription Trends</h3>
          <div className="mt-4 space-y-3">
            {prescriptionTrends.length === 0 ? (
              <p className="text-sm text-ink-500">No prescription trend data returned by API yet.</p>
            ) : (
              prescriptionTrends.map((item: { label: string; count: number }) => (
              <div key={item.label} className="grid grid-cols-[72px_1fr_44px] items-center gap-3 text-sm">
                <span className="text-ink-600">{item.label}</span>
                <div className="h-2 rounded-full bg-ink-100">
                  <div className="h-2 rounded-full bg-sage-500" style={{ width: `${Math.min(100, item.count * 10)}%` }} />
                </div>
                <span className="text-right text-ink-700">{item.count}</span>
              </div>
              ))
            )}
          </div>
        </TherapistCard>

        <TherapistCard className="p-4">
          <h3 className="font-display text-lg font-semibold text-ink-800">Patient Outcomes</h3>
          <p className="mt-2 text-sm text-ink-600">Assessment-outcome trend values from psychiatrist self mode.</p>
          <div className="mt-4 space-y-2 text-sm text-ink-700">
            {outcomes.length === 0 ? (
              <p className="text-sm text-ink-500">No outcomes trend data returned by API yet.</p>
            ) : (
              outcomes.map((item: { label: string; score: number }) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2">
                  <span>{item.label}</span>
                  <span className="font-semibold text-sage-600">{Math.round(item.score)}</span>
                </div>
              ))
            )}
          </div>
        </TherapistCard>
      </section>
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
