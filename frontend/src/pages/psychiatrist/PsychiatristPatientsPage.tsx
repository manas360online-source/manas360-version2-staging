import { useEffect, useState } from 'react';
import { psychiatristApi, type PsychiatristPatient } from '../../api/psychiatrist.api';

export default function PsychiatristPatientsPage() {
  const [items, setItems] = useState<PsychiatristPatient[]>([]);

  useEffect(() => {
    void psychiatristApi.getPatients().then((res) => setItems(res.items || []));
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold">Patients</h2>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2">Name</th><th>Age</th><th>Last Session</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.patientId} className="border-t border-slate-100">
                <td className="py-2">{row.name}</td><td>{row.age}</td><td>{row.lastSessionAt || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
