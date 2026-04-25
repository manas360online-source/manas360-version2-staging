import { useEffect, useMemo, useState } from 'react';
import { corporateApi } from '../../api/corporate.api';

type CompanyItem = {
  id: string;
  companyKey: string;
  name: string;
};

type CompanyDashboard = {
  company: {
    id: string;
    companyKey: string;
    name: string;
    employeeLimit: number;
    sessionQuota: number;
    ssoProvider: string;
  };
  summary: {
    enrolledEmployees: number;
    activeUsers: number;
    engagementRate: number;
    sessionsAllocated: number;
    sessionsUsed: number;
    utilizationRate: number;
    wellbeingScore: number;
  };
  burnoutRisk: {
    high: number;
    medium: number;
    low: number;
  };
  departmentBreakdown: Array<{
    department: string;
    enrolled: number;
    active: number;
    utilizationPct: number;
    sessionsUsed: number;
    riskIndicator: string;
  }>;
  reports: Array<{
    id: string;
    type: string;
    quarter: string;
    format: string;
    generatedAt: string;
  }>;
  aiInsights: string[];
};

const numberFormat = new Intl.NumberFormat('en-IN');

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [dashboard, setDashboard] = useState<CompanyDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCompanies = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const rows = (await corporateApi.listCompanies()) as CompanyItem[];
        setCompanies(rows);
        if (rows[0]?.companyKey) {
          setSelectedKey(rows[0].companyKey);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load companies.');
      } finally {
        setLoading(false);
      }
    };

    void loadCompanies();
  }, []);

  useEffect(() => {
    if (!selectedKey) return;

    const loadDashboard = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const payload = (await corporateApi.getDashboard(selectedKey)) as CompanyDashboard;
        setDashboard(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load company dashboard.');
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, [selectedKey]);

  const topDepartments = useMemo(
    () => (dashboard?.departmentBreakdown || []).slice().sort((a, b) => b.utilizationPct - a.utilizationPct).slice(0, 5),
    [dashboard?.departmentBreakdown],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-ink-800">Corporate Clients</h2>
            <p className="mt-1 text-sm text-ink-600">
              Live enterprise account control center with utilization, risk, and reporting visibility.
            </p>
          </div>
          <div className="min-w-[260px]">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-500">Select Company</label>
            <select
              value={selectedKey}
              onChange={(event) => setSelectedKey(event.target.value)}
              className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2"
            >
              <option value="">Choose company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.companyKey}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard label="Employees" value={numberFormat.format(dashboard?.summary.enrolledEmployees ?? 0)} />
        <StatCard label="Active Users" value={numberFormat.format(dashboard?.summary.activeUsers ?? 0)} />
        <StatCard label="Utilization" value={`${dashboard?.summary.utilizationRate ?? 0}%`} />
        <StatCard label="Engagement" value={`${dashboard?.summary.engagementRate ?? 0}%`} />
        <StatCard label="Wellbeing" value={`${dashboard?.summary.wellbeingScore ?? 0}/100`} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
          <div className="border-b border-ink-100 px-4 py-3">
            <h3 className="font-display text-base font-bold text-ink-800">Department Utilization</h3>
            <p className="mt-1 text-xs text-ink-500">Highest utilization departments across the selected enterprise account.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink-100">
              <thead className="bg-ink-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Enrolled</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Active</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Sessions</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-500">Loading department data...</td>
                  </tr>
                ) : topDepartments.length ? (
                  topDepartments.map((dept) => (
                    <tr key={dept.department}>
                      <td className="px-4 py-3 text-sm font-semibold text-ink-800">{dept.department}</td>
                      <td className="px-4 py-3 text-sm text-ink-700">{numberFormat.format(dept.enrolled)}</td>
                      <td className="px-4 py-3 text-sm text-ink-700">{numberFormat.format(dept.active)}</td>
                      <td className="px-4 py-3 text-sm text-ink-700">{numberFormat.format(dept.sessionsUsed)}</td>
                      <td className="px-4 py-3 text-sm text-ink-700">{dept.utilizationPct}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-500">No department analytics available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-ink-100 bg-white p-4">
            <h3 className="font-display text-base font-bold text-ink-800">Burnout Risk Split</h3>
            <div className="mt-3 space-y-2 text-sm">
              <RiskRow label="High" value={dashboard?.burnoutRisk.high ?? 0} tone="high" />
              <RiskRow label="Medium" value={dashboard?.burnoutRisk.medium ?? 0} tone="medium" />
              <RiskRow label="Low" value={dashboard?.burnoutRisk.low ?? 0} tone="low" />
            </div>
          </div>

          <div className="rounded-xl border border-ink-100 bg-white p-4">
            <h3 className="font-display text-base font-bold text-ink-800">Recent Reports</h3>
            <div className="mt-3 space-y-2">
              {(dashboard?.reports || []).slice(0, 4).map((report) => (
                <div key={report.id} className="rounded-lg bg-ink-50 px-3 py-2">
                  <p className="text-sm font-medium text-ink-800">{report.type}</p>
                  <p className="text-xs text-ink-500">
                    {report.quarter} · {String(report.format).toUpperCase()}
                  </p>
                </div>
              ))}
              {!dashboard?.reports?.length ? <p className="text-sm text-ink-500">No reports available.</p> : null}
            </div>
          </div>

          <div className="rounded-xl border border-ink-100 bg-white p-4">
            <h3 className="font-display text-base font-bold text-ink-800">AI Insights</h3>
            <div className="mt-3 space-y-2">
              {(dashboard?.aiInsights || []).map((item) => (
                <div key={item} className="rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-700">
                  {item}
                </div>
              ))}
              {!dashboard?.aiInsights?.length ? <p className="text-sm text-ink-500">No insights available.</p> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-ink-800">{value}</p>
    </div>
  );
}

function RiskRow({ label, value, tone }: { label: string; value: number; tone: 'high' | 'medium' | 'low' }) {
  const toneClass = tone === 'high' ? 'text-red-700 bg-red-50' : tone === 'medium' ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50';
  return (
    <div className={`flex items-center justify-between rounded-md px-2.5 py-1.5 ${toneClass}`}>
      <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      <span className="text-sm font-bold">{value}%</span>
    </div>
  );
}
