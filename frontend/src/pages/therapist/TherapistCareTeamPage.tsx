import { useEffect, useMemo, useState } from 'react';
import { Edit3, Plus, Save, Trash2 } from 'lucide-react';
import { therapistApi, type TherapistCareTeamMemberItem } from '../../api/therapist.api';
import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import { TherapistErrorState, TherapistLoadingState } from '../../components/therapist/dashboard/TherapistDataState';
import TherapistModeGate from '../../components/therapist/dashboard/TherapistModeGate';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';

export default function TherapistCareTeamPage() {
  const { dashboardMode, selectedPatientId } = useProviderDashboardContext();
  const [members, setMembers] = useState<TherapistCareTeamMemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState('');
  const [role, setRole] = useState('Therapist');
  const [name, setName] = useState('');
  const [treatment, setTreatment] = useState('');
  const [notes, setNotes] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [prescriptions, setPrescriptions] = useState('');

  const patientHint = useMemo(() => {
    if (!selectedPatientId) return 'All patients overview';
    return `Patient context ID: ${selectedPatientId}`;
  }, [selectedPatientId]);

  const resetForm = () => {
    setEditingId('');
    setRole('Therapist');
    setName('');
    setTreatment('');
    setNotes('');
    setSuggestions('');
    setPrescriptions('');
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await therapistApi.getCareTeam(selectedPatientId ? { patientId: selectedPatientId } : undefined);
      setMembers(res.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load care team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [selectedPatientId]);

  const startEdit = (member: TherapistCareTeamMemberItem) => {
    setEditingId(member.id);
    setRole(member.role || 'Therapist');
    setName(member.name || '');
    setTreatment(member.treatment || '');
    setNotes(member.notes || '');
    setSuggestions(member.suggestions || '');
    setPrescriptions(member.prescriptions || '');
  };

  const save = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setSaving(true);
    setError(null);
    try {
      const payload = {
        role,
        name: trimmedName,
        treatment: treatment.trim(),
        notes: notes.trim(),
        suggestions: suggestions.trim(),
        prescriptions: prescriptions.trim(),
        patientId: selectedPatientId || undefined,
      };

      if (editingId) {
        await therapistApi.updateCareTeamMember(editingId, payload);
      } else {
        await therapistApi.createCareTeamMember(payload);
      }

      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save care team member');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      await therapistApi.deleteCareTeamMember(id);
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete care team member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TherapistPageShell title="Care Team" subtitle="Review psychiatrist, therapist, and coach care contributions with treatment context.">
      {dashboardMode !== 'professional' ? (
        <TherapistModeGate
          requiredMode="professional"
          title="Care Team Available in Professional Mode"
          description="Cross-provider care planning is available only in Professional Mode."
        />
      ) : null}

      {dashboardMode === 'professional' ? (
        <>
          {loading ? <TherapistLoadingState title="Loading care team" description="Fetching care team records from backend." /> : null}
          {error ? <TherapistErrorState title="Care team action failed" description={error} onRetry={() => void load()} /> : null}

          <TherapistCard className="p-5">
            <p className="text-sm text-ink-600">{patientHint}</p>
          </TherapistCard>

          <TherapistCard className="p-5">
            <h3 className="font-display text-base font-bold text-ink-800">{editingId ? 'Edit Care Member' : 'Add Care Member'}</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0">
                <option>Psychiatrist</option>
                <option>Therapist</option>
                <option>Coach</option>
              </select>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Member name" className="rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0" />
              <input value={treatment} onChange={(event) => setTreatment(event.target.value)} placeholder="Treatment plan" className="rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0" />
              <input value={prescriptions} onChange={(event) => setPrescriptions(event.target.value)} placeholder="Prescriptions" className="rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0" />
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Clinical notes" className="rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0" rows={3} />
              <textarea value={suggestions} onChange={(event) => setSuggestions(event.target.value)} placeholder="Suggestions" className="rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0" rows={3} />
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {editingId ? <TherapistButton variant="secondary" onClick={resetForm}>Cancel</TherapistButton> : null}
              <TherapistButton onClick={() => void save()}>
                {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {saving ? 'Saving...' : editingId ? 'Update Member' : 'Add Member'}
              </TherapistButton>
            </div>
          </TherapistCard>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {members.map((member) => (
              <TherapistCard key={member.id} className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-ink-800">{member.name}</h3>
                  <TherapistBadge label={member.role} variant={member.role === 'Psychiatrist' ? 'warning' : member.role === 'Therapist' ? 'sage' : 'default'} />
                </div>
                <div className="space-y-2 text-sm text-ink-700">
                  <p><span className="font-semibold">Treatment Plan:</span> {member.treatment}</p>
                  <p><span className="font-semibold">Notes:</span> {member.notes}</p>
                  <p><span className="font-semibold">Suggestions:</span> {member.suggestions}</p>
                  <p><span className="font-semibold">Prescriptions:</span> {member.prescriptions}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <TherapistButton variant="secondary" className="min-h-[34px] px-3 py-1 text-xs" onClick={() => startEdit(member)}>
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </TherapistButton>
                  <TherapistButton variant="secondary" className="min-h-[34px] px-3 py-1 text-xs" onClick={() => void remove(member.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
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
