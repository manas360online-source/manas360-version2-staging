import { useState } from 'react';
import { psychiatristApi } from '../../api/psychiatrist.api';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

const severityStyles: Record<string, string> = {
  CRITICAL: 'bg-red-50 text-red-700 border-red-100',
  CAUTION: 'bg-amber-50 text-amber-700 border-amber-100',
  MONITOR: 'bg-sky-50 text-sky-700 border-sky-100',
  NONE: 'bg-sage-50 text-sage-700 border-sage-100',
};

export default function PsychiatristDrugInteractionsPage() {
  const { selectedPatientId } = useProviderDashboardContext();
  const [medications, setMedications] = useState('Sertraline');
  const [supplements, setSupplements] = useState('');
  const [herbals, setHerbals] = useState('Ashwagandha');
  const [justification, setJustification] = useState('');
  const [resolution, setResolution] = useState<'monitoring' | 'adjust-dose' | 'override'>('monitoring');
  const [result, setResult] = useState<{ level: string; warnings: any[] } | null>(null);

  const splitList = (value: string): string[] =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const runCheck = async () => {
    const response = await psychiatristApi.checkInteractions({
      patientId: selectedPatientId || undefined,
      medications: splitList(medications),
      supplements: splitList(supplements),
      herbals: splitList(herbals),
      resolution,
      overrideJustification: justification || undefined,
    });
    setResult(response);
  };

  const level = result?.level || 'NONE';

  return (
    <TherapistPageShell
      title="Drug Interactions"
      subtitle="Evaluate medication + supplement + herbal combinations before prescribing."
    >
      <section className="grid gap-4 lg:grid-cols-2">
        <TherapistCard>
          <div className="border-b border-ink-100 px-4 py-3">
            <h3 className="font-display text-lg font-semibold text-ink-800">Interaction Checker</h3>
          </div>
          <div className="space-y-3 px-4 py-4">
            <Input label="Current Medications" value={medications} onChange={setMedications} />
            <Input label="Supplements" value={supplements} onChange={setSupplements} />
            <Input label="Herbal Products" value={herbals} onChange={setHerbals} />

            <label className="block text-sm text-ink-600">
              Decision
              <select
                value={resolution}
                onChange={(event) => setResolution(event.target.value as 'monitoring' | 'adjust-dose' | 'override')}
                className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 focus:border-sage-300 focus:outline-none"
              >
                <option value="adjust-dose">Adjust dose</option>
                <option value="monitoring">Accept with monitoring</option>
                <option value="override">Override with justification</option>
              </select>
            </label>

            <label className="block text-sm text-ink-600">
              Override Justification
              <textarea
                value={justification}
                onChange={(event) => setJustification(event.target.value)}
                className="mt-1 min-h-[90px] w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 focus:border-sage-300 focus:outline-none"
              />
            </label>

            <TherapistButton onClick={() => void runCheck()}>Run Interaction Check</TherapistButton>
          </div>
        </TherapistCard>

        <TherapistCard>
          <div className="border-b border-ink-100 px-4 py-3">
            <h3 className="font-display text-lg font-semibold text-ink-800">Result</h3>
          </div>
          <div className="space-y-3 px-4 py-4">
            <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${severityStyles[level] || severityStyles.NONE}`}>
              Level: {level}
            </div>

            {result?.warnings?.length ? (
              result.warnings.map((warning, index) => (
                <div key={`${warning.primarySubstance}-${warning.interactingSubstance}-${index}`} className="rounded-lg border border-ink-100 p-3 text-sm">
                  <p className="font-semibold text-ink-800">{warning.primarySubstance} + {warning.interactingSubstance}</p>
                  <p className="mt-1 text-ink-600">Risk: {warning.risk || '-'}</p>
                  <p className="text-ink-500">Recommendation: {warning.recommendation || '-'}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-500">No interactions found yet.</p>
            )}
          </div>
        </TherapistCard>
      </section>
    </TherapistPageShell>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm text-ink-600">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 focus:border-sage-300 focus:outline-none"
      />
    </label>
  );
}
