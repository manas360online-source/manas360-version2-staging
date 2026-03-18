import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, Share2, RefreshCw } from 'lucide-react';
import { psychologistApi, type PsychologistPatientReportCloneItem, type PsychologistReportItem } from '../../api/psychologist.api';
import TherapistButton from '../therapist/dashboard/TherapistButton';

type Props = {
  reports: PsychologistReportItem[];
  clones: PsychologistPatientReportCloneItem[];
  onReload: () => Promise<void>;
};

const buildShareUrl = (pathValue: string): string => {
  const origin = window?.location?.origin || '';
  if (!pathValue) return origin;
  if (pathValue.startsWith('http://') || pathValue.startsWith('https://')) return pathValue;
  return `${origin}${pathValue}`;
};

export default function ProviderReportEditor({ reports, clones, onReload }: Props) {
  const [busyReportId, setBusyReportId] = useState<string | null>(null);
  const [busyCloneId, setBusyCloneId] = useState<string | null>(null);

  const cloneMap = useMemo(() => {
    const map = new Map<string, PsychologistPatientReportCloneItem>();
    for (const clone of clones) {
      if (!clone.source_report_id) continue;
      if (!map.has(clone.source_report_id)) {
        map.set(clone.source_report_id, clone);
      }
    }
    return map;
  }, [clones]);

  const handleClone = async (reportId: string) => {
    setBusyReportId(reportId);
    try {
      await psychologistApi.cloneReportForPatient(reportId);
      toast.success('Patient-facing copy created');
      await onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clone report');
    } finally {
      setBusyReportId(null);
    }
  };

  const handleShare = async (cloneId: string) => {
    setBusyCloneId(cloneId);
    try {
      const shared = await psychologistApi.sharePatientReportClone(cloneId);
      const link = buildShareUrl(shared.sharePath);
      await navigator.clipboard.writeText(link).catch(() => undefined);
      toast.success('Shared link copied to clipboard (24h valid)');
      await onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to share report');
    } finally {
      setBusyCloneId(null);
    }
  };

  const handleCopyExistingLink = async (cloneId: string) => {
    const link = buildShareUrl(`/patient/reports/shared/${encodeURIComponent(cloneId)}`);
    await navigator.clipboard.writeText(link).catch(() => undefined);
    toast.success('Download link copied');
  };

  return (
    <div className="mt-6 rounded-xl border border-ink-100 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-display text-sm font-bold text-ink-800">Patient Report Sharing (24h expiry)</h4>
        <TherapistButton variant="secondary" onClick={() => void onReload()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </TherapistButton>
      </div>

      <div className="space-y-2">
        {reports.map((report) => {
          const clone = cloneMap.get(report.id);
          const isShared = String(clone?.status || '').toLowerCase() === 'shared';
          return (
            <div key={report.id} className="rounded-lg border border-ink-100 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ink-800">{report.title || 'Report'}</p>
                  <p className="text-xs text-ink-500">
                    {clone
                      ? `Clone: ${clone.id.slice(0, 8)}... • ${clone.status || 'draft'}`
                      : 'No patient-facing copy yet'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!clone ? (
                    <TherapistButton
                      variant="secondary"
                      disabled={busyReportId === report.id}
                      onClick={() => void handleClone(report.id)}
                    >
                      {busyReportId === report.id ? 'Cloning...' : 'Create Patient Copy'}
                    </TherapistButton>
                  ) : null}

                  {clone && !isShared ? (
                    <TherapistButton
                      variant="primary"
                      disabled={busyCloneId === clone.id}
                      onClick={() => void handleShare(clone.id)}
                    >
                      <Share2 className="h-4 w-4" />
                      {busyCloneId === clone.id ? 'Sharing...' : 'Share For 24h'}
                    </TherapistButton>
                  ) : null}

                  {clone && isShared ? (
                    <TherapistButton variant="secondary" onClick={() => void handleCopyExistingLink(clone.id)}>
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </TherapistButton>
                  ) : null}
                </div>
              </div>
              {clone?.expires_at ? (
                <p className="mt-1 text-xs text-amber-700">Expires: {new Date(clone.expires_at).toLocaleString()}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
