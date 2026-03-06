import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { psychiatristApi, type PsychiatristPatient } from '../../api/psychiatrist.api';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import TherapistTable from '../../components/therapist/dashboard/TherapistTable';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';

export default function PsychiatristPatientsPage() {
  const navigate = useNavigate();
  const { dashboardMode, setDashboardMode, setSelectedPatientId } = useProviderDashboardContext();
  const [items, setItems] = useState<PsychiatristPatient[]>([]);
  const [previewPatient, setPreviewPatient] = useState<PsychiatristPatient | null>(null);

  useEffect(() => {
    void psychiatristApi.getPatients().then((res) => setItems(res.items || []));
  }, []);

  const openPatientWorkspace = (patientId: string) => {
    setSelectedPatientId(patientId);
    setDashboardMode('professional');
    navigate('/psychiatrist/dashboard');
  };

  return (
    <TherapistPageShell
      title="My Patients"
      subtitle="Patient list with recent session visibility for psychiatrist workflow."
    >
      <TherapistCard>
        <div className="border-b border-ink-100 px-4 py-3">
          <h3 className="font-display text-lg font-semibold text-ink-800">Assigned Patients</h3>
        </div>
        <TherapistTable
          rows={items}
          rowKey={(row) => row.patientId}
          emptyText="No patients are assigned yet."
          columns={[
            { key: 'name', header: 'Name', render: (row) => row.name },
            { key: 'age', header: 'Age', render: (row) => row.age },
            {
              key: 'lastSession',
              header: 'Last Session',
              render: (row) =>
                row.lastSessionAt
                  ? new Date(row.lastSessionAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                  : '-',
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => (
                <div className="flex flex-wrap items-center gap-2">
                  <TherapistButton variant="secondary" className="min-h-[32px] px-3 py-1.5 text-xs" onClick={() => setPreviewPatient(row)}>
                    Preview
                  </TherapistButton>
                  <TherapistButton className="min-h-[32px] px-3 py-1.5 text-xs" onClick={() => openPatientWorkspace(row.patientId)}>
                    {dashboardMode === 'practice' ? 'Open Patient Workspace' : 'Open Dashboard'}
                  </TherapistButton>
                </div>
              ),
            },
          ]}
        />
      </TherapistCard>

      {previewPatient ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-charcoal/30 p-4" onClick={() => setPreviewPatient(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-ink-100 bg-white p-5 shadow-soft-md" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Patient preview">
            <h3 className="font-display text-lg font-semibold text-ink-800">{previewPatient.name}</h3>
            <p className="mt-1 text-sm text-ink-500">Quick patient summary for psychiatrist self-mode workflows.</p>
            <div className="mt-4 grid gap-2 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2">
                <span className="text-ink-500">Patient ID</span>
                <span className="font-medium text-ink-800">{previewPatient.patientUserId || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2">
                <span className="text-ink-500">Age</span>
                <span className="font-medium text-ink-800">{previewPatient.age || '-'}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2">
                <span className="text-ink-500">Last Session</span>
                <span className="font-medium text-ink-800">
                  {previewPatient.lastSessionAt
                    ? new Date(previewPatient.lastSessionAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'No sessions yet'}
                </span>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <TherapistButton variant="secondary" onClick={() => setPreviewPatient(null)}>
                Close
              </TherapistButton>
              <TherapistButton
                onClick={() => {
                  openPatientWorkspace(previewPatient.patientId);
                  setPreviewPatient(null);
                }}
              >
                Open Patient Workspace
              </TherapistButton>
            </div>
          </div>
        </div>
      ) : null}
    </TherapistPageShell>
  );
}
