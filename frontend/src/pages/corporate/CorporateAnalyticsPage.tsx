import CorporateShellLayout from '../../components/corporate/CorporateShellLayout';
import { useCorporateDashboardData } from './useCorporateDashboardData';

export default function CorporateAnalyticsPage() {
  const { dashboard, loading, error } = useCorporateDashboardData();

  if (loading) return <div className="p-6 text-sm text-ink-600">Loading analytics...</div>;
  if (error || !dashboard) return <div className="p-6 text-sm text-rose-600">{error || 'Analytics unavailable'}</div>;

  return (
    <CorporateShellLayout title="Analytics" subtitle="Trends across utilization and engagement.">
      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="font-display text-lg font-bold text-ink-800">Monthly Utilization Trend</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {dashboard.utilizationTrend.map((m) => (
            <div key={m.month} className="rounded-lg bg-ink-50 p-3">
              <p className="text-xs text-ink-500">{m.month}</p>
              <p className="mt-1 text-sm font-semibold text-ink-700">Used: {m.sessionsUsed}</p>
              <p className="text-xs text-ink-500">Allocated: {m.sessionsAllocated}</p>
              <p className="text-xs text-ink-500">Active: {m.activeUsers}</p>
            </div>
          ))}
        </div>
      </div>
    </CorporateShellLayout>
  );
}
