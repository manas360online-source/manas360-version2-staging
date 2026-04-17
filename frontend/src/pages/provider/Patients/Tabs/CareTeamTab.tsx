import { useQuery } from '@tanstack/react-query';
import { Users, Search, Stethoscope } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPatientCareTeam, type PatientCareTeamMember } from '../../../../api/provider';

const toReadable = (value: string | null | undefined): string => {
  const normalized = String(value || '').trim();
  if (!normalized) return 'Not available';
  return normalized
    .toLowerCase()
    .split(/[_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatDate = (iso: string | null): string => {
  if (!iso) return 'Not available';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Not available';
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};

export default function CareTeamTab() {
  const { patientId } = useParams();
  const [search, setSearch] = useState('');

  const { data: members = [], isLoading, isError, refetch } = useQuery<PatientCareTeamMember[]>({
    queryKey: ['patientCareTeamMembers', patientId],
    enabled: Boolean(patientId),
    queryFn: () => fetchPatientCareTeam(String(patientId)),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return members;
    return members.filter((member) =>
      member.providerName.toLowerCase().includes(term)
      || String(member.providerRole || '').toLowerCase().includes(term)
      || String(member.providerType || '').toLowerCase().includes(term),
    );
  }, [members, search]);

  return (
    <div className="space-y-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-w-[280px] flex-1 items-center gap-2 rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 sm:flex-none">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by provider name or role"
            className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none"
          />
        </label>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={`ct-skel-${idx}`} className="h-24 animate-pulse rounded-xl border border-[#E5E5E5] bg-[#FAFAF8]" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
          <p className="text-sm font-semibold">Unable to load care team</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAF8] p-10 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-[#2D4128]">
            {search ? 'No care team members match your search' : 'No care team members found for this patient'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            This tab shows providers who are already assigned/consulted for this patient.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((member) => (
            <div key={member.assignmentId} className="rounded-xl border border-[#E5E5E5] bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-[#4A6741]" />
                    <p className="text-sm font-semibold text-[#2D4128]">{member.providerName}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {toReadable(member.providerRole)}{member.providerType ? ` • ${toReadable(member.providerType)}` : ''}
                  </p>
                  {member.providerEmail ? (
                    <p className="mt-1 text-xs text-slate-500">{member.providerEmail}</p>
                  ) : null}
                </div>

                <div className="text-xs text-slate-500">
                  <p>Assigned: {formatDate(member.assignedAt)}</p>
                  <p>Sessions: {member.sessionCount}</p>
                  <p>Last Session: {formatDate(member.lastSessionDate)}</p>
                  <p>Status: {toReadable(member.lastSessionStatus)}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-2 rounded-lg bg-[#FAFAF8] p-3 text-xs text-slate-700">
                <p>
                  <span className="font-semibold text-[#2D4128]">Treatment Plan:</span>{' '}
                  {member.lastTreatmentPlan || 'Not documented yet'}
                </p>
                <p>
                  <span className="font-semibold text-[#2D4128]">Assessment Summary:</span>{' '}
                  {member.lastAssessmentSummary || 'Not documented yet'}
                </p>
                <p>
                  <span className="font-semibold text-[#2D4128]">Last Clinical Update:</span>{' '}
                  {formatDate(member.lastClinicalUpdateAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
