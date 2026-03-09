import { useEffect, useMemo, useState } from 'react';
import { getAdminMetrics, getAdminSubscriptions, getAdminUsers, type AdminMetrics, type AdminSubscription, type AdminUser } from '../../api/admin.api';

const numberFormat = new Intl.NumberFormat('en-IN');
const currencyFormat = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [latestUsers, setLatestUsers] = useState<AdminUser[]>([]);
  const [latestSubscriptions, setLatestSubscriptions] = useState<AdminSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [metricsRes, usersRes, subscriptionsRes] = await Promise.all([
          getAdminMetrics(),
          getAdminUsers({ page: 1, limit: 5, status: 'active' }),
          getAdminSubscriptions({ page: 1, limit: 5, status: 'active' }),
        ]);

        setMetrics(metricsRes.data);
        setLatestUsers(usersRes.data.data);
        setLatestSubscriptions(subscriptionsRes.data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load admin dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const statCards = useMemo(
    () => [
      { label: 'Total Users', value: numberFormat.format(metrics?.totalUsers ?? 0), note: 'Live from /v1/admin/metrics' },
      { label: 'Therapists', value: numberFormat.format(metrics?.totalTherapists ?? 0), note: 'Total provider accounts' },
      { label: 'Completed Sessions', value: numberFormat.format(metrics?.completedSessions ?? 0), note: 'Captured sessions completed' },
      { label: 'Active Subscriptions', value: numberFormat.format(metrics?.activeSubscriptions ?? 0), note: 'Current paying subscriptions' },
      { label: 'Total Revenue', value: currencyFormat.format(metrics?.totalRevenue ?? 0), note: 'Ledger-backed total gross amount' },
    ],
    [metrics],
  );

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-display text-2xl font-bold text-ink-800">Platform Overview</h2>
        <p className="mt-1 text-sm text-ink-500">Live admin snapshot using backend metrics, latest users, and active subscriptions.</p>
      </section>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        {statCards.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-ink-100 bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{metric.label}</p>
            <p className="mt-2 font-display text-2xl font-bold text-ink-800">{loading ? '...' : metric.value}</p>
            <p className="mt-1 text-xs text-ink-500">{metric.note}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h3 className="font-display text-base font-bold text-ink-800">Latest Users</h3>
          <div className="mt-3 space-y-2 text-sm text-ink-700">
            {loading ? <p className="text-ink-500">Loading users...</p> : null}
            {!loading && latestUsers.length === 0 ? <p className="text-ink-500">No users found.</p> : null}
            {!loading
              ? latestUsers.map((user) => (
                  <div key={user.id} className="rounded-lg bg-ink-50 p-3">
                    <p className="font-medium text-ink-800">{`${user.firstName} ${user.lastName}`.trim() || user.email}</p>
                    <p className="text-xs text-ink-500">{user.email} · {user.role}</p>
                    <p className="mt-1 text-[11px] text-ink-400">Created: {formatDate(user.createdAt)}</p>
                  </div>
                ))
              : null}
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h3 className="font-display text-base font-bold text-ink-800">Latest Active Subscriptions</h3>
          <div className="mt-3 space-y-2 text-sm text-ink-700">
            {loading ? <p className="text-ink-500">Loading subscriptions...</p> : null}
            {!loading && latestSubscriptions.length === 0 ? <p className="text-ink-500">No active subscriptions found.</p> : null}
            {!loading
              ? latestSubscriptions.map((sub) => (
                  <div key={sub._id} className="rounded-lg bg-ink-50 p-3">
                    <p className="font-medium text-ink-800">{sub.user.name || sub.user.email}</p>
                    <p className="text-xs text-ink-500">{sub.plan.name} · {sub.status}</p>
                    <p className="mt-1 text-[11px] text-ink-400">{currencyFormat.format(sub.price)} · Expires: {formatDate(sub.expiryDate)}</p>
                  </div>
                ))
              : null}
          </div>
        </div>
      </section>
    </div>
  );
}
