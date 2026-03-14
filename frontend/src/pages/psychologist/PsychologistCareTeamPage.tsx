import { useEffect, useMemo, useState } from 'react';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import { psychologistApi } from '../../api/psychologist.api';
import { TherapistEmptyState, TherapistErrorState, TherapistLoadingState } from '../../components/therapist/dashboard/TherapistDataState';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';

export default function PsychologistCareTeamPage() {
  const { selectedPatientId } = useProviderDashboardContext();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (selectedPatientId) {
          const overview = await psychologistApi.getPatientOverview(selectedPatientId);
          setMembers(overview.careTeam || []);
        } else {
          setMembers([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load care team members');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [selectedPatientId]);

  const filteredMembers = useMemo(() => {
    const dedupedMembers = members.reduce<any[]>((acc, member) => {
      const uniqueId = String(member?.id || member?.assignmentId || '').trim();
      if (!uniqueId) {
        acc.push(member);
        return acc;
      }
      const exists = acc.some((item) => String(item?.id || item?.assignmentId || '').trim() === uniqueId);
      if (!exists) {
        acc.push(member);
      }
      return acc;
    }, []);

    return dedupedMembers.filter((m) => String(m.name || '').toLowerCase().includes(search.toLowerCase()) || String(m.role || '').toLowerCase().includes(search.toLowerCase()));
  }, [members, search]);

  return (
    <TherapistPageShell title="Care Team" subtitle="View and connect with the selected patient's care team.">
      {loading ? <TherapistLoadingState title="Loading care team" description="Syncing collaboration members." /> : null}
      {error ? <TherapistErrorState title="Could not load care team" description={error} onRetry={() => window.location.reload()} /> : null}
      <TherapistCard className="p-4">
        {!selectedPatientId ? <TherapistEmptyState title="Select a patient" description="Choose a patient from the top 'Select Patient' dropdown to view care team details." /> : null}
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search care team..." className="mb-3 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm" />
        {selectedPatientId && filteredMembers.length === 0 ? <TherapistEmptyState title="No team members found" description="No care team is assigned for this patient yet." /> : null}
        <div className="space-y-2">
          {filteredMembers.map((m) => (
            <div key={m.assignmentId || m.id} className="rounded-lg border border-ink-100 px-3 py-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-ink-800">{m.name}</p>
                <p className="text-xs text-ink-500">{m.role}</p>
              </div>
              <div className="flex gap-2">
                {m.email ? (
                  <a href={`mailto:${m.email}`} className="inline-flex min-h-[34px] items-center rounded-lg border border-ink-100 px-3 py-1 text-xs text-ink-700 hover:bg-ink-100">
                    Email
                  </a>
                ) : null}
                <TherapistButton variant="secondary">Message</TherapistButton>
              </div>
            </div>
          ))}
        </div>
      </TherapistCard>
    </TherapistPageShell>
  );
}
