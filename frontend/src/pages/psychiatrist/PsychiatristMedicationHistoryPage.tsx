import { useEffect, useState } from 'react';
import { psychiatristApi } from '../../api/psychiatrist.api';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import TherapistTable from '../../components/therapist/dashboard/TherapistTable';

export default function PsychiatristMedicationHistoryPage() {
  const { selectedPatientId } = useProviderDashboardContext();
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const res = await psychiatristApi.listMedicationHistory(selectedPatientId || undefined);
    setItems(res.items || []);
  };

  useEffect(() => { void load(); }, [selectedPatientId]);

  const addEntry = async () => {
    if (!selectedPatientId) return;
    await psychiatristApi.createMedicationHistory({
      patientId: selectedPatientId,
      medication: 'Sertraline',
      oldDose: '25mg',
      newDose: '50mg',
      reason: 'Low response',
      outcome: 'Improved mood',
    });
    await load();
  };

  return (
    <TherapistPageShell
      title="Medication History"
      subtitle="Track dosage changes, rationale, and outcomes across patient treatment cycles."
    >
      <TherapistCard>
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <h3 className="font-display text-lg font-semibold text-ink-800">Dosage Adjustment History</h3>
          <TherapistButton disabled={!selectedPatientId} onClick={() => void addEntry()}>Add Entry</TherapistButton>
        </div>
        <TherapistTable
          rows={items}
          rowKey={(row) => row.id}
          emptyText="No medication history entries yet."
          columns={[
            { key: 'medication', header: 'Medication', render: (row) => row.medication },
            { key: 'old', header: 'Old', render: (row) => row.old_dose || '-' },
            { key: 'new', header: 'New', render: (row) => row.new_dose || '-' },
            { key: 'reason', header: 'Reason', render: (row) => row.reason || '-' },
            { key: 'outcome', header: 'Outcome', render: (row) => row.outcome || '-' },
          ]}
        />
      </TherapistCard>
    </TherapistPageShell>
  );
}
