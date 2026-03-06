import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ClipboardList, Pill, ShieldAlert, Users } from 'lucide-react';
import {
  psychiatristApi,
  type PsychiatristDashboard,
  type PsychiatristPatient,
  type PsychiatristSelfMode,
} from '../../api/psychiatrist.api';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import { TherapistErrorState, TherapistLoadingState } from '../../components/therapist/dashboard/TherapistDataState';

const formatDateTime = (value?: string | null): string => {
  if (!value) return '-';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function PsychiatristDashboardPage() {
  const { dashboardMode, selectedPatientId, setSelectedPatientId } = useProviderDashboardContext();
  const [patients, setPatients] = useState<PsychiatristPatient[]>([]);
  const [dashboard, setDashboard] = useState<PsychiatristDashboard | null>(null);
  const [selfMode, setSelfMode] = useState<PsychiatristSelfMode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
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

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load psychiatrist dashboard';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [dashboardMode, selectedPatientId, setSelectedPatientId, reloadKey]);

  const selectedPatient = useMemo(
    () => patients.find((item) => item.patientId === selectedPatientId) || null,
    [patients, selectedPatientId],
  );

  if (loading) {
    return <TherapistLoadingState title="Loading dashboard" description="Fetching psychiatrist care metrics and patient summary." />;
  }

  if (error) {
    return (
      <TherapistErrorState
        title="Could not load dashboard"
        description={error}
        onRetry={() => setReloadKey((value) => value + 1)}
      />
    );
  }

  if (dashboardMode === 'practice' && selfMode) {
    const prescriptionTrend = selfMode.prescriptionTrends || [];
    const outcomes = selfMode.patientOutcomes || [];
    const revenue = selfMode.revenue || [];

    return (
      <TherapistPageShell
        title="Psychiatrist Dashboard"
        subtitle="Self mode tracks your practice performance and prescription load."
      >
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card title="Total Patients" value={String(selfMode.totalPatients || 0)} icon={Users} />
          <Card title="Active Prescriptions" value={String(selfMode.activePrescriptions || 0)} icon={Pill} />
          <Card title="Consultations This Week" value={String(selfMode.consultationsThisWeek || 0)} icon={ClipboardList} />
          <Card title="Income" value={`INR ${(Number(selfMode.incomeMinor || 0) / 100).toFixed(0)}`} icon={Activity} />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <TherapistCard className="p-4">
            <h3 className="font-display text-lg font-semibold text-ink-800">Ratings</h3>
            <p className="mt-2 font-display text-3xl font-bold text-ink-800">
              {selfMode.ratings == null ? 'N/A' : selfMode.ratings.toFixed(1)}
            </p>
            <p className="mt-1 text-sm text-ink-500">Patient feedback average</p>
          </TherapistCard>

          <TherapistCard className="p-4 lg:col-span-2">
            <h3 className="font-display text-lg font-semibold text-ink-800">Prescription Trends</h3>
            <div className="mt-3 space-y-2">
              {prescriptionTrend.length === 0 ? (
                <p className="text-sm text-ink-500">No trend data yet.</p>
              ) : (
                prescriptionTrend.map((point) => (
                  <div key={point.label} className="grid grid-cols-[64px_1fr_40px] items-center gap-2 text-xs">
                    <span className="text-ink-500">{point.label}</span>
                    <div className="h-2 rounded-full bg-ink-100">
                      <div className="h-2 rounded-full bg-sage-500" style={{ width: `${Math.min(100, point.count * 10)}%` }} />
                    </div>
                    <span className="text-right text-ink-700">{point.count}</span>
                  </div>
                ))
              )}
            </div>
          </TherapistCard>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <TherapistCard className="p-4">
            <h3 className="font-display text-lg font-semibold text-ink-800">Patient Outcomes</h3>
            <div className="mt-3 space-y-2">
              {outcomes.length === 0 ? (
                <p className="text-sm text-ink-500">No outcome trend data yet.</p>
              ) : (
                outcomes.map((point) => (
                  <div key={point.label} className="grid grid-cols-[64px_1fr_40px] items-center gap-2 text-xs">
                    <span className="text-ink-500">{point.label}</span>
                    <div className="h-2 rounded-full bg-ink-100">
                      <div className="h-2 rounded-full bg-sky-600" style={{ width: `${Math.max(0, Math.min(100, point.score))}%` }} />
                    </div>
                    <span className="text-right text-ink-700">{Math.round(point.score)}</span>
                  </div>
                ))
              )}
            </div>
          </TherapistCard>

          <TherapistCard className="p-4">
            <h3 className="font-display text-lg font-semibold text-ink-800">Revenue</h3>
            <div className="mt-3 space-y-2">
              {revenue.length === 0 ? (
                <p className="text-sm text-ink-500">No revenue trend data yet.</p>
              ) : (
                revenue.map((point) => (
                  <div key={point.label} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm">
                    <span className="text-ink-500">{point.label}</span>
                    <span className="font-semibold text-ink-800">INR {(Number(point.amountMinor || 0) / 100).toFixed(0)}</span>
                  </div>
                ))
              )}
            </div>
          </TherapistCard>
        </section>
      </TherapistPageShell>
    );
  }

  return (
    <TherapistPageShell
      title="Psychiatrist Dashboard"
      subtitle="Professional mode gives rapid clinical visibility for medication, risk, and follow-ups."
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card title="Today's Consultations" value={String(dashboard?.todaysConsultations || 0)} icon={ClipboardList} />
        <Card title="Medication Reviews" value={String(dashboard?.medicationReviewsDue || 0)} icon={Pill} />
        <Card title="Drug Alerts" value={String(dashboard?.drugInteractionAlerts || 0)} icon={AlertTriangle} />
        <Card title="Worsening Symptoms" value={String(dashboard?.worseningSymptoms || 0)} icon={ShieldAlert} />
        <Card title="Non-adherence" value={String(dashboard?.nonAdherenceAlerts || 0)} icon={Activity} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TherapistCard>
          <div className="border-b border-ink-100 px-4 py-3">
            <h3 className="font-display text-lg font-semibold text-ink-800">Patient Overview</h3>
            <p className="mt-1 text-sm text-ink-500">{selectedPatient ? `Current patient: ${selectedPatient.name}` : 'Select a patient from the top header.'}</p>
          </div>
          <div className="space-y-2 px-4 py-4 text-sm text-ink-700">
            <div><span className="text-ink-500">Name:</span> {dashboard?.patientOverview?.name || '-'}</div>
            <div><span className="text-ink-500">Age:</span> {dashboard?.patientOverview?.age ?? '-'}</div>
            <div><span className="text-ink-500">Diagnosis:</span> {dashboard?.patientOverview?.diagnosis || '-'}</div>
            <div><span className="text-ink-500">Last Session:</span> {formatDateTime(dashboard?.patientOverview?.lastSession)}</div>
            <div><span className="text-ink-500">Next Follow-up:</span> {formatDateTime(dashboard?.patientOverview?.nextFollowUp)}</div>
          </div>
        </TherapistCard>

        <TherapistCard>
          <div className="border-b border-ink-100 px-4 py-3">
            <h3 className="font-display text-lg font-semibold text-ink-800">Therapist Wellness Plan (Read-only)</h3>
            <p className="mt-1 text-sm text-ink-500">Shared care plan visibility for psychiatrist decisions.</p>
          </div>
          <div className="space-y-2 px-4 py-4 text-sm text-ink-700">
            {dashboard?.psychologistWellnessPlan?.available ? (
              (dashboard.psychologistWellnessPlan.items || []).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2">
                  <span>{item.label || 'Plan item'}</span>
                  <span className="text-ink-500">{item.progress || '-'}</span>
                </div>
              ))
            ) : (
              <p className="text-ink-500">No wellness plan available yet.</p>
            )}
            {dashboard?.psychologistWellnessPlan?.notes ? (
              <p className="pt-2 text-xs text-ink-500">{dashboard.psychologistWellnessPlan.notes}</p>
            ) : null}
          </div>
        </TherapistCard>
      </section>
    </TherapistPageShell>
  );
}

function Card({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: typeof Users;
}) {
  return (
    <TherapistCard className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">{title}</p>
        <div className="rounded-lg bg-sage-50 p-2 text-sage-500">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 font-display text-2xl font-bold text-ink-800">{value}</p>
    </TherapistCard>
  );
}
