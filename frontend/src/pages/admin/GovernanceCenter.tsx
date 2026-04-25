import { useEffect, useMemo, useState } from 'react';
import {
  getAdminComplianceStatus,
  getAdminLegalDocuments,
  getAdminSystemHealth,
  getAdminUserAcceptances,
  getAuditLogs,
  type AdminAuditLog,
  type AdminComplianceStatus,
  type AdminLegalDocument,
  type AdminSystemHealthMetrics,
  type AdminUserAcceptance,
} from '../../api/admin.api';
import AdminPageLayout from '../../components/admin/AdminPageLayout';
import { usePermission } from '../../hooks/usePermission';

const formatDate = (value?: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function GovernanceCenterPage() {
  const { isReady, canPolicy } = usePermission();
  const canViewGovernance = canPolicy('compliance.manage') || canPolicy('audit.view') || canPolicy('analytics.view');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [health, setHealth] = useState<AdminSystemHealthMetrics | null>(null);
  const [compliance, setCompliance] = useState<AdminComplianceStatus | null>(null);
  const [documents, setDocuments] = useState<AdminLegalDocument[]>([]);
  const [acceptances, setAcceptances] = useState<AdminUserAcceptance[]>([]);
  const [configAudit, setConfigAudit] = useState<AdminAuditLog[]>([]);

  const load = async () => {
    if (!isReady || !canViewGovernance) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [healthRes, complianceRes, docsRes, acceptanceRes, auditRes] = await Promise.all([
        getAdminSystemHealth(),
        getAdminComplianceStatus(),
        getAdminLegalDocuments(),
        getAdminUserAcceptances(),
        getAuditLogs({
          page: 1,
          limit: 8,
          action: 'CONFIG_',
        }),
      ]);

      setHealth(healthRes.data);
      setCompliance(complianceRes);
      setDocuments(Array.isArray(docsRes.documents) ? docsRes.documents : []);
      setAcceptances(Array.isArray(acceptanceRes.acceptances) ? acceptanceRes.acceptances : []);
      setConfigAudit(auditRes.data?.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load governance center');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [isReady, canViewGovernance]);

  const legalSummary = useMemo(() => {
    const active = documents.filter((item) => item.status === 'PUBLISHED').length;
    const archived = documents.length - active;
    return { total: documents.length, active, archived };
  }, [documents]);

  return (
    <AdminPageLayout
      title="Governance Center"
      description="Centralized oversight for compliance posture, legal doc lifecycle, system reliability, and critical config changes."
      actions={
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || !canViewGovernance}
          className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      }
    >
      {!isReady ? null : !canViewGovernance ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          You do not have permission to view the governance center.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Compliance</p>
          <p className="mt-2 text-3xl font-bold text-ink-800">{compliance?.compliance_percentage ?? 0}%</p>
          <p className="mt-1 text-sm text-ink-600">{compliance?.pending ?? 0} users pending required acceptance</p>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Legal Docs</p>
          <p className="mt-2 text-3xl font-bold text-ink-800">{legalSummary.active}</p>
          <p className="mt-1 text-sm text-ink-600">active of {legalSummary.total} total documents</p>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">System Health</p>
          <p className={`mt-2 text-3xl font-bold ${health?.overall === 'Critical' ? 'text-red-600' : health?.overall === 'Degraded' ? 'text-amber-600' : 'text-emerald-600'}`}>
            {health?.overall || 'Unknown'}
          </p>
          <p className="mt-1 text-sm text-ink-600">Latency {health?.latencyMs ?? 0}ms</p>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Recent Acceptances</p>
          <p className="mt-2 text-3xl font-bold text-ink-800">{acceptances.length}</p>
          <p className="mt-1 text-sm text-ink-600">latest legal acceptance records</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <h3 className="text-sm font-semibold text-ink-700">Critical Gaps</h3>
          <div className="mt-3 space-y-2 text-sm text-ink-700">
            {(compliance?.critical_gaps || []).length === 0 ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">No critical compliance gaps detected.</p>
            ) : (
              compliance?.critical_gaps.map((gap) => (
                <p key={gap} className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700">{gap}</p>
              ))
            )}
          </div>

          {health?.diagnostics?.warnings?.length ? (
            <div className="mt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Diagnostics</h4>
              <div className="mt-2 space-y-2">
                {health.diagnostics.warnings.map((warning) => (
                  <p key={warning} className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{warning}</p>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <h3 className="text-sm font-semibold text-ink-700">Recent Config Governance Events</h3>
          <div className="mt-3 space-y-2">
            {configAudit.length === 0 ? (
              <p className="rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600">No recent configuration events.</p>
            ) : (
              configAudit.map((item) => (
                <div key={item.id} className="rounded-lg border border-ink-100 px-3 py-2">
                  <p className="text-sm font-semibold text-ink-800">{item.action}</p>
                  <p className="text-xs text-ink-600">{item.actor.name} · {formatDate(item.createdAt)}</p>
                  <p className="mt-1 text-xs text-ink-500">{item.entityType || '-'} · {item.entityId || '-'}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminPageLayout>
  );
}
