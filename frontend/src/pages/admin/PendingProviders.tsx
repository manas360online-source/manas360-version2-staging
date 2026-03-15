import { useEffect, useState } from 'react';
import { getAdminUsers, approveProvider, type AdminUser } from '../../api/admin.api';
import { getApiErrorMessage } from '../../api/auth';

const formatDate = (value: string | undefined | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const PROVIDER_ROLES = ['therapist', 'psychiatrist', 'psychologist', 'coach'] as const;

export default function AdminPendingProvidersPage() {
  const [providers, setProviders] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('therapist');

  const loadProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAdminUsers({ page: 1, limit: 100, role: roleFilter as AdminUser['role'], status: 'active' });
      // Filter to providers with onboardingStatus PENDING (field may not yet be returned; show all non-verified)
      const pendingList = response.data.data.filter((u) => !u.isTherapistVerified);
      setProviders(pendingList);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load providers.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  const onApprove = async (providerId: string, providerName: string) => {
    setApprovingId(providerId);
    setError(null);
    setSuccess(null);
    try {
      await approveProvider(providerId);
      setSuccess(`${providerName} has been approved. They will see their dashboard on next login.`);
      await loadProviders();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Approval failed. Please try again.'));
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="rounded-[28px] border border-[#D9E1D5] bg-[radial-gradient(circle_at_top_left,_rgba(21,89,74,0.14),_transparent_35%),linear-gradient(135deg,#F6FBF8_0%,#FFFFFF_62%)] p-8 shadow-[0_18px_60px_rgba(31,41,55,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5C7A72]">Admin · Provider Management</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#23313A]">Pending Provider Approvals</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Review providers who have submitted their onboarding application and are awaiting credential verification. Approving a provider sets their onboarding status to <strong>COMPLETED</strong> and unlocks their dashboard.
        </p>
      </section>

      {/* Role filter */}
      <div className="flex flex-wrap gap-2">
        {PROVIDER_ROLES.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setRoleFilter(role)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium capitalize transition ${roleFilter === role ? 'border-[#285947] bg-[#285947] text-white' : 'border-[#DCE5D9] text-slate-600 hover:border-[#285947] hover:text-[#285947]'}`}
          >
            {role}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-[24px] border border-[#DCE5D9] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#EEF2EA]">
            <thead className="bg-[#F6FBF8]">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#5C7A72]">Provider</th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#5C7A72]">Email</th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#5C7A72]">Role</th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#5C7A72]">Joined</th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#5C7A72]">Status</th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#5C7A72]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2EA] bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                      Loading providers…
                    </div>
                  </td>
                </tr>
              ) : providers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center">
                    <p className="text-sm font-medium text-slate-600">No pending {roleFilter}s found</p>
                    <p className="mt-1 text-xs text-slate-400">All providers in this category have been reviewed.</p>
                  </td>
                </tr>
              ) : (
                providers.map((provider) => {
                  const name = `${provider.firstName ?? ''} ${provider.lastName ?? ''}`.trim() || 'Unnamed Provider';
                  const isApproving = approvingId === provider.id;
                  return (
                    <tr key={provider.id} className="hover:bg-[#F9FBF8] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF3EE] text-sm font-semibold text-[#285947]">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#23313A]">{name}</p>
                            <p className="text-xs text-slate-400">ID: {provider.id.slice(0, 8)}…</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">{provider.email}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-[#EAF3EE] px-2.5 py-1 text-xs font-semibold capitalize text-[#285947]">
                          {provider.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">{formatDate(provider.createdAt)}</td>
                      <td className="px-5 py-4">
                        {provider.isTherapistVerified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Pending Review
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {provider.isTherapistVerified ? (
                          <span className="text-xs text-slate-400">Already approved</span>
                        ) : (
                          <button
                            type="button"
                            disabled={isApproving}
                            onClick={() => void onApprove(provider.id, name)}
                            className="rounded-lg bg-[#285947] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1f4437] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isApproving ? (
                              <span className="flex items-center gap-1.5">
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Approving…
                              </span>
                            ) : (
                              'Approve & Activate'
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && providers.length > 0 && (
          <div className="border-t border-[#EEF2EA] bg-[#F6FBF8] px-5 py-3 text-xs text-slate-500">
            Showing {providers.filter((p) => !p.isTherapistVerified).length} pending · {providers.filter((p) => p.isTherapistVerified).length} already approved
          </div>
        )}
      </div>
    </div>
  );
}
