import { useEffect, useState } from 'react';
import { psychiatristApi, type PsychiatristMedicationLibraryItem } from '../../api/psychiatrist.api';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import TherapistTable from '../../components/therapist/dashboard/TherapistTable';

export default function PsychiatristMedicationLibraryPage() {
  const [rows, setRows] = useState<PsychiatristMedicationLibraryItem[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    void psychiatristApi.listMedicationLibrary().then((res) => setRows(res.items || []));
  }, []);

  const addDefault = () => {
    if (adding) return;
    setAdding(true);
    void psychiatristApi
      .createMedicationLibraryItem({
        drugName: 'New Medication',
        startingDose: '',
        maxDose: '',
        sideEffects: '',
        notes: '',
      })
      .then(() => psychiatristApi.listMedicationLibrary())
      .then((res) => setRows(res.items || []))
      .finally(() => setAdding(false));
  };

  return (
    <TherapistPageShell
      title="Medication Library"
      subtitle="Personal psychiatrist reference library for faster professional-mode prescribing."
    >
      <TherapistCard>
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <h3 className="font-display text-lg font-semibold text-ink-800">Medication Reference</h3>
          <TherapistButton onClick={addDefault} disabled={adding}>{adding ? 'Adding...' : 'Add Medication'}</TherapistButton>
        </div>

        <TherapistTable
          rows={rows}
          rowKey={(row) => row.id}
          emptyText="No medications saved yet. Add one to start your personal reference library."
          columns={[
            { key: 'drug', header: 'Drug Name', render: (row) => row.drugName },
            { key: 'start', header: 'Starting Dose', render: (row) => row.startingDose },
            { key: 'max', header: 'Maximum Dose', render: (row) => row.maxDose },
            { key: 'effects', header: 'Common Side Effects', render: (row) => row.sideEffects },
            { key: 'notes', header: 'Clinical Notes', render: (row) => row.notes },
          ]}
        />
      </TherapistCard>
    </TherapistPageShell>
  );
}
