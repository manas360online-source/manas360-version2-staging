import { useEffect, useMemo, useState } from 'react';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import { psychologistApi } from '../../api/psychologist.api';
import { TherapistEmptyState, TherapistErrorState, TherapistLoadingState } from '../../components/therapist/dashboard/TherapistDataState';

export default function PsychologistTreatmentPlansPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [p, a] = await Promise.all([psychologistApi.getPatients(), psychologistApi.getAssessments()]);
        setPatients(p.items || []);
        setAssessments(a.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load treatment plans');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const plans = useMemo(() => {
    return patients.map((p: any) => {
      const count = assessments.filter((a: any) => String(a.patient_id) === String(p.patientProfileId)).length;
      return {
        id: p.patientProfileId,
        patient: p.patientName,
        diagnosis: count > 2 ? 'Mood & Anxiety Symptoms' : 'Initial Evaluation',
        plan: count > 2 ? '8-week CBT' : '4-week assessment protocol',
        status: count > 0 ? 'Active' : 'Draft',
      };
    }).filter((x) => x.patient.toLowerCase().includes(search.toLowerCase()));
  }, [patients, assessments, search]);

  return (
    <TherapistPageShell title="Treatment Plans" subtitle="Create and track treatment pathways from diagnosis to recovery.">
      {loading ? <TherapistLoadingState title="Loading plans" description="Compiling treatment plans from patient data." /> : null}
      {error ? <TherapistErrorState title="Could not load plans" description={error} onRetry={() => window.location.reload()} /> : null}
      <TherapistCard className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Plan Registry</h3>
          <TherapistButton variant="primary">Create Plan</TherapistButton>
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient..." className="mb-3 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm" />
        {plans.length === 0 ? <TherapistEmptyState title="No plans found" description="No treatment plans match your search." /> : null}
        <div className="space-y-2">
          {plans.map((p) => (
            <div key={p.id} className="rounded-lg border border-ink-100 px-3 py-2 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{p.patient}</p>
                <p className="text-xs text-ink-500">{p.diagnosis} - {p.plan}</p>
              </div>
              <TherapistButton variant="secondary">Open</TherapistButton>
            </div>
          ))}
        </div>
      </TherapistCard>
    </TherapistPageShell>
  );
}
