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
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import { 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  BarChart3
} from 'lucide-react';

interface SessionMetric {
  date: string;
  totalSessions: number;
  completed: number;
  dropped: number;
  avgDurationMinutes: number;
}

interface SummaryData {
  totalSessions: number;
  completionRate: number;
  avgDurationMinutes: number;
  dropOffRate: number;
}

export default function SessionAnalytics() {
  const [metrics, setMetrics] = useState<SessionMetric[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchData();
  }, [days]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Backend route is /api/v1/admin/analytics/sessions
      const response = await api.get(`/v1/admin/analytics/sessions?days=${days}`);
      if (response.data) {
        setMetrics(response.data.metrics || []);
        setSummary(response.data.summary || null);
      }
    } catch (error) {
      console.error('Failed to fetch session analytics', error);
      toast.error('Could not load session clinical data');
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-slate-900">Session Analytics</h1>
          <p className="text-slate-500 mt-1">Clinical performance and session volume trends</p>
        </div>
        
        <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
          {[7, 30, 90].map((d) => (
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
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Sessions</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{summary.totalSessions}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Calendar className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Completion Rate</p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-3xl font-bold text-slate-900 mt-1">{summary.completionRate}%</p>
                    <Badge variant="soft" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Good
                    </Badge>
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Avg Duration</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{summary.avgDurationMinutes}m</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <Clock className="h-6 w-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Drop-off Rate</p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-3xl font-bold text-slate-900 mt-1">{summary.dropOffRate}%</p>
                    <Badge variant="soft" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      Monitor
                    </Badge>
                  </div>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl">
                  <XCircle className="h-6 w-6 text-amber-500" />
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
                Session Volume & Trends
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
                    dataKey="totalSessions" 
                    name="Total Sessions"
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    name="Completed"
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="dropped" 
                    name="Dropped/Cancelled"
                    stroke="#f59e0b" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="border-b border-slate-50 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Operational Insights</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">Top Performance Indicators</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Avg Sessions / Day</span>
                    <span className="font-bold text-slate-900">
                      {summary ? (summary.totalSessions / days).toFixed(1) : '0'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Peak Volume Day</span>
                    <span className="font-bold text-slate-900">
                      {metrics.length > 0 ? metrics.reduce((prev, current) => (prev.totalSessions > current.totalSessions) ? prev : current).date : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">Historical Context</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Session volume has shown a stable trend over the last {days} days. 
                  The current completion rate of <span className="text-emerald-600 font-semibold">{summary?.completionRate}%</span> is within the target clinical operational range.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
