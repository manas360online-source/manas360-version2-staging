import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, Users, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  assignPatientToCareTeam,
  fetchProviderCareTeam,
  removePatientFromCareTeam,
  type CareTeamAssignment,
} from '../../../../api/provider';

export default function CareTeamTab() {
  const { patientId } = useParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);

  const { data: careTeam = [], isLoading, isError, refetch } = useQuery<CareTeamAssignment[]>({
    queryKey: ['patientCareTeam', patientId],
    queryFn: fetchProviderCareTeam,
  });

  const assignMutation = useMutation({
    mutationFn: () => {
      if (!patientId) throw new Error('Patient ID required');
      return assignPatientToCareTeam(patientId);
    },
    onSuccess: () => {
      toast.success('Provider added to patient care team');
      void queryClient.invalidateQueries({ queryKey: ['patientCareTeam', patientId] });
      setShowAssignModal(false);
    },
    onError: () => toast.error('Failed to assign provider'),
  });

  const removeMutation = useMutation({
    mutationFn: () => {
      if (!patientId) throw new Error('Patient ID required');
      return removePatientFromCareTeam(patientId);
    },
    onSuccess: () => {
      toast.success('Provider removed from patient care team');
      void queryClient.invalidateQueries({ queryKey: ['patientCareTeam', patientId] });
    },
    onError: () => toast.error('Failed to remove provider'),
  });

  const filtered = useMemo(() => {
    if (!careTeam || careTeam.length === 0) return [];
    const term = search.trim().toLowerCase();
    if (!term) return careTeam;
    return careTeam.filter(
      (entry) =>
        entry.patientName.toLowerCase().includes(term) ||
        entry.patientId.toLowerCase().includes(term),
    );
  }, [search, careTeam]);

  const handleAssign = () => {
    if (!patientId) {
      toast.error('Patient ID required');
      return;
    }
    assignMutation.mutate();
  };

  const summarizeAccessScope = (accessScope: Record<string, boolean>) => {
    const enabledScopes = Object.entries(accessScope || {})
      .filter(([, enabled]) => enabled)
      .map(([scope]) => scope);

    return enabledScopes.length > 0 ? enabledScopes.join(', ') : 'View only';
  };

  return (
    <div className="space-y-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-w-[280px] flex-1 items-center gap-2 rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 sm:flex-none">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient name"
            className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => setShowAssignModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#4A6741] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2D4128]"
        >
          <UserPlus className="h-4 w-4" />
          Add Patient
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={`ct-skel-${idx}`} className="h-16 animate-pulse rounded-xl border border-[#E5E5E5] bg-[#FAFAF8]" />
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
            {search ? 'No patients match your search' : 'No patients assigned yet'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {search ? 'Try a different search term.' : 'Use "Add Patient" to assign this patient to your care team.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#E5E5E5] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#FAFAF8]">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Access</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Assigned</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry: CareTeamAssignment) => (
                  <tr key={entry.assignmentId} className="border-b border-[#E5E5E5] last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8EFE6] text-xs font-bold text-[#4A6741]">
                          {entry.patientName.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-sm font-semibold text-[#2D4128]">{entry.patientName}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 capitalize">{summarizeAccessScope(entry.accessScope)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {entry.assignedAt ? new Date(entry.assignedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove ${entry.patientName} from care team?`)) {
                            removeMutation.mutate();
                          }
                        }}
                        disabled={removeMutation.isPending}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[#2D4128]">Add Patient to Care Team</h3>
            <p className="mt-1 text-sm text-slate-500">Add this patient to your active care team roster.</p>
            <div className="mt-4 rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-4 text-sm text-slate-700">
              {patientId ? `Patient ID: ${patientId}` : 'Patient ID is required to complete this action.'}
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssign}
                disabled={assignMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-[#4A6741] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {assignMutation.isPending ? 'Adding...' : 'Add Patient'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
