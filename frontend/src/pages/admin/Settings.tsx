import { useEffect, useState } from 'react';
import { me, type AuthUser } from '../../api/auth';
import { getAdminMetrics, type AdminMetrics } from '../../api/admin.api';

export default function AdminSettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [meRes, metricsRes] = await Promise.all([me(), getAdminMetrics()]);
        setUser(meRes);
        setMetrics(metricsRes.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load settings data.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="font-display text-xl font-bold text-ink-800">Admin Settings</h2>
        <p className="mt-1 text-sm text-ink-600">Live account and platform configuration snapshot from authenticated APIs.</p>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h3 className="font-display text-base font-semibold text-ink-800">My Admin Account</h3>
          {loading ? (
            <p className="mt-3 text-sm text-ink-500">Loading account...</p>
          ) : (
            <div className="mt-3 space-y-2 text-sm text-ink-700">
              <p><span className="font-medium text-ink-800">Name:</span> {`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '-'}</p>
              <p><span className="font-medium text-ink-800">Email:</span> {user?.email || '-'}</p>
              <p><span className="font-medium text-ink-800">Role:</span> {String(user?.role || '-')}</p>
              <p><span className="font-medium text-ink-800">MFA Enabled:</span> {user?.mfaEnabled ? 'Yes' : 'No'}</p>
              <p><span className="font-medium text-ink-800">Email Verified:</span> {user?.emailVerified ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h3 className="font-display text-base font-semibold text-ink-800">Platform Settings Snapshot</h3>
          {loading ? (
            <p className="mt-3 text-sm text-ink-500">Loading platform stats...</p>
          ) : (
            <div className="mt-3 space-y-2 text-sm text-ink-700">
              <p><span className="font-medium text-ink-800">Total Users:</span> {metrics?.totalUsers ?? 0}</p>
              <p><span className="font-medium text-ink-800">Therapists:</span> {metrics?.totalTherapists ?? 0}</p>
              <p><span className="font-medium text-ink-800">Verified Therapists:</span> {metrics?.verifiedTherapists ?? 0}</p>
              <p><span className="font-medium text-ink-800">Completed Sessions:</span> {metrics?.completedSessions ?? 0}</p>
              <p><span className="font-medium text-ink-800">Active Subscriptions:</span> {metrics?.activeSubscriptions ?? 0}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
