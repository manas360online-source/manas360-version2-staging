import CorporateShellLayout from '../../components/corporate/CorporateShellLayout';
import { useCorporateDashboardData } from './useCorporateDashboardData';

export default function CorporateWellbeingReportsPage() {
  const { dashboard, loading, error } = useCorporateDashboardData();

  if (loading) return <div className="p-6 text-sm text-ink-600">Loading wellbeing report...</div>;
  if (error || !dashboard) return <div className="p-6 text-sm text-rose-600">{error || 'Report unavailable'}</div>;

  return (
    <CorporateShellLayout title="Employee Wellbeing" subtitle="Wellbeing score and department-level wellness overview.">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <p className="text-xs uppercase tracking-wider text-ink-400">Org Wellbeing Score</p>
          <p className="mt-2 font-display text-4xl font-bold text-sage-700">{dashboard.summary.wellbeingScore}</p>
        </div>
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <p className="text-xs uppercase tracking-wider text-ink-400">Recommendation Rate</p>
          <p className="mt-2 font-display text-4xl font-bold text-ink-800">{dashboard.summary.recommendationRatePct}%</p>
        </div>
      </div>
    </CorporateShellLayout>
  );
}
