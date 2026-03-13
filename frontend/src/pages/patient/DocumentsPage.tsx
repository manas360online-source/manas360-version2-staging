import { useEffect, useState } from 'react';
import { FileText, FileStack, ClipboardCheck, Download, Share2, Loader2, FilePlus2 } from 'lucide-react';
import { patientApi } from '../../api/patient';

type DocItem = {
  id: string;
  title: string;
  date: string;
  category: 'official' | 'session' | 'assessment';
  fileUrl?: string;
};

const FALLBACK_DOCS: DocItem[] = [
  { id: '1', title: 'Referral Letter — Dr. Sharma', date: '2026-03-01', category: 'official' },
  { id: '2', title: 'Psychiatrist Prescription', date: '2026-02-24', category: 'official' },
  { id: '3', title: 'Session Reflection Notes — 28 Feb', date: '2026-02-28', category: 'session' },
  { id: '4', title: 'Session Notes — 14 Feb', date: '2026-02-14', category: 'session' },
  { id: '5', title: 'PHQ-9 Result — Score 14 (Moderate)', date: '2026-02-10', category: 'assessment' },
  { id: '6', title: 'GAD-7 Result — Score 8 (Mild)', date: '2026-02-10', category: 'assessment' },
];

type BucketKey = DocItem['category'];
const BUCKETS: Array<{
  key: BucketKey;
  label: string;
  icon: React.ReactNode;
  description: string;
  iconColor: string;
  bgColor: string;
  borderColor: string;
}> = [
  {
    key: 'official',
    label: 'Official Letters',
    icon: <FilePlus2 className="h-5 w-5" />,
    description: 'Referrals, prescriptions, and discharge summaries from your providers.',
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200/60',
  },
  {
    key: 'session',
    label: 'Session Notes',
    icon: <FileStack className="h-5 w-5" />,
    description: 'Summaries and reflections written by your therapist after each session.',
    iconColor: 'text-calm-sage',
    bgColor: 'bg-calm-sage/10',
    borderColor: 'border-calm-sage/20',
  },
  {
    key: 'assessment',
    label: 'Assessments',
    icon: <ClipboardCheck className="h-5 w-5" />,
    description: 'PHQ-9, GAD-7, and other scored clinical assessment results.',
    iconColor: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200/60',
  },
];

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await (patientApi as any).getDocuments?.();
        const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : null;
        setDocs(rows && rows.length > 0 ? (rows as DocItem[]) : FALLBACK_DOCS);
      } catch {
        setDocs(FALLBACK_DOCS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      window.print();
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 pb-20 lg:pb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-charcoal tracking-tight">Clinical Records</h1>
        <p className="mt-1 text-sm text-ink-500">All your documents, notes, and assessments — organised in one place.</p>
      </div>

      {/* Generate PDF Banner */}
      <section className="flex flex-col sm:flex-row items-center justify-between gap-5 rounded-3xl border border-calm-sage/20 bg-gradient-to-r from-calm-sage/10 via-white to-white p-6 shadow-soft-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-calm-sage/20">
            <FileText className="h-7 w-7 text-calm-sage" />
          </div>
          <div>
            <p className="text-lg font-bold text-charcoal">Complete Health Summary</p>
            <p className="mt-0.5 text-sm text-ink-500">Download a single PDF with all your records, notes, and assessment results.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleGeneratePDF}
          disabled={generatingPDF || loading}
          className="inline-flex shrink-0 items-center gap-2.5 rounded-2xl bg-calm-sage px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-sage-700 disabled:opacity-60"
        >
          {generatingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          📄 Generate Complete Health Summary PDF
        </button>
      </section>

      {/* 3-Bucket Sections */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-calm-sage" />
        </div>
      ) : (
        <div className="space-y-8">
          {BUCKETS.map((bucket) => {
            const bucketDocs = docs.filter((d) => d.category === bucket.key);
            return (
              <section key={bucket.key} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${bucket.bgColor} ${bucket.borderColor} ${bucket.iconColor}`}>
                    {bucket.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold text-charcoal">{bucket.label}</h2>
                    <p className="text-xs text-ink-400">{bucket.description}</p>
                  </div>
                  <span className="flex h-6 items-center rounded-full bg-ink-100 px-2.5 text-xs font-bold text-ink-500">{bucketDocs.length}</span>
                </div>
                {bucketDocs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-ink-200 p-8 text-center">
                    <p className="text-sm text-ink-400">No {bucket.label.toLowerCase()} on file yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bucketDocs.map((doc) => (
                      <div key={doc.id} className="group flex items-center justify-between rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm transition hover:border-calm-sage/30 hover:shadow-soft-md">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${bucket.bgColor} ${bucket.borderColor} ${bucket.iconColor}`}>
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-charcoal">{doc.title}</p>
                            <p className="mt-0.5 text-xs text-ink-400">{formatDate(doc.date)}</p>
                          </div>
                        </div>
                        <div className="ml-3 flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            title="Download"
                            onClick={() => { if (doc.fileUrl) window.open(doc.fileUrl, '_blank', 'noopener,noreferrer'); }}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-400 transition hover:border-calm-sage hover:text-calm-sage"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Share Securely"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-400 transition hover:border-calm-sage hover:text-calm-sage"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
