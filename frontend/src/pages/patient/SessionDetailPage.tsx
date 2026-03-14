import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { patientApi } from '../../api/patient';

export default function SessionDetailPage() {
  const { id = '' } = useParams();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<'session' | 'invoice' | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const detailRes = await patientApi.getSessionDetail(id);
        const detail = (detailRes?.data ?? detailRes) || null;
        setSession(detail);
      } catch (err: any) {
        setSession(null);
        setError(err?.response?.data?.message || 'Unable to load session details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const isPsychiatristSession = useMemo(() => {
    const providerRole = String(session?.provider?.role || '').toLowerCase();
    const providerName = String(session?.provider?.name || '').toLowerCase();
    return providerRole === 'psychiatrist' || providerName.includes('psychiatrist');
  }, [session?.provider?.name, session?.provider?.role]);

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const onDownloadSessionPdf = async () => {
    if (!id) return;
    setDownloading('session');
    setError(null);
    try {
      const blob = await patientApi.downloadSessionPdf(id);
      downloadBlob(blob, `session-${session?.booking_reference || id}.pdf`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to download session PDF.');
    } finally {
      setDownloading(null);
    }
  };

  const onDownloadInvoicePdf = async () => {
    if (!id) return;
    setDownloading('invoice');
    setError(null);
    try {
      const blob = await patientApi.downloadInvoicePdf(id);
      downloadBlob(blob, `invoice-${session?.booking_reference || id}.pdf`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to download invoice.');
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-calm-sage/15 bg-white/80 p-6">Loading session details...</div>;
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-calm-sage/15 bg-white/85 p-6">
          <h1 className="font-serif text-2xl font-light">Session not found</h1>
          <p className="mt-2 text-sm text-charcoal/65">{error || 'This session may be unavailable or no longer accessible.'}</p>
          <Link
            to="/patient/sessions"
            className="mt-4 inline-flex min-h-[40px] items-center rounded-full bg-charcoal px-4 text-sm font-medium text-cream"
          >
            Back to Sessions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 lg:pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold text-charcoal md:text-4xl">Session Details</h1>
        <Link
          to="/patient/sessions"
          className="inline-flex min-h-[38px] items-center rounded-full border border-calm-sage/25 px-4 text-sm font-medium text-charcoal/75"
        >
          Back
        </Link>
      </div>

      <section className="rounded-2xl border border-calm-sage/15 bg-white/85 p-5 shadow-soft-sm">
        <h2 className="text-base font-semibold">Session Summary</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          <p><span className="text-charcoal/60">Therapist:</span> <span className="font-medium">{session.provider?.name || 'Therapist'}</span></p>
          <p><span className="text-charcoal/60">Date & Time:</span> <span className="font-medium">{new Date(session.scheduled_at).toLocaleString()}</span></p>
          <p><span className="text-charcoal/60">Status:</span> <span className="font-medium capitalize">{session.status}</span></p>
          <p><span className="text-charcoal/60">Mode:</span> <span className="font-medium">{session.agora_channel ? 'Video' : 'Video / Audio / Chat'}</span></p>
          <p><span className="text-charcoal/60">Booking Ref:</span> <span className="font-medium">{session.booking_reference || '—'}</span></p>
          <p><span className="text-charcoal/60">Payment:</span> <span className="font-medium">{session.payment_status || 'UNPAID'}</span></p>
        </div>
        <div className="mt-4">
          <Link
            to={`/patient/cbt-section/${session.id}`}
            className="inline-flex min-h-[40px] items-center rounded-full bg-charcoal px-4 text-sm font-medium text-cream"
          >
            Open CBT Section
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-calm-sage/15 bg-white/85 p-5 shadow-soft-sm">
        <h2 className="text-base font-semibold">Therapist Notes</h2>
        {session.notes?.available && session.notes?.content ? (
          <div className="mt-2 space-y-2">
            <p className="whitespace-pre-wrap text-sm text-charcoal/75">{session.notes.content}</p>
            {session.notes.updated_at ? <p className="text-xs text-charcoal/55">Updated: {new Date(session.notes.updated_at).toLocaleString()}</p> : null}
          </div>
        ) : session.status === 'completed' ? (
          <p className="mt-2 text-sm text-charcoal/70">No notes shared yet for this completed session.</p>
        ) : (
          <p className="mt-2 text-sm text-charcoal/60">Notes become available after session completion.</p>
        )}
      </section>

      <section className="rounded-2xl border border-calm-sage/15 bg-white/85 p-5 shadow-soft-sm">
        <h2 className="text-base font-semibold">Prescription</h2>
        {isPsychiatristSession ? (
          <p className="mt-2 text-sm text-charcoal/70">{session.prescription?.message || 'Prescription (if shared) will be available in this section.'}</p>
        ) : (
          <p className="mt-2 text-sm text-charcoal/60">Prescription applies to psychiatrist sessions only.</p>
        )}
      </section>

      <section className="rounded-2xl border border-calm-sage/15 bg-white/85 p-5 shadow-soft-sm">
        <h2 className="text-base font-semibold">Downloads</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!session.documents?.session_pdf_available}
            onClick={onDownloadSessionPdf}
            className="inline-flex min-h-[38px] items-center rounded-full border border-calm-sage/25 px-4 text-sm font-medium text-charcoal/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloading === 'session' ? 'Downloading Session PDF...' : 'Download Session PDF'}
          </button>
          <button
            type="button"
            disabled={!session.documents?.invoice_available}
            onClick={onDownloadInvoicePdf}
            className="inline-flex min-h-[38px] items-center rounded-full border border-calm-sage/25 px-4 text-sm font-medium text-charcoal/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloading === 'invoice' ? 'Downloading Invoice...' : 'Download Invoice'}
          </button>
        </div>
        {session.documents?.invoice_reference ? (
          <p className="mt-2 text-xs text-charcoal/55">Invoice reference: {session.documents.invoice_reference}</p>
        ) : null}
        {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
      </section>
    </div>
  );
}
