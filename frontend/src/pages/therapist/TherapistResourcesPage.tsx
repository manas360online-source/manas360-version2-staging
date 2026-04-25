import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { therapistApi, type TherapistResourceItem } from '../../api/therapist.api';
import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import { TherapistErrorState, TherapistLoadingState } from '../../components/therapist/dashboard/TherapistDataState';
import TherapistModeGate from '../../components/therapist/dashboard/TherapistModeGate';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';

type ResourceType = 'Article' | 'Video' | 'Worksheet' | 'Meditation Audio';

export default function TherapistResourcesPage() {
  const { dashboardMode } = useProviderDashboardContext();
  const [rows, setRows] = useState<TherapistResourceItem[]>([]);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ResourceType>('Article');
  const [assignedTo, setAssignedTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await therapistApi.getResources();
      setRows(res.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resources');
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
      await therapistApi.createResource({
        title: t,
        type,
        assignedTo: assignedTo.trim(),
      });
      setTitle('');
      setAssignedTo('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create resource');
    } finally {
      setSaving(false);
    }
  };

  const trackView = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      await therapistApi.trackResourceView(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to track resource view');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TherapistPageShell title="Resources" subtitle="Upload and assign articles, videos, worksheets, and meditation assets for patient care.">
      {dashboardMode !== 'professional' ? (
        <TherapistModeGate
          requiredMode="professional"
          title="Resources Available in Professional Mode"
          description="Resource assignment is part of treatment workflows and is available only in Professional Mode."
        />
      ) : null}

      {dashboardMode === 'professional' ? (
        <>
          {loading ? <TherapistLoadingState title="Loading resources" description="Fetching assigned resources from backend." /> : null}
          {error ? <TherapistErrorState title="Resource action failed" description={error} onRetry={() => void load()} /> : null}

          <TherapistCard className="p-5">
            <h3 className="font-display text-base font-bold text-ink-800">Upload or Add Resource</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Resource title" className="rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0" />
              <select value={type} onChange={(event) => setType(event.target.value as ResourceType)} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0">
                <option>Article</option>
                <option>Video</option>
                <option>Worksheet</option>
                <option>Meditation Audio</option>
              </select>
              <input value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} placeholder="Assign patient" className="rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0" />
              <TherapistButton onClick={create}><Plus className="h-4 w-4" />{saving ? 'Saving...' : 'Assign Resource'}</TherapistButton>
            </div>
          </TherapistCard>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {rows.map((row) => (
              <TherapistCard key={row.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-display text-base font-bold text-ink-800">{row.title}</h4>
                    <p className="text-xs text-ink-500">{row.type}</p>
                  </div>
                  <TherapistBadge label={row.assignedTo ? 'Assigned' : 'Unassigned'} variant={row.assignedTo ? 'success' : 'default'} />
                </div>
                <p className="mt-2 text-sm text-ink-600">Patient: {row.assignedTo || 'Not assigned'}</p>
                <p className="mt-1 text-xs text-ink-500">Tracked views: {row.views}</p>
                <div className="mt-4 flex justify-end">
                  <TherapistButton variant="secondary" className="min-h-[34px] px-3 py-1 text-xs" onClick={() => void trackView(row.id)}>
                    Track View
                  </TherapistButton>
                </div>
              </TherapistCard>
            ))}
          </section>
        </>
      ) : null}
    </TherapistPageShell>
  );
}
