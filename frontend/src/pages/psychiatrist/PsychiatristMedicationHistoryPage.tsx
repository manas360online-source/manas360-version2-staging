import { useEffect, useState } from 'react';
import { psychiatristApi } from '../../api/psychiatrist.api';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';

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
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Dosage Adjustment History</h2>
        <button className="rounded bg-teal-600 px-3 py-1.5 text-sm text-white" disabled={!selectedPatientId} onClick={() => void addEntry()}>Add Entry</button>
      </div>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-2">Medication</th><th>Old</th><th>New</th><th>Reason</th><th>Outcome</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-slate-100">
              <td className="py-2">{item.medication}</td>
              <td>{item.old_dose || '-'}</td>
              <td>{item.new_dose || '-'}</td>
              <td>{item.reason || '-'}</td>
              <td>{item.outcome || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
