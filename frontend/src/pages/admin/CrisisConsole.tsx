import { useState, useEffect, useCallback } from 'react';
import { getCrisisAlerts, respondToCrisis, type CrisisAlert } from '../../api/admin.api';
import { useSocket } from '../../context/SocketContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import toast from 'react-hot-toast';

export default function CrisisConsole() {
  const [alerts, setAlerts] = useState<CrisisAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await getCrisisAlerts();
      // API returns ApiEnvelope { success: true, data: CrisisAlert[] }
      setAlerts(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load crisis alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();

    if (!socket) return;

    // Real-time listener for new crisis alerts from Zoho Flow/Backend
    socket.on('crisis-alert', (newAlert: CrisisAlert) => {
      setAlerts(prev => [newAlert, ...prev]);
      toast.error(`🚨 NEW CRISIS: ${newAlert.trigger}`, {
        duration: 6000,
        position: 'top-right'
      });
      
      // Play alert sound if needed
      try {
        const audio = new Audio('/assets/sounds/crisis-alert.mp3');
        audio.play().catch(() => {}); // Browser might block auto-play
      } catch (e) {}
    });

    // Real-time listener for external resolutions
    socket.on('crisis-resolved', ({ id }: { id: string }) => {
      setAlerts(prev => prev.filter(a => a.id !== id));
      toast.success('Crisis alert resolved externally');
    });

    return () => {
      socket.off('crisis-alert');
      socket.off('crisis-resolved');
    };
  }, [socket, fetchAlerts]);

  const handleRespond = async (id: string) => {
    const notes = prompt('Enter response notes (optional):') || 'Responded via Crisis Console';
    try {
      await respondToCrisis(id, { action: 'responded', notes });
      toast.success('Crisis marked as responded');
      fetchAlerts();
    } catch (err) {
      toast.error('Failed to respond to crisis');
    }
  };

  const activeCrisisCount = alerts.filter(a => a.status === 'pending').length;

  if (loading) return <div className="p-8 text-center text-gray-500 italic">Synchronizing War Room...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <span className="p-2 bg-red-50 rounded-xl text-red-600 animate-pulse">🚨</span> 
            Clinical Crisis Console
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Real-time monitoring of high-risk clinical triggers & Zoho Flow escalations.</p>
        </div>
        <div className="flex items-center gap-3">
           <Badge variant="soft" className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50">
             Socket Live: {socket?.connected ? 'Connected' : 'Reconnecting...'}
           </Badge>
           <Button onClick={fetchAlerts} variant="secondary" size="sm" className="text-[10px] font-black uppercase tracking-widest border-gray-200">
             Refresh Feed
           </Button>
        </div>
      </div>

      {/* War Room Banner (High Visibility) */}
      {activeCrisisCount > 0 && (
        <div className="bg-red-600 text-white p-8 rounded-[2rem] mb-10 shadow-2xl shadow-red-200 flex flex-col md:flex-row items-center justify-between border-4 border-red-500/50">
          <div className="mb-4 md:mb-0">
            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-white animate-ping" />
              High-Risk Crisis Detected
            </h2>
            <p className="text-red-100 font-medium text-sm mt-1">
              Immediate clinical intervention required for {activeCrisisCount} active alert{activeCrisisCount > 1 ? 's' : ''}.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden lg:block mr-4">
              <p className="text-[10px] uppercase font-black tracking-widest text-red-300">Target Response Time</p>
              <p className="font-mono text-xl font-black">&lt; 180s</p>
            </div>
            <Button className="bg-white text-red-600 hover:bg-red-50 font-black uppercase tracking-widest px-8 rounded-xl shadow-lg border-0">
              Engage War Room
            </Button>
          </div>
        </div>
      )}

      {/* Alerts Table */}
      <div className="bg-white rounded-2xl shadow-soft-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
           <h3 className="font-bold text-gray-800 text-base uppercase tracking-wider">Alert Feed</h3>
           <Badge variant="secondary" className="text-[10px] font-black">{alerts.length} Total Today</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                <th className="px-6 py-4">Patient ID</th>
                <th className="px-6 py-4 text-center">Severity</th>
                <th className="px-6 py-4">Trigger Event</th>
                <th className="px-6 py-4">Session Context</th>
                <th className="px-6 py-4">Detected</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-emerald-600 font-bold italic">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl text-emerald-500">🛡️</span>
                      All Clear — No active crisis alerts.
                    </div>
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert.id} className={`hover:bg-gray-50/30 transition-colors ${alert.status === 'pending' ? 'bg-red-50/10' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-black text-gray-400 text-[11px]">USER_REF</span>
                        <span className="font-bold text-gray-900">#{alert.patientId.slice(-8).toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge 
                        variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                        className="text-[10px] font-black uppercase tracking-wider px-2"
                      >
                        {alert.severity}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-[300px]">
                        <p className="font-bold text-gray-800 leading-tight">{alert.trigger}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-1">Source: Zoho Flow Event</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-gray-500">
                      {alert.sessionId ? (
                        <div className="flex items-center gap-1.5 underline decoration-gray-200 cursor-pointer hover:decoration-blue-400 hover:text-blue-500 transition-colors">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                          {alert.sessionId.slice(-8).toUpperCase()}
                        </div>
                      ) : 'Platform Flow'}
                    </td>
                    <td className="px-6 py-4">
                       <p className="text-xs font-bold text-gray-600">{new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                       <p className="text-[10px] text-gray-400 font-medium">{new Date(alert.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {alert.status === 'pending' ? (
                        <Button
                          onClick={() => handleRespond(alert.id)}
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest py-1.5 px-4 shadow-lg shadow-red-100 border-0"
                        >
                          Respond Now
                        </Button>
                      ) : (
                        <div className="flex flex-col items-center opacity-50">
                           <Badge variant="soft" className="text-[10px] uppercase font-black tracking-tight bg-emerald-50 text-emerald-600">
                             {alert.status}
                           </Badge>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-gray-400 mt-12 text-center uppercase font-bold tracking-widest font-mono">
        Clinical War Room • Real-time Safety Protocol • API: Admin.v1 • Platform Guardian
      </p>
    </div>
  );
}
