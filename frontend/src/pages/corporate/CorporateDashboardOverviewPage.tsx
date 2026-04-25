import CorporateShellLayout from '../../components/corporate/CorporateShellLayout';
import { useCorporateDashboardData } from './useCorporateDashboardData';

const currencyInr = (value: number): string => `₹${Math.round(value || 0).toLocaleString('en-IN')}`;

export default function CorporateDashboardOverviewPage() {
  const { dashboard, loading, error } = useCorporateDashboardData();

  if (loading) return <div className="p-6 text-sm text-ink-600">Loading dashboard...</div>;
  if (error || !dashboard) return <div className="p-6 text-sm text-rose-600">{error || 'Dashboard unavailable'}</div>;

  const s = dashboard.summary;

  return (
    <CorporateShellLayout title="Corporate Dashboard" subtitle="Main overview for your company wellness program.">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card label="Enrolled" value={String(s.enrolledEmployees)} sub={`of ${dashboard.company.employeeLimit} employees`} />
        <Card label="Utilization" value={`${s.utilizationRate}%`} sub={`${s.sessionsUsed} of ${s.sessionsAllocated} sessions`} />
        <Card label="Active Users" value={String(s.activeUsers)} sub="Employees with session activity" />
        <Card label="Cost Per Session" value={currencyInr(s.costPerSession)} sub="Current blended session cost" />
      </div>
    </CorporateShellLayout>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-ink-800">{value}</p>
      <p className="mt-1 text-xs text-ink-500">{sub}</p>
    </div>
  );
}
