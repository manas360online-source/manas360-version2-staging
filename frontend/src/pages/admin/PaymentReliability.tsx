import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
	getAdminPaymentReliabilityDetail,
	getAdminPaymentReliabilityMetrics,
	listAdminPaymentReliability,
	retryAdminPaymentReliability,
	type AdminPaymentReliabilityDetail,
	type AdminPaymentReliabilityMetrics,
	type AdminPaymentReliabilityRiskLevel,
	type AdminPaymentReliabilityRow,
	type AdminPaymentReliabilityStatus,
} from '../../api/admin.api';
import ActionBar from '../../components/admin/ActionBar';
import AdminPageLayout from '../../components/admin/AdminPageLayout';
import AdminTable from '../../components/admin/AdminTable';
import { usePermission } from '../../hooks/usePermission';

const DEFAULT_META = {
	page: 1,
	limit: 20,
	totalItems: 0,
	totalPages: 1,
};

const statusClass: Record<AdminPaymentReliabilityStatus, string> = {
	SUCCESS: 'bg-emerald-100 text-emerald-700',
	FAILED: 'bg-rose-100 text-rose-700',
	PENDING: 'bg-amber-100 text-amber-700',
};

const riskClass: Record<AdminPaymentReliabilityRiskLevel, string> = {
	HIGH: 'bg-rose-100 text-rose-700',
	MEDIUM: 'bg-orange-100 text-orange-700',
	LOW: 'bg-sky-100 text-sky-700',
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

const formatMinor = (minor: number): string => `INR ${(Number(minor || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const truncate = (value?: string | null, max = 48): string => {
	const text = String(value || '').trim();
	if (!text) return '-';
	if (text.length <= max) return text;
	return `${text.slice(0, max - 3)}...`;
};

const failureCategoryOf = (reason?: string | null): 'DECLINED' | 'NETWORK' | 'TIMEOUT' | 'USER_ABORTED' | 'UNKNOWN' => {
	const text = String(reason || '').toLowerCase();
	if (!text) return 'UNKNOWN';
	if (text.includes('declin') || text.includes('insufficient') || text.includes('bank') || text.includes('upi')) return 'DECLINED';
	if (text.includes('timeout') || text.includes('timed out')) return 'TIMEOUT';
	if (text.includes('abort') || text.includes('cancel') || text.includes('closed')) return 'USER_ABORTED';
	if (text.includes('network') || text.includes('dns') || text.includes('connection')) return 'NETWORK';
	return 'UNKNOWN';
};

const failureCategoryClass: Record<'DECLINED' | 'NETWORK' | 'TIMEOUT' | 'USER_ABORTED' | 'UNKNOWN', string> = {
	DECLINED: 'bg-rose-100 text-rose-700',
	NETWORK: 'bg-amber-100 text-amber-700',
	TIMEOUT: 'bg-orange-100 text-orange-700',
	USER_ABORTED: 'bg-slate-100 text-slate-700',
	UNKNOWN: 'bg-ink-100 text-ink-700',
};

function MetricCard({ label, value, note }: { label: string; value: string; note?: string }) {
	return (
		<div className="rounded-xl border border-ink-100 bg-white p-4">
			<p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{label}</p>
			<p className="mt-1 font-display text-2xl font-bold text-ink-900">{value}</p>
			{note ? <p className="mt-1 text-xs text-ink-500">{note}</p> : null}
		</div>
	);
}

export default function AdminPaymentReliabilityPage() {
	const navigate = useNavigate();
	const { canPolicy, isReady } = usePermission();
	const canManagePayments = canPolicy('payments.retry');
	const [rows, setRows] = useState<AdminPaymentReliabilityRow[]>([]);
	const [meta, setMeta] = useState(DEFAULT_META);
	const [metrics, setMetrics] = useState<AdminPaymentReliabilityMetrics | null>(null);
	const [loading, setLoading] = useState(false);
	const [metricsLoading, setMetricsLoading] = useState(false);
	const [working, setWorking] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [status, setStatus] = useState<'' | AdminPaymentReliabilityStatus>('');
	const [riskLevel, setRiskLevel] = useState<'' | AdminPaymentReliabilityRiskLevel>('');
	const [provider] = useState<'PHONEPE'>('PHONEPE');
	const [fromDate, setFromDate] = useState('');
	const [toDate, setToDate] = useState('');
	const [sortBy, setSortBy] = useState<'createdAt' | 'amountMinor' | 'retryCount'>('createdAt');
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
	const [selectedDetail, setSelectedDetail] = useState<AdminPaymentReliabilityDetail | null>(null);
	const [detailLoading, setDetailLoading] = useState(false);
	const [retryingId, setRetryingId] = useState<string | null>(null);
	const [autoRefresh, setAutoRefresh] = useState(false);

	const loadMetrics = async (): Promise<void> => {
		setMetricsLoading(true);
		try {
			const response = await getAdminPaymentReliabilityMetrics({
				provider,
				from: fromDate || undefined,
				to: toDate || undefined,
			});
			setMetrics(response.data);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to load reliability metrics');
		} finally {
			setMetricsLoading(false);
		}
	};

	const loadRows = async (page = meta.page): Promise<void> => {
		setLoading(true);
		setError(null);
		try {
			const response = await listAdminPaymentReliability({
				page,
				limit: meta.limit,
				status: status || undefined,
				riskLevel: riskLevel || undefined,
				provider,
				from: fromDate || undefined,
				to: toDate || undefined,
				sortBy,
				sortOrder,
			});
			setRows(response.data.data);
			setMeta(response.data.meta);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to load payment reliability list');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void Promise.all([loadRows(1), loadMetrics()]);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sortBy, sortOrder]);

	useEffect(() => {
		if (!autoRefresh) return;
		const interval = window.setInterval(() => {
			void Promise.all([loadRows(meta.page), loadMetrics()]);
		}, 30_000);
		return () => window.clearInterval(interval);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [autoRefresh, meta.page, sortBy, sortOrder, status, riskLevel, fromDate, toDate]);

	const openDetail = async (paymentId: string): Promise<void> => {
		setDetailLoading(true);
		setSelectedDetail(null);
		try {
			const response = await getAdminPaymentReliabilityDetail(paymentId);
			setSelectedDetail(response.data);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Unable to load payment detail');
		} finally {
			setDetailLoading(false);
		}
	};

	const runRetry = async (payment: AdminPaymentReliabilityRow): Promise<void> => {
		if (!canManagePayments) {
			toast.error('You do not have permission to retry payments.');
			return;
		}
		setRetryingId(payment.id);
		setWorking(true);
		try {
			const response = await retryAdminPaymentReliability(payment.id);
			const result = response.data?.data;
			toast.success(result ? `Retry queued (count: ${result.retryCount})` : 'Retry queued successfully');
			await Promise.all([loadRows(meta.page), loadMetrics()]);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Retry failed';
			if (message.toLowerCase().includes('cooldown')) {
				toast.error(message);
			} else {
				toast.error(message);
			}
		} finally {
			setRetryingId(null);
			setWorking(false);
		}
	};

	const columns = useMemo(() => [
		{
			key: 'paymentId',
			head: 'Payment ID',
			render: (row: AdminPaymentReliabilityRow) => (
				<div>
					<p className="text-sm font-semibold text-ink-800">{row.id.slice(0, 8)}...</p>
					<p className="text-xs text-ink-500">{row.merchantTransactionId || '-'}</p>
				</div>
			),
		},
		{
			key: 'user',
			head: 'User',
			render: (row: AdminPaymentReliabilityRow) => (
				<div>
					<p className="text-sm text-ink-700">{row.user.name || 'Unknown'}</p>
					<p className="text-xs text-ink-500">{row.user.email || '-'}</p>
				</div>
			),
		},
		{
			key: 'amount',
			head: 'Amount',
			sortable: true,
			sortKey: 'amountMinor',
			render: (row: AdminPaymentReliabilityRow) => <span className="text-sm font-semibold text-ink-800">{formatMinor(row.amountMinor)}</span>,
		},
		{
			key: 'status',
			head: 'Status',
			render: (row: AdminPaymentReliabilityRow) => (
				<span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[row.status]}`}>
					{row.status}
				</span>
			),
		},
		{
			key: 'risk',
			head: 'Risk',
			render: (row: AdminPaymentReliabilityRow) => (
				<span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${riskClass[row.riskLevel]}`}>
					{row.riskLevel}
				</span>
			),
		},
		{
			key: 'retry',
			head: 'Retry Count',
			sortable: true,
			sortKey: 'retryCount',
			render: (row: AdminPaymentReliabilityRow) => <span className="text-xs text-ink-700">{row.retryCount}</span>,
		},
		{
			key: 'failureCategory',
			head: 'Failure Type',
			render: (row: AdminPaymentReliabilityRow) => {
				const category = failureCategoryOf(row.failureReason);
				return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${failureCategoryClass[category]}`}>{category}</span>;
			},
		},
		{
			key: 'reason',
			head: 'Failure Reason',
			render: (row: AdminPaymentReliabilityRow) => <span className="text-xs text-ink-600" title={row.failureReason || ''}>{truncate(row.failureReason)}</span>,
		},
		{
			key: 'createdAt',
			head: 'Created',
			sortable: true,
			sortKey: 'createdAt',
			render: (row: AdminPaymentReliabilityRow) => <span className="text-xs text-ink-600">{formatDateTime(row.createdAt)}</span>,
		},
		{
			key: 'actions',
			head: 'Actions',
			render: (row: AdminPaymentReliabilityRow) => (
				<div className="flex flex-wrap gap-2">
					<button onClick={() => { void openDetail(row.id); }} className="rounded-md border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50">View</button>
					<button
						disabled={!canManagePayments || working || retryingId === row.id || !['FAILED', 'PENDING'].includes(row.status)}
						title={!canManagePayments ? "You don't have permission" : undefined}
						onClick={() => { void runRetry(row); }}
						className="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50"
					>
						{retryingId === row.id ? 'Retrying...' : 'Retry'}
					</button>
				</div>
			),
		},
	], [canManagePayments, retryingId, working]);

	const handleSortChange = (nextSortKey: string): void => {
		const casted = nextSortKey as 'createdAt' | 'amountMinor' | 'retryCount';
		if (casted === sortBy) {
			setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
			return;
		}
		setSortBy(casted);
		setSortOrder('asc');
	};

	if (!isReady) {
		return null;
	}

	return (
		<AdminPageLayout
			title="Payment Reliability"
			description="Revenue-protection control plane for payment failures, retries, and recovery signals."
			actions={
				<>
					<select value={status} onChange={(event) => setStatus(event.target.value as '' | AdminPaymentReliabilityStatus)} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2">
						<option value="">All statuses</option>
						<option value="SUCCESS">SUCCESS</option>
						<option value="FAILED">FAILED</option>
						<option value="PENDING">PENDING</option>
					</select>
					<select value={riskLevel} onChange={(event) => setRiskLevel(event.target.value as '' | AdminPaymentReliabilityRiskLevel)} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2">
						<option value="">All risks</option>
						<option value="HIGH">HIGH</option>
						<option value="MEDIUM">MEDIUM</option>
						<option value="LOW">LOW</option>
					</select>
					<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2" />
					<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2" />
					<button
						onClick={() => { void Promise.all([loadRows(1), loadMetrics()]); }}
						className="rounded-lg bg-sage-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sage-700"
					>
						Apply
					</button>
				</>
			}
		>
			<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
				<MetricCard label="Success Rate" value={metricsLoading ? '...' : `${(metrics?.successRate || 0).toFixed(2)}%`} />
				<MetricCard label="Failed Payments" value={metricsLoading ? '...' : String(metrics?.failedCount || 0)} />
				<MetricCard label="Retry Success Rate" value={metricsLoading ? '...' : `${(metrics?.retrySuccessRate || 0).toFixed(2)}%`} />
				<MetricCard label="Recovered Revenue" value={metricsLoading ? '...' : formatMinor(metrics?.recoveredRevenueMinor || 0)} note="Recovered via successful retries" />
			</div>

			<ActionBar>
				<div className="rounded-md bg-ink-50 px-2 py-1 text-xs text-ink-600">Total: {meta.totalItems}</div>
				<div className="rounded-md bg-ink-50 px-2 py-1 text-xs text-ink-600">Provider: {provider}</div>
				<label className="inline-flex items-center gap-2 rounded-md border border-ink-200 bg-white px-2 py-1 text-xs text-ink-700">
					<input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} />
					Auto-refresh (30s)
				</label>
			</ActionBar>

			{error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

			<AdminTable
				columns={columns}
				rows={rows}
				rowKey={(row) => row.id}
				loading={loading}
				loadingText="Loading reliability payments..."
				emptyText="No payments found for this filter."
				sortBy={sortBy}
				sortOrder={sortOrder}
				onSortChange={handleSortChange}
			/>

			<div className="mt-2 flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-3 text-sm">
				<p className="text-ink-500">
					Page <span className="font-semibold text-ink-700">{meta.page}</span> of <span className="font-semibold text-ink-700">{meta.totalPages || 1}</span>
				</p>
				<div className="flex gap-2">
					<button disabled={loading || meta.page <= 1} onClick={() => { void loadRows(meta.page - 1); }} className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50">Previous</button>
					<button disabled={loading || meta.page >= (meta.totalPages || 1)} onClick={() => { void loadRows(meta.page + 1); }} className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50">Next</button>
				</div>
			</div>

			{detailLoading ? <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 text-sm text-white">Loading payment details...</div> : null}

			{selectedDetail ? (
				<aside className="fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto border-l border-ink-100 bg-white p-5 shadow-soft-lg">
					<div className="flex items-start justify-between">
						<div>
							<h3 className="font-display text-lg font-bold text-ink-800">Payment Inspector</h3>
							<p className="text-xs text-ink-500">{selectedDetail.payment.id}</p>
						</div>
						<button onClick={() => setSelectedDetail(null)} className="rounded-md border border-ink-200 px-2 py-1 text-xs text-ink-600 hover:bg-ink-50">Close</button>
					</div>

					<div className="mt-4 space-y-3 text-sm">
						<DetailRow label="Amount" value={formatMinor(selectedDetail.payment.amountMinor)} />
						<DetailRow label="Status" value={selectedDetail.payment.status} />
						<DetailRow label="Risk" value={selectedDetail.payment.riskLevel} />
						<DetailRow label="Retry Count" value={String(selectedDetail.payment.retryCount)} />
						<DetailRow label="Failure Reason" value={selectedDetail.failureReason || '-'} />
						<DetailRow label="Created" value={formatDateTime(selectedDetail.payment.createdAt)} />
					</div>

					<div className="mt-4 rounded-lg border border-ink-100 p-3">
						<p className="text-xs font-semibold text-ink-600">Invoice Link</p>
						{selectedDetail.invoice ? (
							<div className="mt-2 space-y-1 text-xs text-ink-700">
								<p>#{selectedDetail.invoice.invoiceNumber}</p>
								<p>Lifecycle: {selectedDetail.invoice.lifecycleStatus}</p>
								<p>Amount: {formatMinor(selectedDetail.invoice.amountMinor)}</p>
								<button
									onClick={() => navigate(`/admin/billing/invoices?invoiceId=${encodeURIComponent(selectedDetail.invoice!.id)}`)}
									className="mt-1 rounded-md border border-ink-200 px-2 py-1 text-[11px] font-medium text-ink-700 hover:bg-ink-50"
								>
									Open Invoice Console
								</button>
							</div>
						) : <p className="mt-2 text-xs text-ink-500">No invoice linked.</p>}
					</div>

					<div className="mt-4 rounded-lg border border-ink-100 p-3">
						<p className="text-xs font-semibold text-ink-600">Retry Timeline</p>
						<div className="mt-2 space-y-2">
							{selectedDetail.retries.length === 0 ? <p className="text-xs text-ink-500">No retries recorded.</p> : selectedDetail.retries.map((retry) => (
								<div key={retry.id} className="rounded-md bg-ink-50 px-2 py-2 text-xs text-ink-700">
									<p className="font-semibold">{retry.actorType}</p>
									<p>Retry Count: {retry.retryCount}</p>
									<p>{formatDateTime(retry.createdAt)}</p>
								</div>
							))}
						</div>
					</div>

					<div className="mt-4 rounded-lg border border-ink-100 p-3">
						<p className="text-xs font-semibold text-ink-600">Gateway Response</p>
						<pre className="mt-2 max-h-56 overflow-auto rounded bg-ink-50 p-2 text-[11px] text-ink-700">{JSON.stringify(selectedDetail.gatewayResponse || {}, null, 2)}</pre>
					</div>

					<div className="mt-4 rounded-lg border border-ink-100 p-3">
						<p className="text-xs font-semibold text-ink-600">Audit Logs</p>
						<div className="mt-2 space-y-2">
							{selectedDetail.auditLogs.map((log) => (
								<div key={log.id} className="rounded-md bg-ink-50 px-2 py-2 text-xs text-ink-700">
									<p className="font-semibold">{log.action}</p>
									<p>{formatDateTime(log.createdAt)}</p>
								</div>
							))}
						</div>
					</div>
				</aside>
			) : null}
		</AdminPageLayout>
	);
}

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="grid grid-cols-[110px_1fr] gap-2 rounded-md bg-ink-50 px-3 py-2 text-xs">
			<p className="font-semibold text-ink-600">{label}</p>
			<p className="break-all text-ink-800">{value || '-'}</p>
		</div>
	);
}
