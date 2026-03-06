import { useEffect, useState } from 'react';
import { psychiatristApi } from '../../api/psychiatrist.api';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';

export default function PsychiatristParameterTrackingPage() {
  const { selectedPatientId } = useProviderDashboardContext();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!selectedPatientId) return;
    void psychiatristApi.getParameterTracking(selectedPatientId).then((res) => setData(res));
  }, [selectedPatientId]);

  if (!selectedPatientId) return <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-500">Select a patient to view parameter tracking.</div>;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold">Parameter Tracking</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <Stat title="PHQ-9 points" value={String(data?.phq9Trend?.length || 0)} />
        <Stat title="GAD-7 points" value={String(data?.gad7Trend?.length || 0)} />
        <Stat title="Adherence samples" value={String(data?.medicationAdherence?.length || 0)} />
        <Stat title="Vitals samples" value={String(data?.vitals?.length || 0)} />
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded border border-slate-100 p-3">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
