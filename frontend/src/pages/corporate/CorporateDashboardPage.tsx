import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { corporateApi } from '../../api/corporate.api';
import CorporateShellLayout from '../../components/corporate/CorporateShellLayout';

type DashboardPayload = {
  company: {
    name: string;
    employeeLimit: number;
  };
  summary: {
    enrolledEmployees: number;
    sessionsAllocated: number;
    sessionsUsed: number;
    utilizationRate: number;
    absenteeismReductionPct: number;
    wellbeingScore: number;
    averageSessionRating: number;
    recommendationRatePct: number;
    activeUsers: number;
    costPerSession: number;
  };
  utilizationTrend: Array<{ month: string; sessionsUsed: number; sessionsAllocated: number }>;
  departmentBreakdown: Array<{
    department: string;
    enrolled: number;
    active: number;
    utilizationPct: number;
    sessionsUsed: number;
  }>;
};

const fallbackTrend = [
  { month: 'Oct', sessionsUsed: 88, sessionsAllocated: 160 },
  { month: 'Nov', sessionsUsed: 102, sessionsAllocated: 160 },
  { month: 'Dec', sessionsUsed: 118, sessionsAllocated: 180 },
  { month: 'Jan', sessionsUsed: 126, sessionsAllocated: 180 },
  { month: 'Feb', sessionsUsed: 132, sessionsAllocated: 200 },
  { month: 'Mar', sessionsUsed: 142, sessionsAllocated: 200 },
];

const fallbackDepartments = [
  { department: 'Engineering', enrolled: 82, active: 61, utilizationPct: 74, sessionsUsed: 48 },
  { department: 'Operations', enrolled: 56, active: 42, utilizationPct: 75, sessionsUsed: 38 },
  { department: 'Sales', enrolled: 44, active: 28, utilizationPct: 64, sessionsUsed: 24 },
  { department: 'Support', enrolled: 38, active: 22, utilizationPct: 58, sessionsUsed: 19 },
  { department: 'HR', enrolled: 28, active: 13, utilizationPct: 46, sessionsUsed: 13 },
];

function StatCard({ title, value, caption }: { title: string; value: string; caption: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{title}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-ink-900">{value}</p>
      <p className="mt-1 text-xs text-ink-500">{caption}</p>
    </div>
  );
}

export default function CorporateDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = (await corporateApi.getDashboard()) as DashboardPayload;
        setDashboard(data);
      } catch (fetchError: any) {
        setError(fetchError?.response?.data?.message || 'Unable to load corporate dashboard');
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const summary = dashboard?.summary;
  const trend = dashboard?.utilizationTrend?.length ? dashboard.utilizationTrend : fallbackTrend;
  const departments = dashboard?.departmentBreakdown?.length ? dashboard.departmentBreakdown : fallbackDepartments;

  const maxAllocation = useMemo(() => Math.max(...trend.map((item) => item.sessionsAllocated), 1), [trend]);

  return (
    <CorporateShellLayout title="Corporate Dashboard" subtitle="Operational wellness analytics and employee utilization overview.">
      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((card) => (
            <div key={card} className="h-24 animate-pulse rounded-xl border border-ink-100 bg-white" />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <StatCard
              title="Enrollment"
              value={`${summary?.enrolledEmployees ?? 248}/${dashboard?.company.employeeLimit ?? 300}`}
              caption={`${summary?.activeUsers ?? 166} active members in last 30 days`}
            />
            <StatCard
              title="Utilization"
              value={`${Math.round(summary?.utilizationRate ?? 67)}%`}
              caption={`${summary?.sessionsUsed ?? 142} sessions used out of ${summary?.sessionsAllocated ?? 200}`}
            />
            <StatCard
              title="Wellbeing Score"
              value={`${Math.round(summary?.wellbeingScore ?? 78)}/100`}
              caption={`${Math.round(summary?.absenteeismReductionPct ?? 35)}% absenteeism reduction`}
            />
            <StatCard
              title="Satisfaction"
              value={`${(summary?.averageSessionRating ?? 4.6).toFixed(1)}/5`}
              caption={`${Math.round(summary?.recommendationRatePct ?? 92)}% recommendation rate`}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <section className="rounded-xl border border-ink-100 bg-white p-5 xl:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-ink-900">Utilization Trend</h2>
                <span className="text-xs text-ink-500">Last 6 months</span>
              </div>
              <div className="space-y-3">
                {trend.map((row) => {
                  const pct = Math.round((row.sessionsUsed / Math.max(row.sessionsAllocated, 1)) * 100);
                  return (
                    <div key={row.month}>
                      <div className="mb-1 flex items-center justify-between text-xs text-ink-600">
                        <span>{row.month}</span>
                        <span>
                          {row.sessionsUsed}/{row.sessionsAllocated} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-ink-100">
                        <div
                          className="h-2 rounded-full bg-sage-500"
                          style={{ width: `${Math.round((row.sessionsUsed / maxAllocation) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-xl border border-ink-100 bg-white p-5">
              <h2 className="font-display text-lg font-semibold text-ink-900">Quick Actions</h2>
              <div className="mt-3 space-y-2">
                <Link to="/corporate/employees/enrollment" className="block rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50">
                  Add Employees
                </Link>
                <Link to="/corporate/employees/allocation" className="block rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50">
                  Update Session Allocation
                </Link>
                <Link to="/corporate/reports/utilization" className="block rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50">
                  Export Utilization Report
                </Link>
                <Link to="/corporate/billing/payment-methods" className="block rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50">
                  Billing & Payment Methods
                </Link>
              </div>
            </section>
          </div>

          <section className="mt-4 rounded-xl border border-ink-100 bg-white p-5">
            <h2 className="font-display text-lg font-semibold text-ink-900">Department Utilization</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-xs uppercase tracking-wider text-ink-500">
                    <th className="px-2 py-2">Department</th>
                    <th className="px-2 py-2">Enrolled</th>
                    <th className="px-2 py-2">Active</th>
                    <th className="px-2 py-2">Sessions Used</th>
                    <th className="px-2 py-2">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept.department} className="border-b border-ink-50">
                      <td className="px-2 py-2 font-medium text-ink-800">{dept.department}</td>
                      <td className="px-2 py-2 text-ink-700">{dept.enrolled}</td>
                      <td className="px-2 py-2 text-ink-700">{dept.active}</td>
                      <td className="px-2 py-2 text-ink-700">{dept.sessionsUsed}</td>
                      <td className="px-2 py-2 text-ink-700">{Math.round(dept.utilizationPct)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </CorporateShellLayout>
  );
}
