import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
	getAdminInvoiceDetail,
	getAdminPaymentReliabilityDetail,
	getAdminUserById,
	exportAuditLogs,
	getAuditLogs,
	type AdminAuditLog,
} from '../../api/admin.api';
import AdminPageLayout from '../../components/admin/AdminPageLayout';
import ActionBar from '../../components/admin/ActionBar';
import AdminTable from '../../components/admin/AdminTable';

const DEFAULT_META = {
	page: 1,
	limit: 20,
	totalItems: 0,
	totalPages: 1,
};

const MAX_JSON_PREVIEW = 5000;

const statusClass = (status: string): string => {
	const normalized = String(status || '').toUpperCase();
	if (normalized === 'DENIED') return 'bg-rose-100 text-rose-700';
	if (normalized === 'FAILED') return 'bg-orange-100 text-orange-700';
	return 'bg-emerald-100 text-emerald-700';
};

const formatDateTime = (value?: string | null): string => {
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

const truncate = (value: string, max = 52): string => {
	const text = String(value || '').trim();
	if (!text) return '-';
	if (text.length <= max) return text;
	return `${text.slice(0, max - 3)}...`;
};

const criticalActionClass = (action: string): string => {
	const normalized = String(action || '').toUpperCase();
	if (normalized === 'ACCESS_DENIED') return 'bg-rose-100 text-rose-700';
	if (normalized === 'PAYMENT_RETRY') return 'bg-orange-100 text-orange-700';
	if (normalized === 'USER_SUSPENDED') return 'bg-amber-100 text-amber-700';
	return 'bg-ink-100 text-ink-700';
};

const getJsonPreview = (value: unknown, expanded: boolean): { text: string; truncated: boolean } => {
	const serialized = JSON.stringify(value ?? null, null, 2) || 'null';
	if (expanded || serialized.length <= MAX_JSON_PREVIEW) {
		return { text: serialized, truncated: false };
	}
	return {
		text: `${serialized.slice(0, MAX_JSON_PREVIEW)}\n... (truncated)` ,
		truncated: true,
	};
};

export default function AuditTrailPage() {
	const navigate = useNavigate();
	const [rows, setRows] = useState<AdminAuditLog[]>([]);
	const [meta, setMeta] = useState(DEFAULT_META);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [entityType, setEntityType] = useState('');
	const [action, setAction] = useState('');
	const [policy, setPolicy] = useState('');
	const [actor, setActor] = useState('');
	const [fromDate, setFromDate] = useState('');
	const [toDate, setToDate] = useState('');
	const [deniedOnly, setDeniedOnly] = useState(false);
	const [selected, setSelected] = useState<AdminAuditLog | null>(null);
	const [expandedJson, setExpandedJson] = useState<{ before: boolean; after: boolean; metadata: boolean }>({
		before: false,
		after: false,
		metadata: false,
	});

	const loadAudit = async (page = meta.page): Promise<void> => {
		setLoading(true);
		setError(null);
		try {
			const response = await getAuditLogs({
				page,
				limit: meta.limit,
				entityType: entityType || undefined,
				action: action.trim() || undefined,
				policy: policy.trim() || undefined,
				actor: actor.trim() || undefined,
				from: fromDate || undefined,
				to: toDate || undefined,
				deniedOnly,
			});
			const payload = response?.data;
			setRows(Array.isArray(payload?.data) ? payload.data : []);
			setMeta(payload?.meta || DEFAULT_META);
		} catch (err) {
			setRows([]);
			setMeta(DEFAULT_META);
			setError(err instanceof Error ? err.message : 'Unable to load audit logs.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void loadAudit(1);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const entityOptions = useMemo(() => {
		const set = new Set(rows.map((row) => row.entityType).filter(Boolean));
		return Array.from(set).sort((a, b) => a.localeCompare(b));
	}, [rows]);

	const policyOptions = useMemo(() => {
		const set = new Set(rows.map((row) => row.policy || '').filter(Boolean));
		return Array.from(set).sort((a, b) => a.localeCompare(b));
	}, [rows]);

	const openEntity = async (log: AdminAuditLog): Promise<void> => {
		const entity = String(log.entityType || '').toLowerCase();
		const entityId = String(log.entityId || '').trim();

		if (!entityId) {
			toast.error('Entity id missing for this audit row.');
			return;
		}

		try {
			if (entity === 'user') {
				await getAdminUserById(entityId);
				navigate(`/admin/identity/users/${encodeURIComponent(entityId)}`);
				return;
			}
			if (entity === 'payment') {
				await getAdminPaymentReliabilityDetail(entityId);
				navigate('/admin/billing/payment-reliability');
				return;
			}
			if (entity === 'invoice') {
				await getAdminInvoiceDetail(entityId);
				navigate(`/admin/billing/invoices?invoiceId=${encodeURIComponent(entityId)}`);
				return;
			}

			toast.error('Unsupported entity link type.');
		} catch {
			toast.error('Entity not found or deleted');
		}
	};

	const columns = [
		{
			key: 'time',
			head: 'Time',
			render: (row: AdminAuditLog) => <span className="text-xs text-ink-700">{formatDateTime(row.createdAt)}</span>,
		},
		{
			key: 'actor',
			head: 'Actor',
			render: (row: AdminAuditLog) => (
				<div>
					<p className="text-sm text-ink-800">{row.actor.name}</p>
					<p className="text-xs text-ink-500">{row.actor.email || row.actor.id}</p>
				</div>
			),
		},
		{
			key: 'policy',
			head: 'Policy',
			render: (row: AdminAuditLog) => (
				<span className="inline-flex rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-700">
					{row.policy ? `${row.policy}${row.policyVersion ? ` (v${row.policyVersion})` : ''}` : '-'}
				</span>
			),
		},
		{
			key: 'action',
			head: 'Action',
			render: (row: AdminAuditLog) => (
				<span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${criticalActionClass(row.action)}`}>
					{row.action}
				</span>
			),
		},
		{
			key: 'entity',
			head: 'Entity',
			render: (row: AdminAuditLog) => (
				<div>
					<p className="text-xs font-semibold text-ink-700">{row.entityType}</p>
					<p className="text-xs text-ink-500">{truncate(row.entityId || '-')}</p>
				</div>
			),
		},
		{
			key: 'status',
			head: 'Status',
			render: (row: AdminAuditLog) => (
				<span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(row.status)}`}>
					{row.status}
				</span>
			),
		},
		{
			key: 'actions',
			head: 'Actions',
			render: (row: AdminAuditLog) => (
				<div className="flex gap-2">
					<button
						onClick={() => {
							setSelected(row);
							setExpandedJson({ before: false, after: false, metadata: false });
						}}
						className="rounded-md border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
					>
						View
					</button>
					<button
						onClick={() => {
							void openEntity(row);
						}}
						disabled={!row.entityId}
						className="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50"
					>
						Open Entity
					</button>
				</div>
			),
		},
	];

	const beforePreview = getJsonPreview((selected?.details as any)?.before || (selected?.details as any)?.beforeJson || null, expandedJson.before);
	const afterPreview = getJsonPreview((selected?.details as any)?.after || (selected?.details as any)?.afterJson || null, expandedJson.after);
	const metadataPreview = getJsonPreview(selected?.details || {}, expandedJson.metadata);

	const runExport = async (format: 'csv' | 'json'): Promise<void> => {
		try {
			const blob = await exportAuditLogs({
				format,
				limit: 5000,
				entityType: entityType || undefined,
				action: action.trim() || undefined,
				policy: policy.trim() || undefined,
				actor: actor.trim() || undefined,
				from: fromDate || undefined,
				to: toDate || undefined,
				deniedOnly,
			});

			const url = URL.createObjectURL(blob);
			const stamp = new Date().toISOString().slice(0, 10);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = `audit-logs-${stamp}.${format}`;
			anchor.click();
			URL.revokeObjectURL(url);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Unable to export audit logs');
		}
	};

	return (
		<AdminPageLayout
			title="Audit Logs"
			description="Governance timeline with policy-aware traces, entity linking, and denial visibility."
			actions={
				<>
					<select value={entityType} onChange={(event) => setEntityType(event.target.value)} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2">
						<option value="">All entities</option>
						{entityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
					</select>
					<select value={policy} onChange={(event) => setPolicy(event.target.value)} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2">
						<option value="">All policies</option>
						{policyOptions.map((item) => <option key={item} value={item}>{item}</option>)}
					</select>
					<input value={action} onChange={(event) => setAction(event.target.value)} placeholder="Action" className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2" />
					<input value={actor} onChange={(event) => setActor(event.target.value)} placeholder="Actor" className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2" />
					<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2" />
					<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2" />
					<label className="inline-flex items-center gap-2 rounded-lg border border-ink-100 bg-white px-3 py-2 text-xs font-medium text-ink-700">
						<input type="checkbox" checked={deniedOnly} onChange={(event) => setDeniedOnly(event.target.checked)} />
						ACCESS_DENIED only
					</label>
					<button onClick={() => { void loadAudit(1); }} className="rounded-lg bg-sage-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sage-700">Apply</button>
				</>
			}
		>
			<ActionBar>
				<div className="rounded-md bg-ink-50 px-2 py-1 text-xs text-ink-600">Total: {meta.totalItems}</div>
				<button onClick={() => { void loadAudit(meta.page); toast.success('Audit logs refreshed'); }} className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50">Refresh</button>
				<button onClick={() => { void runExport('csv'); }} className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50">Export CSV</button>
				<button onClick={() => { void runExport('json'); }} className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50">Export JSON</button>
			</ActionBar>

			{error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

			<AdminTable
				columns={columns}
				rows={rows}
				rowKey={(row) => row.id}
				loading={loading}
				loadingText="Loading audit logs..."
				emptyText="No audit logs found for this filter."
			/>

			<div className="mt-2 flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-3 text-sm">
				<p className="text-ink-500">
					Page <span className="font-semibold text-ink-700">{meta.page}</span> of <span className="font-semibold text-ink-700">{meta.totalPages || 1}</span>
				</p>
				<div className="flex gap-2">
					<button disabled={loading || meta.page <= 1} onClick={() => { void loadAudit(meta.page - 1); }} className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50">Previous</button>
					<button disabled={loading || meta.page >= (meta.totalPages || 1)} onClick={() => { void loadAudit(meta.page + 1); }} className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50">Next</button>
				</div>
			</div>

			{selected ? (
				<aside className="fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto border-l border-ink-100 bg-white p-5 shadow-soft-lg">
					<div className="flex items-start justify-between">
						<div>
							<h3 className="font-display text-lg font-bold text-ink-800">Audit Inspector</h3>
							<p className="text-xs text-ink-500">{selected.id}</p>
						</div>
						<button onClick={() => setSelected(null)} className="rounded-md border border-ink-200 px-2 py-1 text-xs text-ink-600 hover:bg-ink-50">Close</button>
					</div>

					<div className="mt-4 space-y-3 text-sm">
						<DetailRow label="Action" value={selected.action} />
						<DetailRow label="Policy" value={selected.policy ? `${selected.policy}${selected.policyVersion ? ` (v${selected.policyVersion})` : ''}` : '-'} />
						<DetailRow label="Actor" value={`${selected.actor.name} (${selected.actor.id})`} />
						<DetailRow label="Entity" value={`${selected.entityType}${selected.entityId ? ` (${selected.entityId})` : ''}`} />
						<DetailRow label="Status" value={selected.status} />
						<DetailRow label="Time" value={formatDateTime(selected.createdAt)} />
					</div>

					<div className="mt-4 rounded-lg border border-ink-100 p-3">
						<p className="text-xs font-semibold text-ink-600">Before</p>
						<pre className="mt-2 max-h-52 overflow-auto rounded bg-ink-50 p-2 text-[11px] text-ink-700">{beforePreview.text}</pre>
						{beforePreview.truncated ? (
							<button
								onClick={() => setExpandedJson((prev) => ({ ...prev, before: true }))}
								className="mt-2 rounded-md border border-ink-200 px-2 py-1 text-[11px] font-medium text-ink-700 hover:bg-ink-50"
							>
								Show more
							</button>
						) : null}
					</div>

					<div className="mt-4 rounded-lg border border-ink-100 p-3">
						<p className="text-xs font-semibold text-ink-600">After</p>
						<pre className="mt-2 max-h-52 overflow-auto rounded bg-ink-50 p-2 text-[11px] text-ink-700">{afterPreview.text}</pre>
						{afterPreview.truncated ? (
							<button
								onClick={() => setExpandedJson((prev) => ({ ...prev, after: true }))}
								className="mt-2 rounded-md border border-ink-200 px-2 py-1 text-[11px] font-medium text-ink-700 hover:bg-ink-50"
							>
								Show more
							</button>
						) : null}
					</div>

					<div className="mt-4 rounded-lg border border-ink-100 p-3">
						<p className="text-xs font-semibold text-ink-600">Metadata</p>
						<pre className="mt-2 max-h-64 overflow-auto rounded bg-ink-50 p-2 text-[11px] text-ink-700">{metadataPreview.text}</pre>
						{metadataPreview.truncated ? (
							<button
								onClick={() => setExpandedJson((prev) => ({ ...prev, metadata: true }))}
								className="mt-2 rounded-md border border-ink-200 px-2 py-1 text-[11px] font-medium text-ink-700 hover:bg-ink-50"
							>
								Show more
							</button>
						) : null}
					</div>
				</aside>
			) : null}
		</AdminPageLayout>
	);
}

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="grid grid-cols-[100px_1fr] gap-2 rounded-md bg-ink-50 px-3 py-2 text-xs">
			<p className="font-semibold text-ink-600">{label}</p>
			<p className="break-all text-ink-800">{value || '-'}</p>
		</div>
	);
}
