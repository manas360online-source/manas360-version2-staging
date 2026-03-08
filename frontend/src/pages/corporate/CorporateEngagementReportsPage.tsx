import CorporateShellLayout from '../../components/corporate/CorporateShellLayout';
import { useCorporateDashboardData } from './useCorporateDashboardData';

export default function CorporateEngagementReportsPage() {
  const { dashboard, loading, error } = useCorporateDashboardData();

  if (loading) return <div className="p-6 text-sm text-ink-600">Loading engagement report...</div>;
  if (error || !dashboard) return <div className="p-6 text-sm text-rose-600">{error || 'Report unavailable'}</div>;

  return (
    <CorporateShellLayout title="Engagement Tracking" subtitle="Employee participation and engagement snapshots.">
      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <p className="text-sm text-ink-600">Active users: <span className="font-semibold text-ink-800">{dashboard.summary.activeUsers}</span></p>
        <p className="mt-2 text-sm text-ink-600">Average session rating: <span className="font-semibold text-ink-800">{dashboard.summary.averageSessionRating}/5</span></p>
        <p className="mt-2 text-sm text-ink-600">Enrollment rate: <span className="font-semibold text-ink-800">{Math.round(dashboard.summary.enrollmentRate)}%</span></p>
      </div>
    </CorporateShellLayout>
  );
}
