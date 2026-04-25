import { useMemo, useState } from 'react';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import { psychiatristApi } from '../../api/psychiatrist.api';

const FOLLOW_UP_TYPES = [
  'Medication Check (15 min)',
  'Med + Therapy (30 min)',
  'Full Evaluation (60 min)',
  'Crisis Session',
];

export default function PsychiatristConsultationsPage() {
  const { selectedPatientId } = useProviderDashboardContext();
  const [followUpType, setFollowUpType] = useState(FOLLOW_UP_TYPES[0]);
  const [followUpAt, setFollowUpAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string>('');

  const defaultDateTime = useMemo(() => {
    if (followUpAt) return followUpAt;
    const date = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${hh}:${mm}`;
  }, [followUpAt]);

  const scheduleFollowUp = async () => {
    if (!selectedPatientId) return;
    setSaving(true);
    setResult('');
    try {
      const response = await psychiatristApi.createFollowUp({
        patientId: selectedPatientId,
        type: followUpType,
        dateTime: new Date(defaultDateTime).toISOString(),
      });
      setResult(`Scheduled: ${response.bookingReferenceId || 'follow-up'} | reminders: 3 days, 1 day, 2 hours`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <TherapistPageShell
      title="Consultations"
      subtitle="Schedule medication checks and psychiatric follow-ups with reminder workflow."
    >
      <TherapistCard>
        <div className="border-b border-ink-100 px-4 py-3">
          <h3 className="font-display text-lg font-semibold text-ink-800">Follow-up Scheduling</h3>
          <p className="mt-1 text-sm text-ink-500">Medication Check, Med + Therapy, Full Evaluation, or Crisis Session.</p>
        </div>
        <div className="space-y-3 px-4 py-4">
          <label className="block text-sm text-ink-600">
            Type
            <select
              value={followUpType}
              onChange={(event) => setFollowUpType(event.target.value)}
              className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 focus:border-sage-300 focus:outline-none"
            >
              {FOLLOW_UP_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-ink-600">
            Date and Time
            <input
              type="datetime-local"
              value={defaultDateTime}
              onChange={(event) => setFollowUpAt(event.target.value)}
              className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 focus:border-sage-300 focus:outline-none"
            />
          </label>

          <TherapistButton disabled={!selectedPatientId || saving} onClick={() => void scheduleFollowUp()}>
            {saving ? 'Scheduling...' : 'Schedule Follow-up'}
          </TherapistButton>

          {result ? <p className="text-sm text-sage-600">{result}</p> : null}
          {!selectedPatientId ? <p className="text-sm text-ink-500">Select a patient in header to schedule a consultation.</p> : null}
        </div>
      </TherapistCard>
    </TherapistPageShell>
  );
}
