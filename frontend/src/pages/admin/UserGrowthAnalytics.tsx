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
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import { 
  Users, 
  UserPlus, 
  Activity, 
  RefreshCcw,
  TrendingUp,
  BarChart3
} from 'lucide-react';

interface UserGrowthMetric {
  date: string;
  newUsers: number;
  activeUsers: number;
  retentionRate: number;
}

interface SummaryData {
  totalRegistered: number;
  activeUsers: number;
  avgRetentionRate: number;
  newUsers90d: number;
}

export default function UserGrowthAnalytics() {
  const [metrics, setMetrics] = useState<UserGrowthMetric[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/v1/admin/analytics/user-growth?days=${days}`);
      if (res.data) {
        setMetrics(res.data.metrics || []);
        setSummary(res.data.summary || null);
      }
    } catch (err) {
      console.error('Failed to load user growth analytics', err);
      toast.error('Failed to load user acquisition data');
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
          <h1 className="text-3xl font-bold text-slate-900">User Growth Analytics</h1>
          <p className="text-slate-500 mt-1">Acquisition, retention, and platform reach trends</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Registered</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{summary.totalRegistered}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Active Users (30d)</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{summary.activeUsers}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <Activity className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Avg. Retention</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{summary.avgRetentionRate}%</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <RefreshCcw className="h-6 w-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">New Users ({days}d)</p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-3xl font-bold text-slate-900 mt-1">{summary.newUsers90d}</p>
                    <Badge variant="soft" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Growth
                    </Badge>
                  </div>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl">
                  <UserPlus className="h-6 w-6 text-amber-500" />
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
                User Growth Trend (Last {days} Days)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="380">
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
                    type="monotone"
                    dataKey="newUsers"
                    stroke="#4A6741"
                    strokeWidth={3}
                    name="New Users"
                    dot={{ r: 4, fill: '#4A6741', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="activeUsers"
                    stroke="#C4956A"
                    strokeWidth={3}
                    name="Active Users"
                    dot={{ r: 4, fill: '#C4956A', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="border-b border-slate-50 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Growth Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-0">
            <div className="overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500">
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-center">New</th>
                    <th className="px-4 py-3 text-center">Active</th>
                    <th className="px-4 py-3 text-center">Ret. %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {metrics.slice(-10).reverse().map((m) => (
                    <tr key={m.date} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-slate-700">
                        {new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-bold text-emerald-600">+{m.newUsers}</td>
                      <td className="px-4 py-3 text-sm text-center text-slate-600">{m.activeUsers}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <Badge variant="soft" className="bg-blue-50 text-blue-700 border-blue-100 font-bold">
                          {m.retentionRate}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 bg-slate-50 mt-2">
                <p className="text-xs text-slate-400 italic text-center">
                  Showing most recent 10 days of acquisition data.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
