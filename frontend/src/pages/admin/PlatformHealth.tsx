import { useState, useEffect, useCallback } from 'react';
import { getAdminSystemHealth, type AdminSystemHealthMetrics } from '../../api/admin.api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import toast from 'react-hot-toast';

export default function PlatformHealth() {
  const [health, setHealth] = useState<AdminSystemHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await getAdminSystemHealth();
      setHealth(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load platform health telemetry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading || !health) {
    return <div className="p-12 text-center text-gray-400 italic font-medium animate-pulse">Establishing secure link to infrastructure...</div>;
  }

  const getStatusColor = (status: string) => {
    if (status === 'Healthy') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (status === 'Degraded') return 'bg-amber-50 text-amber-600 border-amber-100';
    return 'bg-red-50 text-red-600 border-red-100';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Health Monitor</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium italic">Global infrastructure telemetry & service-level heartbeat (War Room Console).</p>
        </div>
        <Badge variant="soft" className={`px-4 py-1.5 text-[11px] font-black uppercase tracking-wider border ${getStatusColor(health.overall)}`}>
          {health.overall} • Sync: {new Date(health.lastChecked).toLocaleTimeString()}
        </Badge>
      </div>

      {/* Infrastructure KPI Nexus */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <Card className="p-6 border-gray-100 shadow-soft-sm hover:shadow-soft-md transition-shadow">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Platform Uptime</p>
          <div className="flex items-baseline gap-1">
             <p className="text-4xl font-black text-gray-900">{health.uptimePercent}</p>
             <span className="text-xl font-bold text-gray-400">%</span>
          </div>
          <div className="mt-4 h-1 w-full bg-gray-50 rounded-full overflow-hidden">
             <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${health.uptimePercent}%` }}></div>
          </div>
        </Card>
        
        <Card className="p-6 border-gray-100 shadow-soft-sm hover:shadow-soft-md transition-shadow">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">API Latency</p>
          <div className="flex items-baseline gap-1">
             <p className="text-4xl font-black text-gray-900">{health.latencyMs}</p>
             <span className="text-lg font-bold text-gray-400">ms</span>
          </div>
          <div className="mt-4 flex items-center gap-2">
             <div className={`h-2 w-2 rounded-full ${health.latencyMs < 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
             <span className="text-[10px] font-bold text-gray-500 uppercase">Responders Nominal</span>
          </div>
        </Card>

        <Card className="p-6 border-gray-100 shadow-soft-sm hover:shadow-soft-md transition-shadow">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Active Sessions</p>
          <p className="text-4xl font-black text-gray-900">{health.activeSessions}</p>
          <p className="mt-4 text-[10px] font-bold text-emerald-600 uppercase tracking-tight flex items-center gap-1">
             <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
             </span>
             Live Clinical Traffic
          </p>
        </Card>

        <Card className="p-6 border-gray-100 shadow-soft-sm hover:shadow-soft-md transition-shadow">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Provider Network</p>
          <p className="text-4xl font-black text-gray-900">{health.totalTherapists}</p>
          <p className="mt-4 text-[10px] font-bold text-gray-500 uppercase tracking-tight">Verified Therapists</p>
        </Card>
      </div>

      {/* Service Grid - Operational Intelligence */}
      <div className="bg-white rounded-[2rem] shadow-2xl shadow-gray-100 border border-gray-100 p-8">
        <div className="flex items-center justify-between mb-8">
           <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 italic">Service Grid Heartbeat</h2>
           <div className="flex gap-2">
              <Badge variant="soft" className="bg-gray-50 text-gray-400 text-[10px] font-black">TCP/HTTP Protocol</Badge>
              <Badge variant="soft" className="bg-gray-50 text-gray-400 text-[10px] font-black">SSL: ACTIVE</Badge>
           </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(health.services).map(([service, status]) => (
            <div key={service} className="flex items-center justify-between bg-gray-50/50 rounded-2xl p-6 border border-gray-100 group hover:border-blue-100 hover:bg-white transition-all">
              <div className="flex flex-col">
                 <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Module</span>
                 <span className="font-bold text-gray-900 text-base capitalize">{service.replace(/([A-Z])/g, ' $1')}</span>
              </div>
              <Badge variant="soft" className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest border transition-colors ${getStatusColor(status as string)}`}>
                {status as string}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 flex flex-col items-center gap-2">
         <p className="text-[10px] text-gray-400 uppercase font-black tracking-[0.2em] font-mono">
           Infrastructure auto-probe active • Cycle: 30s • Version: Core-v1.4
         </p>
         <div className="h-1 w-32 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 animate-progress"></div>
         </div>
      </div>
    </div>
  );
}
