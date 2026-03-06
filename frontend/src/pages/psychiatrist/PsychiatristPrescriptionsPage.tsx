import { useEffect, useState } from 'react';
import { psychiatristApi } from '../../api/psychiatrist.api';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';

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
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Prescription Builder</h2>
        <input className="w-full rounded border border-slate-300 p-2 text-sm" value={drugName} onChange={(e) => setDrugName(e.target.value)} />
        <div className="mt-2 flex gap-2">
          <button className="rounded bg-teal-600 px-3 py-1.5 text-sm text-white" disabled={!selectedPatientId} onClick={() => void createPrescription()}>Create Prescription</button>
          <button className="rounded border border-slate-300 px-3 py-1.5 text-sm" onClick={() => void checkInteraction()}>Check Interaction</button>
        </div>
        {result ? <p className="mt-2 text-sm text-slate-700">{result}</p> : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Prescriptions</h2>
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.id} className="rounded border border-slate-100 p-2">
              {item.drug_name} {item.starting_dose ? `(${item.starting_dose})` : ''} - {item.frequency || '-'}
            </li>
          ))}
          {items.length === 0 ? <li className="text-slate-500">No prescriptions yet.</li> : null}
        </ul>
      </div>
    </div>
  );
}
