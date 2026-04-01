import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  getAdminRevenueAnalytics,
  getAdminUserMetrics,
  getAdminProviderMetrics,
  getAdminMarketplaceMetrics,
  getAdminSystemHealth,
  type AdminRevenueAnalytics,
  type AdminUserMetrics,
  type AdminProviderMetrics,
  type AdminMarketplaceMetrics,
  type AdminSystemHealthMetrics,
} from '../../api/admin.api';
import CentralizedLegalDocumentManagement from './CentralizedLegalDocumentManagement';

const currencyFormat = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const numberFormat = new Intl.NumberFormat('en-IN');

function StatCard({ label, value, subtext, highlightCode }: { label: string; value: string | number; subtext?: string; highlightCode?: 'success' | 'warn' | 'error' | 'neutral' }) {
  const getHighlightColor = () => {
    switch(highlightCode) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'warn': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-ink-500 bg-ink-50 border-ink-100';
    }
  };

  return (
    <div className={`rounded-xl border bg-white p-5 shadow-sm`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-ink-900">{value}</p>
      {subtext ? (
        <p className={`mt-2 inline-block rounded border px-2 py-0.5 text-xs font-medium ${getHighlightColor()}`}>
          {subtext}
        </p>
      ) : null}
    </div>
  );
}

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6'];

