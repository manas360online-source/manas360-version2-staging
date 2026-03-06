import { useEffect, useState } from 'react';
import { psychiatristApi } from '../../api/psychiatrist.api';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

export default function PsychiatristPrescriptionsPage() {
  const { selectedPatientId } = useProviderDashboardContext();
  const [items, setItems] = useState<any[]>([]);
  const [drugName, setDrugName] = useState('Sertraline');
  const [result, setResult] = useState<string>('');

  const load = async () => {
    const res = await psychiatristApi.listPrescriptions(selectedPatientId || undefined);
    setItems(res.items || []);
  };

  useEffect(() => { void load(); }, [selectedPatientId]);

  const createPrescription = async () => {
    if (!selectedPatientId) return;
    const created = await psychiatristApi.createPrescription({
      patientId: selectedPatientId,
      drugName,
      startingDose: '50mg',
      frequency: 'once daily in the morning',
      duration: '8 weeks',
    });
    setResult(created.instructions);
    await load();
  };

  const checkInteraction = async () => {
    const check = await psychiatristApi.checkInteractions({
      patientId: selectedPatientId,
      medications: [drugName],
      herbals: ['Ashwagandha'],
    });
    setResult(`Interaction level: ${check.level}`);
  };

  return (
    <TherapistPageShell
      title="Prescriptions"
      subtitle="Build medication plans and run interaction checks before issuing prescriptions."
    >
      <section className="grid gap-4 lg:grid-cols-2">
        <TherapistCard>
          <div className="border-b border-ink-100 px-4 py-3">
            <h3 className="font-display text-lg font-semibold text-ink-800">Prescription Builder</h3>
          </div>
          <div className="space-y-3 px-4 py-4">
            <input
              className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 focus:border-sage-300 focus:outline-none"
              value={drugName}
              onChange={(e) => setDrugName(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <TherapistButton disabled={!selectedPatientId} onClick={() => void createPrescription()}>
                Create Prescription
              </TherapistButton>
              <TherapistButton variant="secondary" onClick={() => void checkInteraction()}>
                Check Interaction
              </TherapistButton>
            </div>
            {result ? <p className="text-sm text-ink-600">{result}</p> : null}
          </div>
        </TherapistCard>

        <TherapistCard>
          <div className="border-b border-ink-100 px-4 py-3">
            <h3 className="font-display text-lg font-semibold text-ink-800">Prescription History</h3>
          </div>
          <ul className="space-y-2 px-4 py-4 text-sm">
            {items.map((item) => (
              <li key={item.id} className="rounded-lg border border-ink-100 p-3 text-ink-700">
                {item.drug_name} {item.starting_dose ? `(${item.starting_dose})` : ''} - {item.frequency || '-'}
              </li>
            ))}
            {items.length === 0 ? <li className="text-ink-500">No prescriptions yet.</li> : null}
          </ul>
        </TherapistCard>
      </section>
    </TherapistPageShell>
  );
}
