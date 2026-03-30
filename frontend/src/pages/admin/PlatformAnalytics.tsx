import { useState, useEffect } from 'react';
import { api } from '../../api/admin.api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

import { toast } from 'sonner';
import { 
  IndianRupee, 
  UserMinus, 
  Zap, 
  TrendingUp, 
  BarChart3,
  PieChart,
  ArrowUpRight
} from 'lucide-react';

interface PlatformMetric {
  date: string;
  revenue: number;
  churnRate: number;
  premiumUsers: number;
  arpu: number;
}

interface SummaryData {
  totalRevenue: number;
  churnRate: number;
  premiumUsers: number;
  arpu: number;
  ltv: number;
}

export default function PlatformAnalytics() {
  const [metrics, setMetrics] = useState<PlatformMetric[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/v1/admin/analytics/platform?days=${days}`);
      if (res.data) {
        setMetrics(res.data.metrics || []);
        setSummary(res.data.summary || null);
      }
    } catch (err) {
      console.error('Failed to load platform analytics', err);
      toast.error('Failed to load monetization analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [days]);

  if (loading && !metrics.length) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Platform Analytics</h1>
          <p className="text-slate-500 mt-1">Monetization, churn, and financial health overview</p>
        </div>
        
        <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
          {[7, 30, 90, 180].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                days === d 
                  ? 'bg-emerald-500 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Revenue ({days}d)</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">₹{summary.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <IndianRupee className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Churn Rate</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{summary.churnRate}%</p>
                </div>
                <div className="p-3 bg-red-50 rounded-xl">
                  <UserMinus className="h-6 w-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Premium Users</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{summary.premiumUsers}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Zap className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">ARPU</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">₹{summary.arpu}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <PieChart className="h-6 w-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Estimated LTV</p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-2xl font-bold text-slate-900 mt-1">₹{summary.ltv.toLocaleString()}</p>
                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-50 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-500" />
                Revenue vs Churn Trend (Last {days} Days)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(str) => {
                      const date = new Date(str);
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      padding: '12px'
                    }} 
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={3}
                    name="Revenue (₹)"
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="churnRate"
                    stroke="#ef4444"
                    strokeWidth={3}
                    name="Churn Rate (%)"
                    dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white h-fit">
          <CardHeader className="border-b border-slate-50 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Financial Insights</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">Top KPIs</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Daily Average Revenue</span>
                    <span className="font-bold text-slate-900">
                      ₹{summary ? (summary.totalRevenue / days).toFixed(0) : '0'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Peak Revenue Day</span>
                    <span className="font-bold text-slate-900">
                      {metrics.length > 0 ? metrics.reduce((prev, current) => (prev.revenue > current.revenue) ? prev : current).date : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <h4 className="text-sm font-bold text-emerald-800 mb-1">Monetization Health</h4>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  The current ARPU of ₹{summary?.arpu} combined with a {summary?.churnRate}% churn rate results in a 
                  healthy Customer Lifetime Value (LTV) profile.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-50 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-800">Daily Monetization Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500">
                  <th className="px-6 py-4 text-left">Date</th>
                  <th className="px-6 py-4 text-center">Revenue</th>
                  <th className="px-6 py-4 text-center">Churn Rate</th>
                  <th className="px-6 py-4 text-center">Premium Users</th>
                  <th className="px-6 py-4 text-center">ARPU</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {metrics.slice().reverse().map((m) => (
                  <tr key={m.date} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{m.date}</td>
                    <td className="px-6 py-4 text-sm text-center font-bold text-emerald-600">₹{m.revenue.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-center text-red-600">{m.churnRate}%</td>
                    <td className="px-6 py-4 text-sm text-center text-slate-600">{m.premiumUsers}</td>
                    <td className="px-6 py-4 text-sm text-center text-slate-600">₹{m.arpu}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
