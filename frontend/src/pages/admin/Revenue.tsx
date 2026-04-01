import { useEffect, useState } from 'react';
import { getAdminMetrics, getAdminSubscriptions, type AdminMetrics, type AdminSubscription } from '../../api/admin.api';

const currencyFormat = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const numberFormat = new Intl.NumberFormat('en-IN');

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function AdminRevenuePage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [metricsRes, subscriptionsRes] = await Promise.all([
          getAdminMetrics(),
          getAdminSubscriptions({ page: 1, limit: 10, status: 'active' }),
        ]);

        setMetrics(metricsRes.data);
        setSubscriptions(subscriptionsRes.data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load revenue data.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="font-display text-xl font-bold text-ink-800">Revenue</h2>
        <p className="mt-1 text-sm text-ink-600">Live revenue summary from platform ledger and active subscription records.</p>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Revenue" value={loading ? '...' : currencyFormat.format(metrics?.totalRevenue ?? 0)} />
        <StatCard label="Active Subscriptions" value={loading ? '...' : numberFormat.format(metrics?.activeSubscriptions ?? 0)} />
        <StatCard label="Completed Sessions" value={loading ? '...' : numberFormat.format(metrics?.completedSessions ?? 0)} />
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
        <div className="border-b border-ink-100 px-4 py-3">
          <h3 className="font-display text-base font-semibold text-ink-800">Recent Active Subscriptions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ink-100">
            <thead className="bg-ink-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Customer</th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Plan</th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Amount</th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Status</th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-ink-500">Loading revenue records...</td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-ink-500">No active subscriptions available.</td>
                </tr>
              ) : (
                subscriptions.map((item) => (
                  <tr key={item._id}>
                    <td className="px-4 py-3 text-sm text-ink-700">{item.user.name || item.user.email}</td>
                    <td className="px-4 py-3 text-sm text-ink-700">{item.plan.name}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-ink-800">{currencyFormat.format(item.price)}</td>
                    <td className="px-4 py-3 text-sm capitalize text-ink-700">{item.status.toLowerCase()}</td>
                    <td className="px-4 py-3 text-sm text-ink-700">{formatDate(item.expiryDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-ink-800">{value}</p>
    </div>
  );
}
