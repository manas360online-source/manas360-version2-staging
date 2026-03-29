import { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/admin.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import { 
  Download, 
  Search, 
  ShieldCheck, 
  History, 
  User, 
  Activity, 
  Globe, 
  Info,
  Filter,
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuditLog {
  id: string;
  timestamp: string;
  adminName: string;
  action: string;
  entity: string;
  details: string;
  ip: string;
}

export default function AuditTrail() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/v1/admin/audit?limit=100');
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const filteredAndSortedLogs = useMemo(() => {
    let result = logs.filter(log =>
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.adminName && log.adminName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.entity && log.entity.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return result.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [searchTerm, logs, sortOrder]);

  const exportCSV = () => {
    if (filteredAndSortedLogs.length === 0) {
      toast.error('No logs to export');
      return;
    }

    const headers = ['Timestamp', 'Admin', 'Action', 'Entity', 'Details', 'IP Address'];
    const rows = filteredAndSortedLogs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.adminName || 'System',
      log.action,
      log.entity || 'N/A',
      `"${log.details.replace(/"/g, '""')}"`,
      log.ip
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `manas360-audit-trail-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Audit trail exported successfully');
  };

  const getActionBadgeVariant = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('create') || act.includes('add') || act.includes('approve')) return 'success';
    if (act.includes('delete') || act.includes('remove') || act.includes('reject')) return 'destructive';
    if (act.includes('update') || act.includes('edit')) return 'warning';
    return 'info';
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Retrieving secure audit logs...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 min-h-screen pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-emerald-700" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit">Audit Trail</h1>
          </div>
          <p className="text-slate-500 max-w-2xl font-inter">
            Immutable security and compliance log. Track every administrative action across the platform for accountability and security oversight.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200/60 transition-smooth hover:shadow-md">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-emerald-500 transition-colors" />
            <Input
              placeholder="Filter by admin, action, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-[350px] bg-slate-50/50 border-none focus-visible:ring-1 focus-visible:ring-emerald-500 h-11 rounded-xl"
            />
          </div>
          <Button 
            onClick={exportCSV} 
            variant="secondary"
            className="h-11 px-6 rounded-xl hover:bg-slate-100 transition-all font-semibold gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="h-11 w-11 p-0 rounded-xl"
            title="Toggle Sort Order"
          >
            <ArrowUpDown className={`w-4 h-4 transition-transform duration-300 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Summary - Mini Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Logs', value: logs.length, icon: History, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Recent 24h', value: logs.filter(l => new Date(l.timestamp).getTime() > Date.now() - 86400000).length, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'System Actions', value: logs.filter(l => !l.adminName || l.adminName === 'System').length, icon: Info, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: 'Network IPs', value: new Set(logs.map(l => l.ip)).size, icon: Globe, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <Card key={i} className="p-4 border-slate-200/60 shadow-sm flex items-center gap-4 hover:shadow-md transition-all group">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Log Table */}
      <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white/50 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80">
                <th className="px-6 py-5 text-sm font-bold text-slate-800 uppercase tracking-tight">Timeline</th>
                <th className="px-6 py-5 text-sm font-bold text-slate-800 uppercase tracking-tight">Administrator</th>
                <th className="px-6 py-5 text-sm font-bold text-slate-800 uppercase tracking-tight text-center">Action</th>
                <th className="px-6 py-5 text-sm font-bold text-slate-800 uppercase tracking-tight">Entity Context</th>
                <th className="px-6 py-5 text-sm font-bold text-slate-800 uppercase tracking-tight">Transaction Details</th>
                <th className="px-6 py-5 text-sm font-bold text-slate-800 uppercase tracking-tight text-right">Identifier (IP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence mode="popLayout">
                {filteredAndSortedLogs.map((log) => (
                  <motion.tr 
                    key={log.id}
                    layout
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="hover:bg-slate-50/80 transition-all group relative border-l-2 border-l-transparent hover:border-l-emerald-500"
                  >
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">
                          {new Date(log.timestamp).toLocaleDateString(undefined, { 
                            month: 'short', day: 'numeric', year: 'numeric' 
                          })}
                        </span>
                        <span className="text-xs font-mono text-slate-500 mt-0.5">
                          {new Date(log.timestamp).toLocaleTimeString(undefined, { 
                            hour: '2-digit', minute: '2-digit', second: '2-digit' 
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 overflow-hidden shadow-inner">
                          <User className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-slate-700">{log.adminName || 'System Process'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <Badge 
                        variant={getActionBadgeVariant(log.action)} 
                        className="px-3 py-1 font-bold tracking-tight shadow-sm min-w-[100px] justify-center"
                      >
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                        {log.entity || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm text-slate-600 max-w-sm line-clamp-2 leading-relaxed font-medium">
                        {log.details}
                      </p>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500 border border-slate-200 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all duration-300">
                        {log.ip}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              
              {filteredAndSortedLogs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-32 text-center bg-slate-50/30">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="p-4 bg-white rounded-2xl shadow-sm ring-1 ring-slate-200">
                        <History className="w-10 h-10 text-slate-300" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xl font-bold text-slate-900">No activity matching your search</p>
                        <p className="text-slate-500 max-w-sm mx-auto">We couldn't find any log entries for the current filters. Try refining your keywords or clearing the search.</p>
                      </div>
                      <Button 
                        variant="secondary" 
                        onClick={() => setSearchTerm('')}
                        className="mt-2"
                      >
                        Clear Search
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer info */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between">
          <p className="text-xs text-slate-500 flex items-center gap-2 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Secure encryption applied to all log transmission. Entries are immutable.
          </p>
          <div className="text-xs text-slate-400">
            Showing {filteredAndSortedLogs.length} of {logs.length} entries
          </div>
        </div>
      </Card>
    </div>
  );
}
