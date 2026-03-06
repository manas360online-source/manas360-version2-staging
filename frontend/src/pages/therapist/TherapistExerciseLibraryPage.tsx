import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardPlus, Edit3, Plus, Trash2 } from 'lucide-react';
import { therapistApi, type TherapistExerciseItem } from '../../api/therapist.api';
import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import { TherapistEmptyState, TherapistErrorState, TherapistLoadingState } from '../../components/therapist/dashboard/TherapistDataState';
import TherapistModeGate from '../../components/therapist/dashboard/TherapistModeGate';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';

export default function TherapistExerciseLibraryPage() {
  const { dashboardMode } = useProviderDashboardContext();
  const [items, setItems] = useState<TherapistExerciseItem[]>([]);
  const [editingId, setEditingId] = useState<string>('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Thought Record');
  const [worksheetUrl, setWorksheetUrl] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editing = useMemo(() => items.find((item) => item.id === editingId) || null, [items, editingId]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await therapistApi.getExercises();
      setItems(res.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resetForm = () => {
    setEditingId('');
    setName('');
    setCategory('Thought Record');
    setWorksheetUrl('');
    setAssignedTo('');
  };

  const startEdit = (item: TherapistExerciseItem) => {
    setEditingId(item.id);
    setName(item.name);
    setCategory(item.category);
    setWorksheetUrl(item.worksheetUrl);
    setAssignedTo(item.assignedTo);
  };

  const saveExercise = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        await therapistApi.updateExercise(editingId, {
          name: trimmedName,
          category,
          worksheetUrl: worksheetUrl.trim(),
          assignedTo: assignedTo.trim(),
        });
        await load();
        resetForm();
        return;
      }

      await therapistApi.createExercise({
        name: trimmedName,
        category,
        worksheetUrl: worksheetUrl.trim(),
        assignedTo: assignedTo.trim(),
        status: 'active',
      });
      await load();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save exercise');
    } finally {
      setSaving(false);
    }
  };

  const deleteExercise = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      await therapistApi.deleteExercise(id);
      await load();
      if (editingId === id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete exercise');
    } finally {
      setSaving(false);
    }
  };

  const markCompletionBoost = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      await therapistApi.trackExerciseCompletion(id, 10);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to track completion');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TherapistPageShell title="Exercise Library" subtitle="Create CBT exercises, assign them to patients, and track completion trends.">
      {dashboardMode !== 'professional' ? (
        <TherapistModeGate
          requiredMode="professional"
          title="Exercise Library Available in Professional Mode"
          description="Exercise assignment is part of clinical treatment and available only in Professional Mode."
        />
      ) : null}

      {dashboardMode === 'professional' ? (
        <>
          {loading ? <TherapistLoadingState title="Loading exercises" description="Fetching exercise library from backend." /> : null}
          {error ? <TherapistErrorState title="Exercise action failed" description={error} onRetry={() => void load()} /> : null}

          <TherapistCard className="p-5">
            <h3 className="font-display text-base font-bold text-ink-800">{editing ? 'Edit Exercise' : 'Create Exercise'}</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm text-ink-500">
                Exercise Name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
                  placeholder="Thought Record Worksheet"
                />
              </label>
              <label className="text-sm text-ink-500">
                Category
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
                >
                  <option>Thought Record</option>
                  <option>Behavior Activation</option>
                  <option>Cognitive Restructuring</option>
                  <option>Exposure Therapy</option>
                  <option>Breathing Exercise</option>
                </select>
              </label>
              <label className="text-sm text-ink-500">
                Worksheet URL
                <input
                  value={worksheetUrl}
                  onChange={(event) => setWorksheetUrl(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
                  placeholder="https://...pdf"
                />
              </label>
              <label className="text-sm text-ink-500">
                Assign to Patient
                <input
                  value={assignedTo}
                  onChange={(event) => setAssignedTo(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
                  placeholder="Patient Name"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {editing ? (
                <TherapistButton variant="secondary" onClick={resetForm}>
                  Cancel
                </TherapistButton>
              ) : null}
              <TherapistButton onClick={saveExercise}>
                <Plus className="h-4 w-4" />
                {saving ? 'Saving...' : editing ? 'Update Exercise' : 'Create Exercise'}
              </TherapistButton>
            </div>
          </TherapistCard>

          {!loading && items.length === 0 ? (
            <TherapistEmptyState title="No exercises yet" description="Create your first CBT worksheet or exercise to start assignments." />
          ) : (
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {items.map((item) => (
                <TherapistCard key={item.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-display text-base font-bold text-ink-800">{item.name}</h4>
                      <p className="text-xs text-ink-500">{item.category}</p>
                    </div>
                    <TherapistBadge label={item.status === 'active' ? 'Active' : 'Archived'} variant={item.status === 'active' ? 'success' : 'default'} />
                  </div>

                  <div className="mt-3 space-y-2 text-xs text-ink-600">
                    <p className="flex items-center gap-2"><ClipboardPlus className="h-3.5 w-3.5 text-sage-600" />Assigned to: {item.assignedTo || 'Not assigned'}</p>
                    <p className="truncate">Worksheet: {item.worksheetUrl || 'Not provided'}</p>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-ink-500">
                      <span>Completion</span>
                      <span>{item.completionRate}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-ink-100">
                      <div className="h-2 rounded-full bg-sage-500" style={{ width: `${item.completionRate}%` }} />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <TherapistButton variant="secondary" className="min-h-[34px] px-3 py-1 text-xs" onClick={() => startEdit(item)}>
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </TherapistButton>
                    <TherapistButton variant="soft" className="min-h-[34px] px-3 py-1 text-xs" onClick={() => markCompletionBoost(item.id)}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Track Completion
                    </TherapistButton>
                    <TherapistButton variant="secondary" className="min-h-[34px] px-3 py-1 text-xs" onClick={() => deleteExercise(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </TherapistButton>
                  </div>
                </TherapistCard>
              ))}
            </section>
          )}
        </>
      ) : null}
    </TherapistPageShell>
  );
}
