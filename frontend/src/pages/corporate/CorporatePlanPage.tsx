import CorporateShellLayout from '../../components/corporate/CorporateShellLayout';
import { useCorporateDashboardData } from './useCorporateDashboardData';

export default function CorporatePlanPage() {
  const { dashboard, loading, error } = useCorporateDashboardData();

  if (loading) return <div className="p-6 text-sm text-ink-600">Loading plan...</div>;
  if (error || !dashboard) return <div className="p-6 text-sm text-rose-600">{error || 'Plan unavailable'}</div>;

  return (
    <CorporateShellLayout title="Plan & Subscription" subtitle="Current corporate package and usage.">
      <div className="rounded-xl bg-gradient-to-br from-sage-700 to-sage-800 p-5 text-white">
        <p className="font-display text-xl font-bold">Enterprise Plan</p>
        <p className="mt-1 text-sm text-white/80">₹299/employee/month</p>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-white/70">Enrolled Employees</p>
            <p className="font-semibold">{dashboard.summary.enrolledEmployees}</p>
          </div>
          <div>
            <p className="text-white/70">Allocated Sessions</p>
            <p className="font-semibold">{dashboard.summary.sessionsAllocated}</p>
          </div>
        </div>
      </div>
    </CorporateShellLayout>
  );
}
