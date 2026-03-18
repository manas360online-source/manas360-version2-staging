import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, Eye, Share2, ClipboardList, Activity, Pill, TrendingUp } from 'lucide-react';
import { patientApi } from '../../api/patient';
import toast from 'react-hot-toast';

type ReportItem = {
  id: string;
  title: string;
  type: 'session_summary' | 'treatment_progress' | 'medication_summary' | 'therapy_outcome' | 'mood_report' | 'assessment';
  summary?: string;
  providerName?: string;
  createdAt: string;
};

const typeConfig: Record<string, { icon: typeof FileText; color: string; label: string }> = {
  session_summary: { icon: ClipboardList, color: 'text-blue-600 bg-blue-50 border-blue-200', label: 'Session Summary' },
  treatment_progress: { icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', label: 'Treatment Progress' },
  medication_summary: { icon: Pill, color: 'text-purple-600 bg-purple-50 border-purple-200', label: 'Medication Summary' },
  therapy_outcome: { icon: Activity, color: 'text-teal-600 bg-teal-50 border-teal-200', label: 'Therapy Outcome' },
  mood_report: { icon: Activity, color: 'text-amber-600 bg-amber-50 border-amber-200', label: 'Mood Report' },
  assessment: { icon: FileText, color: 'text-rose-600 bg-rose-50 border-rose-200', label: 'Assessment Report' },
};

const fallbackReports: ReportItem[] = [
  {
    id: 'f1',
    title: 'Mood Trend Report',
    type: 'mood_report',
    summary: 'Weekly mood and trigger summary based on your daily check-ins.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'f2',
    title: 'Assessment History',
    type: 'assessment',
    summary: 'PHQ-9 / GAD-7 score progression over the last 30 days.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'f3',
    title: 'Therapy Adherence',
    type: 'treatment_progress',
    summary: 'Sessions, exercises, and completion consistency across your care plan.',
    createdAt: new Date().toISOString(),
  },
];

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await patientApi.getReports();
        const data = (res as any)?.data ?? res;
        const items = Array.isArray(data) ? data : [];
        setReports(items.length > 0 ? items : fallbackReports);
      } catch {
        setReports(fallbackReports);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredReports = filter === 'all' ? reports : reports.filter((r) => r.type === filter);

  const filterOptions = [
    { key: 'all', label: 'All Reports' },
    { key: 'session_summary', label: 'Session' },
    { key: 'treatment_progress', label: 'Progress' },
    { key: 'medication_summary', label: 'Medication' },
    { key: 'therapy_outcome', label: 'Outcome' },
    { key: 'mood_report', label: 'Mood' },
    { key: 'assessment', label: 'Assessment' },
  ];

  const handleAction = async (report: ReportItem, action: 'view' | 'download' | 'share') => {
    if (report.id.startsWith('f')) {
      toast.error('Sample reports cannot be accessed. Real reports will appear after your sessions.');
      return;
    }
    try {
      if (action === 'share') {
        const res = await patientApi.createRecordShareLink(report.id);
        const data = (res as any)?.data ?? res;
        if (data.shareUrl) {
          await navigator.clipboard.writeText(`Report: ${report.title}\nLink: ${data.shareUrl}\nPIN: ${data.pin}`);
          toast.success('Share link and PIN copied to clipboard!');
        }
        return;
      }

      const res = await patientApi.getRecordSecureUrl(report.id);
      const data = (res as any)?.data ?? res;
      if (data.secureUrl) {
        window.open(data.secureUrl, '_blank', 'noopener,noreferrer');
      } else {
        toast.error('Could not generate secure link');
      }
    } catch (e) {
      console.error(`Report ${action} failed:`, e);
      toast.error(`Failed to ${action} report`);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 pb-20 lg:pb-6">
      {/* Header */}
      <section className="rounded-2xl border border-calm-sage/15 bg-white/90 p-5 shadow-soft-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-calm-sage/15">
            <FileText className="h-5 w-5 text-calm-sage" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-charcoal sm:text-3xl">Reports</h1>
            <p className="mt-1 text-sm text-charcoal/70">View, download, and share clinical progress reports.</p>
          </div>
        </div>
      </section>

      {/* Documents Link */}
      <section className="rounded-xl border border-calm-sage/15 bg-white/90 p-4">
        <p className="text-sm text-charcoal/70">Need complete documents and prescriptions?</p>
        <Link
          to="/patient/documents"
          className="mt-2 inline-flex min-h-[34px] items-center gap-1.5 rounded-xl border border-calm-sage/25 px-3 text-xs font-medium text-charcoal/70 transition hover:bg-calm-sage/10"
        >
          <FileText className="h-3.5 w-3.5" />
          Open Document Center
        </Link>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-calm-sage/15 bg-white/90 p-3">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Total Reports</p>
          <p className="mt-1 text-xl font-semibold text-charcoal">{reports.length}</p>
        </div>
        <div className="rounded-xl border border-calm-sage/15 bg-white/90 p-3">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Session Reports</p>
          <p className="mt-1 text-xl font-semibold text-charcoal">
            {reports.filter((r) => r.type === 'session_summary').length}
          </p>
        </div>
        <div className="rounded-xl border border-calm-sage/15 bg-white/90 p-3">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Progress Reports</p>
          <p className="mt-1 text-xl font-semibold text-charcoal">
            {reports.filter((r) => r.type === 'treatment_progress').length}
          </p>
        </div>
        <div className="rounded-xl border border-calm-sage/15 bg-white/90 p-3">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">This Month</p>
          <p className="mt-1 text-xl font-semibold text-calm-sage">
            {reports.filter((r) => {
              const d = new Date(r.createdAt);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length}
          </p>
        </div>
      </section>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setFilter(opt.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === opt.key
                ? 'bg-calm-sage text-white'
                : 'border border-calm-sage/20 bg-white text-charcoal/70 hover:bg-calm-sage/10'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Reports List */}
      {loading && (
        <div className="rounded-xl border border-calm-sage/15 bg-white/90 p-8 text-center text-sm text-charcoal/60">
          Loading reports...
        </div>
      )}

      {!loading && filteredReports.length === 0 && (
        <div className="rounded-xl border border-calm-sage/15 bg-white/90 p-8 text-center">
          <p className="text-sm text-charcoal/60">No reports in this category yet.</p>
          <p className="mt-1 text-xs text-charcoal/50">Reports will appear after your therapist completes session notes.</p>
        </div>
      )}

      <div className="space-y-3">
        {filteredReports.map((report) => {
          const config = typeConfig[report.type] || typeConfig.assessment;
          const Icon = config.icon;

          return (
            <article key={report.id} className="rounded-2xl border border-calm-sage/15 bg-white/90 p-5 shadow-soft-sm transition hover:border-calm-sage/25">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${config.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-charcoal">{report.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${config.color}`}>
                        {config.label}
                      </span>
                      <span className="text-xs text-charcoal/50">
                        {new Date(report.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    {report.providerName && (
                      <p className="mt-1 text-xs text-charcoal/55">By {report.providerName}</p>
                    )}
                    {report.summary && (
                      <p className="mt-2 text-xs text-charcoal/65 line-clamp-2">{report.summary}</p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleAction(report, 'view')}
                    className="inline-flex min-h-[34px] items-center gap-1.5 rounded-xl border border-calm-sage/25 px-3 text-xs font-medium text-charcoal/70 transition hover:bg-calm-sage/10"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(report, 'download')}
                    className="inline-flex min-h-[34px] items-center gap-1.5 rounded-xl border border-calm-sage/25 px-3 text-xs font-medium text-charcoal/70 transition hover:bg-calm-sage/10"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(report, 'share')}
                    className="inline-flex min-h-[34px] items-center gap-1.5 rounded-xl border border-calm-sage/25 px-3 text-xs font-medium text-charcoal/70 transition hover:bg-calm-sage/10"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

    </div>
  );
}
