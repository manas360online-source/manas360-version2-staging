import { useState, useEffect, useCallback } from 'react';
import { 
  getAdminCompanyReports, 
  getAdminBICorporateSummary, 
  triggerAnalyticsExport,
  getAdminExportDownloadUrl,
  type AdminCompanyReport, 
  type AdminBIStats 
} from '../../api/admin.api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import { Download, FileText, TrendingUp, ShieldCheck, Briefcase } from 'lucide-react';

export default function Reports() {
  const [reports, setReports] = useState<AdminCompanyReport[]>([]);
  const [summary, setSummary] = useState<AdminBIStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const [reportsRes, summaryRes] = await Promise.all([
        getAdminCompanyReports(),
        getAdminBICorporateSummary()
      ]);
      setReports(reportsRes.data || []);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load business intelligence reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      await triggerAnalyticsExport();
      toast.success('Report generation triggered. Refreshing inventory...');
      setTimeout(() => fetchReports(), 2000);
    } catch (err) {
      toast.error('Failed to initiate report generation');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = async (id: string, format: string) => {
    // Standard implementation for file download via signed URL or direct blob
    toast.success(`Initializing secure download for ${format} report...`);
    window.open(getAdminExportDownloadUrl(id), '_blank');
  };

  if (loading || !summary) return <div className="p-12 text-center text-gray-400 italic animate-pulse">Aggregating Business Intelligence data...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Intelligence & Reports</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Quarterly performance metrics and archival corporate reports center.</p>
        </div>
        <div className="flex gap-3">
           <Button 
             onClick={handleGenerateReport} 
             disabled={isGenerating}
             className="bg-gray-900 hover:bg-black text-white px-6 rounded-xl text-xs font-black uppercase tracking-widest h-11"
           >
             {isGenerating ? 'Compiling...' : 'Generate New BI Report'}
           </Button>
        </div>
      </div>

      {/* Value Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-10">
        <BIStatCard label="Total Value Unlocked" value={`₹${(summary.totalValueUnlocked / 100000).toFixed(1)}L`} icon={<TrendingUp className="w-4 h-4 text-emerald-500" />} />
        <BIStatCard label="Program Cost" value={`₹${(summary.programCost / 1000).toFixed(0)}K`} icon={<Briefcase className="w-4 h-4 text-blue-500" />} />
        <BIStatCard label="Quarterly ROI" value={`${summary.roi}X`} icon={<TrendingUp className="w-4 h-4 text-emerald-500" />} color="text-emerald-600" />
        <BIStatCard label="Healthcare Savings" value={`₹${(summary.healthcareSavings / 1000).toFixed(0)}K`} icon={<ShieldCheck className="w-4 h-4 text-purple-500" />} />
        <BIStatCard label="ROI Multiplier" value={`${summary.roiMultiplier}X`} icon={<TrendingUp className="w-4 h-4 text-blue-500" />} />
      </div>

      {/* Generated Reports Inventory */}
      <div className="bg-white rounded-[2rem] shadow-2xl shadow-gray-100 border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
           <h3 className="font-bold text-gray-800 text-base uppercase tracking-wider flex items-center gap-2">
             <FileText className="w-5 h-5 text-gray-400" />
             Archival Report Repository
           </h3>
           <Badge variant="soft" className="bg-white border-gray-200 text-gray-500 font-black text-[10px]">{reports.length} Reports Found</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                <th className="px-8 py-4">Company Entity</th>
                <th className="px-8 py-4">Cycle / Quarter</th>
                <th className="px-8 py-4 text-center">Protocol Format</th>
                <th className="px-8 py-4">Generation Date</th>
                <th className="px-8 py-4 text-center">System Status</th>
                <th className="px-8 py-4 text-center">Archival Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center text-gray-400 italic">No historical reports found. Generate your first BI capture above.</td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-8 py-4 font-bold text-gray-900">{report.companyName || 'Global Platform'}</td>
                    <td className="px-8 py-4">{report.quarter || 'Full Cycle'}</td>
                    <td className="px-8 py-4 text-center">
                       <Badge variant="soft" className="bg-gray-50 text-gray-500 border-gray-100 font-black text-[10px] uppercase">{report.format}</Badge>
                    </td>
                    <td className="px-8 py-4 text-gray-500 text-xs">
                       {new Date(report.generatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-8 py-4 text-center">
                       <Badge variant="soft" className={`text-[10px] font-black uppercase tracking-widest ${
                         report.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                       }`}>
                         {report.status}
                       </Badge>
                    </td>
                    <td className="px-8 py-4 text-center">
                       <Button
                         variant="secondary"
                         size="sm"
                         disabled={report.status !== 'completed'}
                         onClick={() => downloadReport(report.id, report.format)}
                         className="text-[10px] font-black uppercase tracking-widest h-8 px-4 rounded-lg border-gray-100 text-blue-600 hover:bg-blue-50"
                       >
                         <Download className="w-3 h-3 mr-2" />
                         Download
                       </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-gray-400 mt-12 text-center uppercase font-bold tracking-widest font-mono">
        BI Engine Protocol • API: Admin.v1 • SECURE DATA EGRESS
      </p>
    </div>
  );
}

function BIStatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color?: string }) {
  return (
    <Card className="p-6 border-gray-100 shadow-soft-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
        <div className="p-1.5 bg-gray-50 rounded-lg">{icon}</div>
      </div>
      <p className={`text-2xl font-black ${color || 'text-gray-900'}`}>{value}</p>
    </Card>
  );
}
