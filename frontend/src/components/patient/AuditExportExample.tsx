import { useMemo, useState } from 'react';
import {
  exportPatientData,
  getAuditLogs,
  purgePatient,
  type AuditLogItem,
  type MdcAuditExportApiError,
} from '../../api/mdcAuditExport.api';

const getErrorMessage = (error: unknown): string => {
  const apiError = error as MdcAuditExportApiError;
  return apiError?.message || 'Unable to process audit/export request.';
};

const formatDateTime = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export default function AuditExportExample() {
  const [patientId, setPatientId] = useState('');
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const sortedAuditLogs = useMemo(() => {
    return [...auditLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [auditLogs]);

  const handleLoadAuditLogs = async () => {
    setIsLoadingAudit(true);
    setError(null);
    setStatusMessage(null);

    try {
      const logs = await getAuditLogs();
      setAuditLogs(logs);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const handleExportPatient = async () => {
    if (!patientId.trim()) {
      setError('Patient ID is required for export.');
      return;
    }

    setIsExporting(true);
    setError(null);
    setStatusMessage(null);

    try {
      const result = await exportPatientData(patientId.trim());
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
      }
      setStatusMessage(result.message || 'Patient export started successfully.');
      await handleLoadAuditLogs();
    } catch (exportError) {
      setError(getErrorMessage(exportError));
    } finally {
      setIsExporting(false);
    }
  };

  const handlePurgePatient = async () => {
    if (!patientId.trim()) {
      setError('Patient ID is required for purge.');
      return;
    }

    const confirmed = window.confirm('Are you sure you want to purge this patient data? This action may be irreversible.');
    if (!confirmed) {
      return;
    }

    setIsPurging(true);
    setError(null);
    setStatusMessage(null);

    try {
      const result = await purgePatient(patientId.trim());
      setStatusMessage(result.message || 'Patient data purged successfully.');
      await handleLoadAuditLogs();
    } catch (purgeError) {
      setError(getErrorMessage(purgeError));
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Audit Log and Patient Export</h2>
        <p className="mt-1 text-sm text-slate-500">View audit events and manage patient export/purge operations.</p>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr,auto,auto,auto]">
          <label className="block text-sm font-medium text-slate-700">
            Patient ID
            <input
              value={patientId}
              onChange={(event) => setPatientId(event.target.value)}
              placeholder="Enter patient ID"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void handleExportPatient()}
              disabled={isExporting || isPurging}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isExporting ? 'Exporting...' : 'Export Patient'}
            </button>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void handlePurgePatient()}
              disabled={isPurging || isExporting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPurging ? 'Purging...' : 'Delete Patient'}
            </button>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void handleLoadAuditLogs()}
              disabled={isLoadingAudit}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoadingAudit ? 'Loading...' : 'Load Audit Log'}
            </button>
          </div>
        </div>

        {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {statusMessage && <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{statusMessage}</p>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Audit Log</h3>

        {sortedAuditLogs.length === 0 && !isLoadingAudit ? (
          <p className="mt-3 text-sm text-slate-500">No audit logs available.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Actor</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Entity</th>
                  <th className="px-3 py-2">Entity ID</th>
                </tr>
              </thead>
              <tbody>
                {sortedAuditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-700">{formatDateTime(log.createdAt)}</td>
                    <td className="px-3 py-2 text-slate-700">{log.actor || '-'}</td>
                    <td className="px-3 py-2 text-slate-800">{log.action}</td>
                    <td className="px-3 py-2 text-slate-700">{log.entityType || '-'}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-700">{log.entityId || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
