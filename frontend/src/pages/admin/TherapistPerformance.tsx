import { useState, useEffect, useCallback } from 'react';
import { 
  getAdminTherapistPerformance, 
  type AdminTherapistPerformance, 
  type AdminPerformanceSummary 
} from '../../api/admin.api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import { TrendingUp, Users, Star, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function TherapistPerformance() {
  const [therapists, setTherapists] = useState<AdminTherapistPerformance[]>([]);
  const [summary, setSummary] = useState<AdminPerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await getAdminTherapistPerformance();
      if (res.data) {
        setTherapists(res.data.therapists || []);
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load therapist performance metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !summary) return <div className="p-12 text-center text-gray-400 italic animate-pulse">Aggregating Clinical Performance data...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clinical Operations & Performance</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Monitoring provider quality, session throughput, and clinical utilization.</p>
        </div>
        <Badge variant="soft" className="bg-emerald-50 text-emerald-700 border-emerald-100 px-4 py-1.5 font-bold uppercase tracking-wider text-[10px]">
          All Systems Normal
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <PerformanceStatCard 
          label="Platform Avg Rating" 
          value={`${summary.avgRating} ★`} 
          icon={<Star className="w-4 h-4 text-amber-500" />} 
          description="Avg clinical rating"
        />
        <PerformanceStatCard 
          label="Total Sessions" 
          value={summary.totalSessions.toLocaleString()} 
          icon={<Users className="w-4 h-4 text-blue-500" />} 
          description="Cumulative completions"
        />
        <PerformanceStatCard 
          label="Avg Utilization" 
          value={`${summary.utilizationPercent}%`} 
          icon={<Activity className="w-4 h-4 text-emerald-500" />} 
          description="Provider capacity ratio"
        />
        <PerformanceStatCard 
          label="Active Providers" 
          value={therapists.length.toString()} 
          icon={<TrendingUp className="w-4 h-4 text-purple-500" />} 
          description="Verified clinical staff"
        />
      </div>

      {/* Performance Trend Chart */}
      <Card className="p-8 mb-10 border-gray-100 shadow-soft-sm">
        <div className="flex items-center justify-between mb-8">
           <h2 className="text-sm font-black uppercase tracking-[0.15em] text-gray-400">Throughput Benchmarking</h2>
           <div className="flex gap-4">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#4A6741]" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sessions Completed</span>
             </div>
           </div>
        </div>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={therapists}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
              />
              <Tooltip 
                cursor={{ fill: '#F8FAFC' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                labelStyle={{ fontWeight: 800, marginBottom: '4px', color: '#1E293B', fontSize: '12px' }}
              />
              <Bar dataKey="sessionsCompleted" radius={[6, 6, 0, 0]} barSize={40}>
                 {therapists.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4A6741' : '#688d5e'} />
                 ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Therapist Leaderboard Table */}
      <div className="bg-white rounded-[2rem] shadow-2xl shadow-gray-100 border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/30">
           <h3 className="font-bold text-gray-800 text-base uppercase tracking-wider flex items-center gap-2">
             Clinical Performance Leaderboard
           </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                <th className="px-8 py-4">Clinical Provider</th>
                <th className="px-8 py-4 text-center">Sessions</th>
                <th className="px-8 py-4 text-center">Clinical Rating</th>
                <th className="px-8 py-4 text-center">Utilization</th>
                <th className="px-8 py-4 text-right">30d Revenue</th>
                <th className="px-8 py-4 text-center">Growth Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {therapists.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center text-gray-400 italic">No clinical data available for the current period.</td>
                </tr>
              ) : (
                therapists.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-8 py-5 font-bold text-gray-900">{t.name}</td>
                    <td className="px-8 py-5 text-center font-medium">{t.sessionsCompleted}</td>
                    <td className="px-8 py-5 text-center">
                       <Badge variant="soft" className="bg-amber-50 text-amber-600 border-amber-100 font-black text-[10px]">
                         {t.avgRating} ★
                       </Badge>
                    </td>
                    <td className="px-8 py-5 text-center">
                       <div className="w-full max-w-[80px] mx-auto bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
                            style={{ width: `${t.utilizationPercent}%` }}
                          />
                       </div>
                       <span className="text-[10px] font-bold text-gray-400 mt-1 block">{t.utilizationPercent}%</span>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-gray-900">
                       ₹{t.totalEarnings.toLocaleString()}
                    </td>
                    <td className="px-8 py-5 text-center">
                       <div className={`inline-flex items-center gap-1 font-black text-[11px] ${
                         t.trend >= 0 ? 'text-emerald-600' : 'text-rose-600'
                       }`}>
                         {t.trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                         {Math.abs(t.trend)}%
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-gray-400 mt-12 text-center uppercase font-bold tracking-widest font-mono">
        Clinical Performance Protocol • Data Segregated by Provider • SECURE ANALYTICS
      </p>
    </div>
  );
}

function PerformanceStatCard({ label, value, icon, description }: { label: string; value: string; icon: React.ReactNode; description: string }) {
  return (
    <Card className="p-6 border-gray-100 shadow-soft-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
        <div className="p-2 bg-gray-50 rounded-xl">{icon}</div>
      </div>
      <p className="text-3xl font-black text-gray-900 mb-1">{value}</p>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">{description}</p>
    </Card>
  );
}
