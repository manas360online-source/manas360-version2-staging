import { useState, useEffect } from 'react';
import { getAdminRevenueAnalytics } from '../../api/admin.api';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  IndianRupee,
  TrendingUp,
  Users,
  ShoppingCart,
  Award,
} from 'lucide-react';

export default function Revenue() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getAdminRevenueAnalytics();
        setData(result);
      } catch (err) {
        console.error('Failed to load revenue data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const pieData = data
    ? [
        { name: 'Patient Subscriptions', value: Math.round(data.patientSubscriptions) },
        { name: 'Provider Subscriptions', value: Math.round(data.providerSubscriptions) },
        { name: 'Session Commissions', value: Math.round(data.sessionCommissions) },
        { name: 'Marketplace Sales', value: Math.round(data.marketplaceSales) },
      ].filter((d) => d.value > 0)
    : [];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];

  const stats = [
    {
      label: 'Total Revenue',
      value: `₹${Math.round(data?.total || 0).toLocaleString()}`,
      icon: IndianRupee,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Monthly Recurring Revenue',
      value: `₹${Math.round(data?.mrr || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Patient Subscriptions',
      value: `₹${Math.round(data?.patientSubscriptions || 0).toLocaleString()}`,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Session Commissions',
      value: `₹${Math.round(data?.sessionCommissions || 0).toLocaleString()}`,
      icon: Award,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Marketplace Revenue',
      value: `₹${Math.round(data?.marketplaceSales || 0).toLocaleString()}`,
      icon: ShoppingCart,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Revenue Overview</h1>
        <p className="text-slate-500 mt-1">Comprehensive revenue breakdown across all platform streams</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none shadow-sm bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Breakdown Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">Revenue by Stream</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={130}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                <p>No revenue data available yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">Detailed Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'Patient Subscriptions', value: data?.patientSubscriptions ?? 0, color: '#10b981' },
                { label: 'Provider Subscriptions', value: data?.providerSubscriptions ?? 0, color: '#3b82f6' },
                { label: 'Session Commissions', value: data?.sessionCommissions ?? 0, color: '#f59e0b' },
                { label: 'Marketplace Sales', value: data?.marketplaceSales ?? 0, color: '#8b5cf6' },
              ].map((item, i) => {
                const total = data?.total || 1;
                const pct = Math.round((item.value / total) * 100);
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 font-medium">{item.label}</span>
                      <span className="font-bold text-slate-900">₹{Math.round(item.value).toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: item.color }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{pct}% of total</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-slate-400 text-center">
        Live data from backend • Amounts are in INR • Last refreshed: {new Date().toLocaleTimeString()}
      </p>
    </div>
  );
}
