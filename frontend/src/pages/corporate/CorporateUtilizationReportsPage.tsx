import CorporateShellLayout from '../../components/corporate/CorporateShellLayout';
import { useCorporateDashboardData } from './useCorporateDashboardData';

export default function CorporateUtilizationReportsPage() {
  const { dashboard, loading, error } = useCorporateDashboardData();

  if (loading) return <div className="p-6 text-sm text-ink-600">Loading report...</div>;
  if (error || !dashboard) return <div className="p-6 text-sm text-rose-600">{error || 'Report unavailable'}</div>;

  return (
    <CorporateShellLayout title="Utilization Reports" subtitle="Monthly utilization report for all departments.">
      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <div className="space-y-2">
          {dashboard.utilizationTrend.map((row) => (
            <div key={row.month} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
              <span className="font-medium text-ink-700">{row.month}</span>
              <span className="text-ink-600">{row.sessionsUsed}/{row.sessionsAllocated} sessions</span>
            </div>
          ))}
        </div>
      </div>
    </CorporateShellLayout>
  );
}
