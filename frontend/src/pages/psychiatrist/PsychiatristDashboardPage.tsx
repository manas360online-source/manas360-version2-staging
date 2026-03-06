import { useEffect, useState } from 'react';
import { psychiatristApi, type PsychiatristDashboard, type PsychiatristPatient } from '../../api/psychiatrist.api';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';

export default function PsychiatristDashboardPage() {
  const { dashboardMode, selectedPatientId, setSelectedPatientId } = useProviderDashboardContext();
  const [patients, setPatients] = useState<PsychiatristPatient[]>([]);
  const [dashboard, setDashboard] = useState<PsychiatristDashboard | null>(null);
  const [selfMode, setSelfMode] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const patientRes = await psychiatristApi.getPatients();
        setPatients(patientRes.items || []);
        if (!selectedPatientId && patientRes.items?.length) {
          setSelectedPatientId(patientRes.items[0].patientId);
        }

        if (dashboardMode === 'practice') {
          const selfData = await psychiatristApi.getSelfMode();
          setSelfMode(selfData);
          setDashboard(null);
        } else {
          const data = await psychiatristApi.getDashboard(selectedPatientId || undefined);
          setDashboard(data);
          setSelfMode(null);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [dashboardMode, selectedPatientId, setSelectedPatientId]);

  if (loading) return <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading psychiatrist dashboard...</div>;

  if (dashboardMode === 'practice' && selfMode) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Total Patients" value={String(selfMode.totalPatients || 0)} />
        <Card title="Active Prescriptions" value={String(selfMode.activePrescriptions || 0)} />
        <Card title="Consultations This Week" value={String(selfMode.consultationsThisWeek || 0)} />
        <Card title="Income" value={`INR ${(Number(selfMode.incomeMinor || 0) / 100).toFixed(0)}`} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <label className="text-xs text-slate-500">Selected Patient</label>
        <select
          className="mt-1 w-full rounded border border-slate-300 p-2 text-sm"
          value={selectedPatientId}
          onChange={(e) => setSelectedPatientId(e.target.value)}
        >
          <option value="">No patient selected</option>
          {patients.map((p) => (
            <option key={p.patientId} value={p.patientId}>{p.name}</option>
          ))}
        </select>
      </div>

      {!dashboard?.patientSelected ? (
        <div className="grid gap-4 md:grid-cols-5">
          <Card title="Today's Consultations" value={String(dashboard?.todaysConsultations || 0)} />
          <Card title="Medication Reviews" value={String(dashboard?.medicationReviewsDue || 0)} />
          <Card title="Drug Alerts" value={String(dashboard?.drugInteractionAlerts || 0)} />
          <Card title="Worsening Symptoms" value={String(dashboard?.worseningSymptoms || 0)} />
          <Card title="Non-adherence" value={String(dashboard?.nonAdherenceAlerts || 0)} />
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold">Patient Overview</h3>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <div><span className="text-slate-500">Name:</span> {dashboard.patientOverview?.name}</div>
              <div><span className="text-slate-500">Age:</span> {dashboard.patientOverview?.age}</div>
              <div><span className="text-slate-500">Diagnosis:</span> {dashboard.patientOverview?.diagnosis}</div>
              <div><span className="text-slate-500">Next Follow-up:</span> {dashboard.patientOverview?.nextFollowUp || '-'}</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold">Psychologist Wellness Plan (Read-Only)</h3>
            {dashboard.psychologistWellnessPlan?.available ? (
              <div className="space-y-1 text-sm">
                {(dashboard.psychologistWellnessPlan.items || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between border-b border-slate-100 py-1">
                    <span>{item.label || 'Plan item'}</span>
                    <span>{item.progress || '-'}</span>
                  </div>
                ))}
                <p className="pt-2 text-xs text-slate-500">{dashboard.psychologistWellnessPlan.notes || ''}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No wellness plan available yet</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
