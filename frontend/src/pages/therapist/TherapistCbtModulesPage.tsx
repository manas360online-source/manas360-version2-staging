import { useEffect, useState } from 'react';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import { therapistApi, type TherapistCbtModuleItem } from '../../api/therapist.api';
import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import { TherapistErrorState, TherapistLoadingState } from '../../components/therapist/dashboard/TherapistDataState';
import TherapistModeGate from '../../components/therapist/dashboard/TherapistModeGate';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';

export default function TherapistCbtModulesPage() {
  const { dashboardMode } = useProviderDashboardContext();
  const [rows, setRows] = useState<TherapistCbtModuleItem[]>([]);
  const [title, setTitle] = useState('');
  const [approach, setApproach] = useState('Thought Record');
  const [assignedPatient, setAssignedPatient] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await therapistApi.getCbtModules();
      setRows(res.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load CBT modules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    const t = title.trim();
    if (!t) return;

    setSaving(true);
    setError(null);
    try {
      await therapistApi.createCbtModule({
        title: t,
        approach,
        assignedPatient: assignedPatient.trim(),
        status: assignedPatient.trim() ? 'active' : 'draft',
      });
      setTitle('');
      setAssignedPatient('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create CBT module');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      await therapistApi.deleteCbtModule(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete CBT module');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TherapistPageShell title="CBT Modules" subtitle="Create and assign structured CBT interventions for patient treatment plans.">
      {dashboardMode !== 'professional' ? (
        <TherapistModeGate
          requiredMode="professional"
          title="CBT Modules Available in Professional Mode"
          description="CBT interventions are part of clinical care workflows and available only in Professional Mode."
        />
      ) : null}

      {dashboardMode === 'professional' ? (
        <>
          {loading ? <TherapistLoadingState title="Loading CBT modules" description="Fetching module library from backend." /> : null}
          {error ? <TherapistErrorState title="CBT module action failed" description={error} onRetry={() => void load()} /> : null}

          <TherapistCard className="p-5">
            <h3 className="font-display text-base font-bold text-ink-800">Create CBT Module</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Module name"
                className="rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
              />
              <select
                value={approach}
                onChange={(event) => setApproach(event.target.value)}
                className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
              >
                <option>Thought Record</option>
                <option>Behavior Activation</option>
                <option>Cognitive Restructuring</option>
                <option>Exposure Therapy</option>
              </select>
              <input
                value={assignedPatient}
                onChange={(event) => setAssignedPatient(event.target.value)}
                placeholder="Assign patient (optional)"
                className="rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <TherapistButton onClick={create}><Plus className="h-4 w-4" />{saving ? 'Saving...' : 'Create Module'}</TherapistButton>
            </div>
          </TherapistCard>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {rows.map((row) => (
              <TherapistCard key={row.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-display text-base font-bold text-ink-800">{row.title}</h4>
                    <p className="text-xs text-ink-500">{row.approach}</p>
                  </div>
                  <TherapistBadge label={row.status === 'active' ? 'Assigned' : 'Draft'} variant={row.status === 'active' ? 'success' : 'default'} />
                </div>
                <p className="mt-2 text-sm text-ink-600">Patient: {row.assignedPatient || 'Not assigned'}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <TherapistButton variant="secondary" className="min-h-[34px] px-3 py-1 text-xs"><Edit3 className="h-3.5 w-3.5" />Edit</TherapistButton>
                    <TherapistButton variant="secondary" className="min-h-[34px] px-3 py-1 text-xs" onClick={() => void remove(row.id)}><Trash2 className="h-3.5 w-3.5" />Delete</TherapistButton>
                </div>
              </TherapistCard>
            ))}
          </section>
        </>
      ) : null}
    </TherapistPageShell>
  );
}
