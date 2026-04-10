import { useEffect, useMemo, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
	getAdminPayoutDetail,
	getAdminPayoutMetrics,
	listAdminPayouts,
	processAdminPayout,
	retryAdminPayout,
	type AdminPayout,
	type AdminPayoutDetail,
	type AdminPayoutMetrics,
	type AdminPayoutStatus,
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

const statusClass: Record<AdminPayoutStatus, string> = {
	PENDING: 'bg-amber-100 text-amber-700',
	PROCESSING: 'bg-purple-100 text-purple-700',
	COMPLETED: 'bg-emerald-100 text-emerald-700',
	FAILED: 'bg-rose-100 text-rose-700',
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

const formatMinor = (minor: string | number): string => {
	const amount = Number(minor || 0) / 100;
	return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const truncate = (value?: string | null, max = 48): string => {
	if (!value) return '-';
	return value.length > max ? `${value.slice(0, max)}...` : value;
};

export default function AdminPayoutsPage() {
	const navigate = useNavigate();
	const { canPolicy, isReady } = usePermission();
	const canView = canPolicy('payouts.view');
	const canManage = canPolicy('payouts.manage');

	const [rows, setRows] = useState<AdminPayout[]>([]);
	const [meta, setMeta] = useState(DEFAULT_META);
	const [metrics, setMetrics] = useState<AdminPayoutMetrics | null>(null);
	const [loading, setLoading] = useState(false);
	const [metricsLoading, setMetricsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [status, setStatus] = useState<'' | AdminPayoutStatus>('');
	const [fromDate, setFromDate] = useState('');
	const [toDate, setToDate] = useState('');
	const [sortBy, setSortBy] = useState<'createdAt' | 'amountMinor'>('createdAt');
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
	const [selectedDetail, setSelectedDetail] = useState<AdminPayoutDetail | null>(null);
	const [detailLoading, setDetailLoading] = useState(false);
	const [processingId, setProcessingId] = useState<string | null>(null);
	const [retryingId, setRetryingId] = useState<string | null>(null);
	const lastRetryBlockMs = useRef<Record<string, number>>({});

	const loadMetrics = async (): Promise<void> => {
		if (!isReady || !canView) {
			setMetrics(null);
			return;
		}
		setMetricsLoading(true);
		try {
			const response = await getAdminPayoutMetrics();
			setMetrics(response.data);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to load payout metrics');
		} finally {
			setMetricsLoading(false);
		}
	};

	const loadRows = async (page = meta.page): Promise<void> => {
		if (!isReady || !canView) {
			setRows([]);
			setMeta(DEFAULT_META);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const response = await listAdminPayouts({
				page,
				limit: meta.limit,
				status: status || undefined,
				from: fromDate || undefined,
				to: toDate || undefined,
				sortBy,
				sortOrder,
			});
			setRows(response.data.items);
			setMeta({
				page: response.data.page,
				limit: response.data.limit,
				totalItems: response.data.total,
				totalPages: Math.ceil(response.data.total / response.data.limit),
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to load payouts');
		} finally {
			setLoading(false);
		}
	};

	const openDetail = async (payoutId: string): Promise<void> => {
		setDetailLoading(true);
		try {
			const response = await getAdminPayoutDetail(payoutId);
			setSelectedDetail(response.data);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to load payout details');
			setDetailLoading(false);
		} finally {
			setDetailLoading(false);
		}
	};

	const runProcess = async (payout: AdminPayout): Promise<void> => {
		if (payout.status !== 'PENDING') {
			toast.error('Only PENDING payouts can be processed');
			return;
		}
		setProcessingId(payout.id);
		try {
			await processAdminPayout(payout.id);
			toast.success('Payout processing started');
			await Promise.all([loadRows(meta.page), loadMetrics()]);
			if (selectedDetail?.payout.id === payout.id) {
				await openDetail(payout.id);
			}
		} catch (err: any) {
			const msg = err?.response?.data?.message || (err instanceof Error ? err.message : 'Failed to process payout');
			if (msg.includes('409')) {
				toast.error('Conflict: payout state changed');
			} else if (msg.includes('400')) {
				toast.error(msg);
			} else {
				toast.error(msg);
			}
		} finally {
			setProcessingId(null);
		}
	};

	const runRetry = async (payout: AdminPayout): Promise<void> => {
		if (payout.status !== 'FAILED') {
			toast.error('Only FAILED payouts can be retried');
			return;
		}

		// Check 60s cooldown
		const lastRetry = lastRetryBlockMs.current[payout.id] || 0;
		const now = Date.now();
		const timeSinceLastRetry = now - lastRetry;
		if (timeSinceLastRetry < 60_000) {
			const waitSeconds = Math.ceil((60_000 - timeSinceLastRetry) / 1000);
			toast.error(`Please wait ${waitSeconds}s before retrying`);
			return;
		}

		setRetryingId(payout.id);
		try {
			await retryAdminPayout(payout.id);
			lastRetryBlockMs.current[payout.id] = now;
			toast.success('Payout retry scheduled');
			await Promise.all([loadRows(meta.page), loadMetrics()]);
			if (selectedDetail?.payout.id === payout.id) {
				await openDetail(payout.id);
			}
		} catch (err: any) {
			const msg = err?.response?.data?.message || (err instanceof Error ? err.message : 'Failed to retry payout');
			if (msg.includes('429')) {
				toast.error('Cooldown active: retry in 60 seconds');
			} else if (msg.includes('400')) {
				toast.error(msg);
			} else {
				toast.error(msg);
			}
		} finally {
			setRetryingId(null);
		}
	};

	const handleSortChange = (nextSortKey: string): void => {
		const casted = nextSortKey as 'createdAt' | 'amountMinor';
		if (casted === sortBy) {
			setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
			return;
		}
		setSortBy(casted);
		setSortOrder('asc');
	};

	useEffect(() => {
		if (!isReady || !canView) {
			return;
		}
		void Promise.all([loadRows(1), loadMetrics()]);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isReady, canView, sortBy, sortOrder]);

	const columns = useMemo(() => [
		{
			key: 'id',
			head: 'Payout ID',
			render: (row: AdminPayout) => (
				<button onClick={() => { void openDetail(row.id); }} className="text-sm font-semibold text-sage-600 hover:underline">
					{row.id.slice(0, 8)}...
				</button>
			),
		},
		{
			key: 'provider',
			head: 'Provider',
			render: (row: AdminPayout) => (
				<div>
					<p className="text-sm text-ink-700">{row.providerId.slice(0, 16)}...</p>
				</div>
			),
		},
		{
			key: 'amount',
			head: 'Amount',
			sortable: true,
			sortKey: 'amountMinor',
			render: (row: AdminPayout) => <span className="text-sm font-semibold text-ink-800">{formatMinor(row.amountMinor)}</span>,
		},
		{
			key: 'status',
			head: 'Status',
			render: (row: AdminPayout) => <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[row.status]}`}>{row.status}</span>,
		},
		{
			key: 'createdAt',
			head: 'Created',
			sortable: true,
			sortKey: 'createdAt',
			render: (row: AdminPayout) => <span className="text-xs text-ink-600">{formatDateTime(row.createdAt)}</span>,
		},
		{
			key: 'actions',
			head: 'Actions',
			render: (row: AdminPayout) => (
				<div className="flex flex-wrap gap-2">
					<button
						onClick={() => { void openDetail(row.id); }}
						className="rounded-md border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
					>
						View
					</button>
					<button
						disabled={!canManage || processingId === row.id || row.status !== 'PENDING'}
						title={!canManage ? "You don't have permission" : row.status !== 'PENDING' ? 'Only PENDING payouts can be processed' : ''}
						onClick={() => { void runProcess(row); }}
						className="rounded-md border border-sage-200 bg-sage-50 px-2.5 py-1.5 text-xs font-medium text-sage-700 hover:bg-sage-100 disabled:opacity-50"
					>
						{processingId === row.id ? 'Processing...' : 'Process'}
					</button>
					<button
						disabled={!canManage || retryingId === row.id || row.status !== 'FAILED'}
						title={!canManage ? "You don't have permission" : row.status !== 'FAILED' ? 'Only FAILED payouts can be retried' : ''}
						onClick={() => { void runRetry(row); }}
						className="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50"
					>
						{retryingId === row.id ? 'Retrying...' : 'Retry'}
					</button>
				</div>
			),
		},
	], [canManage, processingId, retryingId]);

	if (!isReady) {
		return null;
	}

	if (!canView) {
		return (
			<AdminPageLayout title="Payouts" description="Access denied">
				<div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					You don't have permission to view payouts.
				</div>
			</AdminPageLayout>
		);
	}

	return (
		<AdminPageLayout
			title="Payouts & Commissions"
			description="Provider payout management and financial disbursement control."
			actions={
				<>
					<div className="rounded-md bg-ink-50 px-2 py-1 text-xs text-ink-600">Total: {meta.totalItems}</div>
				</>
			}
		>
			{error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

			<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
				<MetricCard
					label="Pending"
					value={metricsLoading ? '...' : String(metrics?.pending.count || 0)}
					subvalue={metricsLoading ? '...' : formatMinor(metrics?.pending.totalAmountMinor || '0')}
				/>
				<MetricCard
					label="Completed"
					value={metricsLoading ? '...' : String(metrics?.completed.count || 0)}
					subvalue={metricsLoading ? '...' : formatMinor(metrics?.completed.totalAmountMinor || '0')}
				/>
				<MetricCard
					label="Failed"
					value={metricsLoading ? '...' : String(metrics?.failed.count || 0)}
					subvalue={metricsLoading ? '...' : formatMinor(metrics?.failed.totalAmountMinor || '0')}
				/>
				<MetricCard
					label="Total Volume"
					value={metricsLoading ? '...' : formatMinor(metrics?.totalVolume || '0')}
				/>
			</div>

			<ActionBar>
				<select value={status} onChange={(event) => setStatus(event.target.value as '' | AdminPayoutStatus)} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2">
					<option value="">All statuses</option>
					<option value="PENDING">PENDING</option>
					<option value="PROCESSING">PROCESSING</option>
					<option value="COMPLETED">COMPLETED</option>
					<option value="FAILED">FAILED</option>
				</select>
				<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2" placeholder="From" />
				<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2" placeholder="To" />
				<button
					onClick={() => { void Promise.all([loadRows(1), loadMetrics()]); }}
					className="rounded-lg bg-sage-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sage-700"
				>
					Apply
				</button>
			</ActionBar>

			<AdminTable
				columns={columns}
				rows={rows}
				rowKey={(row) => row.id}
				loading={loading}
				loadingText="Loading payouts..."
				emptyText="No payouts found."
				sortBy={sortBy}
				sortOrder={sortOrder}
				onSortChange={handleSortChange}
			/>

			<div className="mt-2 flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-3 text-sm">
				<p className="text-ink-500">
					Page <span className="font-semibold text-ink-700">{meta.page}</span> of <span className="font-semibold text-ink-700">{meta.totalPages || 1}</span>
				</p>
				<div className="flex gap-2">
					<button
						disabled={loading || meta.page <= 1}
						onClick={() => { void loadRows(meta.page - 1); }}
						className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50"
					>
						Previous
					</button>
					<button
						disabled={loading || meta.page >= (meta.totalPages || 1)}
						onClick={() => { void loadRows(meta.page + 1); }}
						className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50"
					>
						Next
					</button>
				</div>
			</div>

			{detailLoading ? <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 text-sm text-white">Loading payout details...</div> : null}

			{selectedDetail ? (
				<aside className="fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto border-l border-ink-100 bg-white p-5 shadow-soft-lg">
					<div className="flex items-start justify-between">
						<div>
							<h3 className="font-display text-lg font-bold text-ink-800">Payout Inspector</h3>
							<p className="text-xs text-ink-500">{selectedDetail.payout.id}</p>
						</div>
						<button onClick={() => setSelectedDetail(null)} className="rounded-md border border-ink-200 px-2 py-1 text-xs text-ink-600 hover:bg-ink-50">
							Close
						</button>
					</div>

					<div className="mt-4 space-y-3 text-sm">
						<DetailRow label="Status" value={selectedDetail.payout.status} />
						<DetailRow label="Provider ID" value={selectedDetail.payout.providerId} />
						<DetailRow label="Amount" value={formatMinor(selectedDetail.payout.amountMinor)} />
						<DetailRow label="Method" value={selectedDetail.payout.method} />
						<DetailRow label="Created" value={formatDateTime(selectedDetail.payout.createdAt)} />
						{selectedDetail.payout.processedAt && <DetailRow label="Processed" value={formatDateTime(selectedDetail.payout.processedAt)} />}
						{selectedDetail.payout.failureReason && <DetailRow label="Failure Reason" value={truncate(selectedDetail.payout.failureReason, 100)} />}
					</div>

					<div className="mt-4 rounded-lg border border-ink-100 p-3">
						<p className="text-xs font-semibold text-ink-600">Linked Invoices ({selectedDetail.items.length})</p>
						{selectedDetail.items.length > 0 ? (
							<div className="mt-2 space-y-2">
								{selectedDetail.items.map((item) => (
									<div key={item.id} className="rounded-md bg-ink-50 px-2 py-2 text-xs text-ink-700">
										<p className="font-semibold">{item.invoiceId.slice(0, 12)}...</p>
										<p>{formatMinor(item.amountMinor)}</p>
										<button
											onClick={() => navigate(`/admin/billing/invoices?id=${encodeURIComponent(item.invoiceId)}`)}
											className="mt-1 rounded-md border border-ink-200 px-2 py-0.5 text-[10px] font-medium text-ink-700 hover:bg-ink-100"
										>
											Open Invoice
										</button>
									</div>
								))}
							</div>
						) : (
							<p className="mt-2 text-xs text-ink-500">No invoices linked.</p>
						)}
					</div>

					<div className="mt-4 rounded-lg border border-ink-100 p-3">
						<p className="text-xs font-semibold text-ink-600">Audit Logs</p>
						{selectedDetail.auditLogs.length > 0 ? (
							<div className="mt-2 space-y-2">
								{selectedDetail.auditLogs.slice(0, 10).map((log) => (
									<div key={log.id} className="rounded-md bg-ink-50 px-2 py-2 text-xs text-ink-700">
										<p className="font-semibold">{log.action}</p>
										<p className="text-ink-500">{formatDateTime(log.createdAt)}</p>
									</div>
								))}
							</div>
						) : (
							<p className="mt-2 text-xs text-ink-500">No audit logs.</p>
						)}
					</div>
				</aside>
			) : null}
		</AdminPageLayout>
	);
}

function MetricCard({ label, value, subvalue }: { label: string; value: string | number; subvalue?: string }) {
	return (
		<div className="rounded-xl border border-ink-100 bg-white p-4">
			<p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
			<p className="mt-2 text-3xl font-bold text-ink-800">{value}</p>
			{subvalue && <p className="mt-1 text-xs text-ink-600">{subvalue}</p>}
		</div>
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