function isMissingAnalyticsRouteError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('route not found') || (normalized.includes('404') && normalized.includes('admin'));
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [revMetrics, setRevMetrics] = useState<AdminRevenueAnalytics | null>(null);
  const [userMetrics, setUserMetrics] = useState<AdminUserMetrics | null>(null);
  const [provMetrics, setProvMetrics] = useState<AdminProviderMetrics | null>(null);
  const [marketMetrics, setMarketMetrics] = useState<AdminMarketplaceMetrics | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<AdminSystemHealthMetrics | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [revRes, usrRes, prvRes, mktRes, hltRes] = await Promise.all([
          getAdminRevenueAnalytics(),
          getAdminUserMetrics(),
          getAdminProviderMetrics(),
          getAdminMarketplaceMetrics(),
          getAdminSystemHealth(),
        ]);
        setRevMetrics(revRes.data);
        setUserMetrics(usrRes.data);
        setProvMetrics(prvRes.data);
        setMarketMetrics(mktRes.data);
        setHealthMetrics(hltRes.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load dashboard data';
        if (isMissingAnalyticsRouteError(message)) {
          // Some backend branches do not yet expose analytics routes; keep dashboard usable.
          setError(null);
        } else {
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 pb-12">
        <CentralizedLegalDocumentManagement />
        <div className="flex min-h-[30vh] flex-col items-center justify-center space-y-4 rounded-xl border border-ink-100 bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink-200 border-t-primary-600"></div>
          <p className="text-sm text-ink-500">Aggregating Platform Intelligence...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 pb-12">
        <CentralizedLegalDocumentManagement />
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 font-medium text-red-700">
          {error}
        </div>
      </div>
    );
  }

  // Formatting Data for Charts
  const revenueChartData = [
    { name: 'Patient Subs', value: revMetrics?.patientSubscriptions ?? 0 },
    { name: 'Provider Subs', value: revMetrics?.providerSubscriptions ?? 0 },
    { name: 'Marketplace', value: revMetrics?.marketplaceSales ?? 0 },
    { name: 'Session Comm', value: revMetrics?.sessionCommissions ?? 0 },
  ];

  return (
    <div className="space-y-8 pb-12">
      <CentralizedLegalDocumentManagement />

      {/* HEADER */}
      <section>
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900">Platform Analytics</h2>
        <p className="text-sm text-ink-500">Live intelligence covering revenue engines, users, and marketplace health.</p>
      </section>

      {/* REVENUE ROW */}
      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-ink-500">Revenue Engine & Users</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            label="Total Estimated Revenue" 
            value={currencyFormat.format(revMetrics?.total ?? 0)} 
            subtext="All Time Aggregate"
            highlightCode="success"
          />
          <StatCard 
            label="Current MRR" 
            value={currencyFormat.format(revMetrics?.mrr ?? 0)} 
            subtext="Monthly Recurring Value"
            highlightCode="success"
          />
          <StatCard 
            label="Total Patients" 
            value={numberFormat.format(userMetrics?.totalPatients ?? 0)} 
            subtext={`${(userMetrics?.freeVsPaidRatio ?? 0).toFixed(1)}% Conversion`}
            highlightCode="neutral"
          />
          <StatCard 
            label="Active Providers" 
            value={numberFormat.format(provMetrics?.totalProviders ?? 0)} 
            subtext={`${numberFormat.format(provMetrics?.activeSubscriptions ?? 0)} Active Subs`}
            highlightCode="neutral"
          />
        </div>
      </section>

      {/* CHARTS ROW */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
          <h3 className="mb-6 font-display text-sm font-bold text-ink-800">Revenue Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(val) => `₹${val/1000}k`} tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(val: number) => currencyFormat.format(val)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#F3F4F6' }}
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
          <h3 className="mb-6 font-display text-sm font-bold text-ink-800">Provider Plan Distribution</h3>
          <div className="h-64">
            {provMetrics?.planDistribution && provMetrics.planDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={provMetrics.planDistribution}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {provMetrics.planDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-ink-400">
                No active provider subscriptions
              </div>
            )}
          </div>
        </div>
      </section>

      {/* BOTTOM ROW: MARKETPLACE & HEALTH */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white shadow-sm overflow-hidden">
          <div className="p-5 border-b border-ink-100 bg-ink-50/50">
            <h3 className="font-display text-sm font-bold text-ink-800">Marketplace & Lead Economy</h3>
            <p className="text-xs text-ink-500 mt-1">Lead generation vs provider assignment metrics</p>
          </div>
          <div className="divide-y divide-ink-100 bg-white">
            <div className="flex items-center justify-between p-4 hover:bg-ink-50 transition-colors">
              <span className="text-sm font-medium text-ink-700">Total Leads Generated</span>
              <span className="text-sm font-bold text-ink-900">{numberFormat.format(marketMetrics?.generated ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between p-4 hover:bg-ink-50 transition-colors">
              <span className="text-sm font-medium text-ink-700">Leads Assigned (Subs)</span>
              <span className="text-sm font-bold text-ink-900">{numberFormat.format(marketMetrics?.assigned ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between p-4 hover:bg-ink-50 transition-colors">
              <span className="text-sm font-medium text-ink-700">Marketplace Purchases</span>
              <span className="text-sm font-bold text-ink-900">{numberFormat.format(marketMetrics?.purchased ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-primary-50">
              <span className="text-sm font-semibold tracking-wide text-primary-900 uppercase">Conversion Rate</span>
              <span className="text-lg font-bold text-primary-700">{(marketMetrics?.conversionRate ?? 0).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-ink-100 bg-ink-50/50">
            <h3 className="font-display text-sm font-bold text-ink-800">System Health Alerts</h3>
            <p className="text-xs text-ink-500 mt-1">Failed payments and critical operations monitoring</p>
          </div>
          <div className="flex-1 p-5 grid grid-cols-2 gap-4">
            <StatCard 
              label="Failed Payments" 
              value={healthMetrics?.failedPayments ?? 0}
              subtext="Action Recommended"
              highlightCode={healthMetrics?.failedPayments ? 'error' : 'success'}
            />
            <StatCard 
              label="Pending Captures" 
              value={healthMetrics?.pendingPayments ?? 0}
              subtext="Awaiting Clearance"
              highlightCode={healthMetrics?.pendingPayments ? 'warn' : 'success'}
            />
            <StatCard 
              label="Expired Subs" 
              value={healthMetrics?.expiredSubscriptions ?? 0}
              subtext="Requires Auto-Renew"
              highlightCode={healthMetrics?.expiredSubscriptions ? 'warn' : 'success'}
            />
          </div>
        </div>
      </section>

    </div>
  );
}
