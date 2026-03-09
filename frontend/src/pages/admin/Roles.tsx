import { useEffect, useState } from 'react';
import { getAdminUsers, type AdminUserRole } from '../../api/admin.api';

type RoleCounts = Record<AdminUserRole, number>;

const defaultCounts: RoleCounts = {
  admin: 0,
  therapist: 0,
  psychiatrist: 0,
  coach: 0,
  patient: 0,
};

const permissionsByRole: Record<AdminUserRole, string[]> = {
  patient: ['read_own_profile', 'book_session', 'view_therapists'],
  therapist: ['read_own_profile', 'manage_sessions', 'view_earnings'],
  psychiatrist: ['read_own_profile', 'manage_sessions', 'clinical_assessments', 'prescriptions'],
  coach: ['read_own_profile', 'manage_sessions_limited', 'engagement_support'],
  admin: ['read_all_profiles', 'manage_users', 'manage_therapists', 'view_analytics'],
};

const roleOrder: AdminUserRole[] = ['admin', 'therapist', 'psychiatrist', 'coach', 'patient'];

export default function AdminRolesPage() {
  const [counts, setCounts] = useState<RoleCounts>(defaultCounts);
  const [totalUsers, setTotalUsers] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState('-');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRoleOverview = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const [allUsers, admins, therapists, psychiatrists, coaches, patients] = await Promise.all([
          getAdminUsers({ page: 1, limit: 1, status: 'active' }),
          getAdminUsers({ page: 1, limit: 1, role: 'admin', status: 'active' }),
          getAdminUsers({ page: 1, limit: 1, role: 'therapist', status: 'active' }),
          getAdminUsers({ page: 1, limit: 1, role: 'psychiatrist', status: 'active' }),
          getAdminUsers({ page: 1, limit: 1, role: 'coach', status: 'active' }),
          getAdminUsers({ page: 1, limit: 1, role: 'patient', status: 'active' }),
        ]);

        setTotalUsers(allUsers.data.meta.totalItems);
        setCounts({
          admin: admins.data.meta.totalItems,
          therapist: therapists.data.meta.totalItems,
          psychiatrist: psychiatrists.data.meta.totalItems,
          coach: coaches.data.meta.totalItems,
          patient: patients.data.meta.totalItems,
        });

        const latestUser = allUsers.data.data[0];
        if (latestUser?.updatedAt) {
          setLastUpdatedAt(
            new Date(latestUser.updatedAt).toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load RBAC overview.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadRoleOverview();
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="font-display text-xl font-bold text-ink-800">Role Management (RBAC)</h2>
        <p className="mt-1 text-sm text-ink-600">
          Live role distribution with permission matrix aligned to backend RBAC middleware.
        </p>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <RoleStat label="Total Active Users" value={String(totalUsers)} />
        <RoleStat label="Admins" value={String(counts.admin)} />
        <RoleStat label="Therapists" value={String(counts.therapist)} />
        <RoleStat label="Psychiatrists" value={String(counts.psychiatrist)} />
        <RoleStat label="Coaches" value={String(counts.coach)} />
        <RoleStat label="Patients" value={String(counts.patient)} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
          <div className="border-b border-ink-100 px-4 py-3">
            <h3 className="font-display text-base font-bold text-ink-800">Permission Matrix</h3>
            <p className="mt-1 text-xs text-ink-500">Source: `backend/src/middleware/rbac.middleware.ts`</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink-100">
              <thead className="bg-ink-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Permissions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 bg-white">
                {roleOrder.map((role) => (
                  <tr key={role}>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold capitalize text-ink-700">{role}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-700">{permissionsByRole[role].join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <h3 className="font-display text-base font-bold text-ink-800">Role Assignment Audit Snapshot</h3>
          <p className="mt-1 text-xs text-ink-500">
            This panel tracks the latest refresh point and role composition from the production user dataset.
          </p>
          <div className="mt-4 space-y-3">
            <AuditRow label="Data Refresh" value={isLoading ? 'Refreshing...' : lastUpdatedAt} />
            <AuditRow label="Admin Coverage" value={`${counts.admin} of ${totalUsers} users`} />
            <AuditRow label="Therapist Coverage" value={`${counts.therapist} of ${totalUsers} users`} />
            <AuditRow label="Psychiatrist Coverage" value={`${counts.psychiatrist} of ${totalUsers} users`} />
            <AuditRow label="Coach Coverage" value={`${counts.coach} of ${totalUsers} users`} />
            <AuditRow label="Patient Coverage" value={`${counts.patient} of ${totalUsers} users`} />
          </div>
          <div className="mt-4 rounded-lg border border-dashed border-ink-200 bg-ink-50 px-3 py-2 text-xs text-ink-600">
            Role edits are currently read-only in this UI because no role assignment mutation endpoint is exposed yet.
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-ink-800">{value}</p>
    </div>
  );
}

function AuditRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-0.5 text-sm text-ink-800">{value}</p>
    </div>
  );
}
