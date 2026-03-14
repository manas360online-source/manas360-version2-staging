import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, FileX, ArrowLeft } from 'lucide-react';
import { patientApi } from '../../api/patient';

type SharedMeta = {
  id: string;
  title: string;
  status: string;
  sharedTimestamp: string;
  expiresAt: string;
  expiresInHours?: number;
};

const saveBlob = (blob: Blob, fileName: string) => {
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
};

export default function PatientReportDownloadPage() {
  const { id = '' } = useParams();
  const [meta, setMeta] = useState<SharedMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await patientApi.getSharedReportMeta(id);
        const payload = (res as any)?.data ?? res;
        setMeta(payload as SharedMeta);
      } catch (err: any) {
        setError(String(err?.response?.data?.message || err?.message || 'Report is unavailable'));
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      void run();
    } else {
      setError('Report id is missing');
      setLoading(false);
    }
  }, [id]);

  const fileName = useMemo(() => {
    const base = String(meta?.title || 'patient-report').replace(/\s+/g, '-').toLowerCase();
    return `${base}.pdf`;
  }, [meta?.title]);

  const onDownload = async () => {
    if (!id) return;
    setDownloading(true);
    try {
      const blob = await patientApi.downloadSharedReport(id);
      saveBlob(blob as Blob, fileName);
    } catch (err: any) {
      setError(String(err?.response?.data?.message || err?.message || 'Download failed'));
    } finally {
      setDownloading(false);
    }
  };

  const expired = !!error && error.toLowerCase().includes('expired');

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-16">
      <Link to="/patient/reports" className="inline-flex items-center gap-1 text-xs font-medium text-charcoal/70 hover:text-charcoal">
        <ArrowLeft className="h-4 w-4" />
        Back to reports
      </Link>

      <section className="rounded-2xl border border-calm-sage/15 bg-white/95 p-6 shadow-soft-sm">
        {loading ? (
          <p className="text-sm text-charcoal/60">Loading shared report...</p>
        ) : null}

        {!loading && error ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-rose-700">
              <FileX className="h-5 w-5" />
              <h1 className="text-lg font-semibold">Report unavailable</h1>
            </div>
            <p className="text-sm text-charcoal/70">{error}</p>
            {expired ? <p className="text-xs text-charcoal/55">This link is valid for 24 hours from provider sharing time.</p> : null}
          </div>
        ) : null}

        {!loading && !error && meta ? (
          <div className="space-y-4">
            <h1 className="text-xl font-semibold text-charcoal">{meta.title}</h1>
            <div className="rounded-xl border border-calm-sage/20 bg-calm-sage/5 p-3 text-xs text-charcoal/70">
              <p>Shared: {new Date(meta.sharedTimestamp).toLocaleString()}</p>
              <p>Expires: {new Date(meta.expiresAt).toLocaleString()}</p>
            </div>

            <button
              type="button"
              onClick={() => void onDownload()}
              disabled={downloading}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-calm-sage px-4 py-2 text-sm font-medium text-white transition hover:bg-calm-sage/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Download className="h-4 w-4" />
              {downloading ? 'Preparing download...' : 'Download PDF'}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
