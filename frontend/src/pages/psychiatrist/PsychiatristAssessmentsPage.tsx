import { useEffect, useState } from 'react';
import { psychiatristApi } from '../../api/psychiatrist.api';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';

export default function PsychiatristAssessmentsPage() {
  const { selectedPatientId } = useProviderDashboardContext();
  const [items, setItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [chiefComplaint, setChiefComplaint] = useState('Persistent low mood and lack of motivation');

  const load = async () => {
    const res = await psychiatristApi.listAssessments(selectedPatientId || undefined);
    setItems(res.items || []);
  };

  useEffect(() => { void load(); }, [selectedPatientId]);

  const createAssessment = async () => {
    if (!selectedPatientId) return;
    setSaving(true);
    try {
      await psychiatristApi.createAssessment({
        patientId: selectedPatientId,
        chiefComplaint,
        symptoms: [{ name: 'Low Mood', severity: 7 }, { name: 'Sleep Issues', severity: 6 }],
        durationWeeks: 6,
        clinicalImpression: 'Major Depressive Disorder',
        severity: 'Moderate',
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">New Psychiatric Assessment</h2>
        <textarea className="w-full rounded border border-slate-300 p-2 text-sm" rows={3} value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} />
        <button disabled={!selectedPatientId || saving} onClick={() => void createAssessment()} className="mt-2 rounded bg-teal-600 px-3 py-1.5 text-sm text-white disabled:opacity-40">{saving ? 'Saving...' : 'Create Assessment'}</button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Assessment History</h2>
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.id} className="rounded border border-slate-100 p-2">
              <div className="font-medium">{item.clinical_impression || 'No impression'}</div>
              <div className="text-slate-500">Severity: {item.severity || '-'} | Complaint: {item.chief_complaint}</div>
            </li>
          ))}
          {items.length === 0 ? <li className="text-slate-500">No assessments yet.</li> : null}
        </ul>
      </div>
    </div>
  );
}
