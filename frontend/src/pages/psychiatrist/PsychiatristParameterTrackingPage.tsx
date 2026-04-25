import { useEffect, useState } from 'react';
import { psychiatristApi } from '../../api/psychiatrist.api';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

export default function PsychiatristParameterTrackingPage() {
  const { selectedPatientId } = useProviderDashboardContext();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!selectedPatientId) return;
    void psychiatristApi.getParameterTracking(selectedPatientId).then((res) => setData(res));
  }, [selectedPatientId]);

  if (!selectedPatientId) {
    return (
      <TherapistPageShell
        title="Parameter Tracking"
        subtitle="Monitor standardized psychiatric parameters for a selected patient."
      >
        <TherapistCard className="p-4 text-sm text-ink-500">Select a patient to view parameter tracking.</TherapistCard>
      </TherapistPageShell>
    );
  }

  return (
    <TherapistPageShell
      title="Parameter Tracking"
      subtitle="Track PHQ-9, GAD-7, adherence, and vital trends for psychiatric monitoring."
    >
      <TherapistCard>
        <div className="border-b border-ink-100 px-4 py-3">
          <h3 className="font-display text-lg font-semibold text-ink-800">Clinical Parameters</h3>
        </div>
        <div className="grid gap-3 px-4 py-4 md:grid-cols-2">
          <Stat title="PHQ-9 points" value={String(data?.phq9Trend?.length || 0)} />
          <Stat title="GAD-7 points" value={String(data?.gad7Trend?.length || 0)} />
          <Stat title="Adherence samples" value={String(data?.medicationAdherence?.length || 0)} />
          <Stat title="Vitals samples" value={String(data?.vitals?.length || 0)} />
        </div>
      </TherapistCard>
    </TherapistPageShell>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-100 p-3">
      <p className="text-xs text-ink-500">{title}</p>
      <p className="mt-1 font-display text-lg font-semibold text-ink-800">{value}</p>
    </div>
  );
}
