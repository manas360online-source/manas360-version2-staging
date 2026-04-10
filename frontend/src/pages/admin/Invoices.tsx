import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
	bulkResendAdminInvoices,
	downloadAdminInvoicePdf,
	exportAdminInvoicesCsv,
	getAdminInvoiceDetail,
	listAdminInvoices,
	requestAdminInvoiceRefund,
	resendAdminInvoice,
	type AdminInvoice,
	type AdminInvoiceDetail,
	type AdminInvoiceLifecycleStatus,
} from '../../api/admin.api';
import ActionBar from '../../components/admin/ActionBar';
import AdminPageLayout from '../../components/admin/AdminPageLayout';
import AdminTable from '../../components/admin/AdminTable';

const DEFAULT_META = {
	page: 1,
	limit: 20,
	totalItems: 0,
	totalPages: 1,
};

const statusChipClass: Record<AdminInvoiceLifecycleStatus, string> = {
	DRAFT: 'bg-slate-100 text-slate-700',
	ISSUED: 'bg-sky-100 text-sky-700',
	PAID: 'bg-emerald-100 text-emerald-700',
	FAILED: 'bg-rose-100 text-rose-700',
	REFUNDED: 'bg-orange-100 text-orange-700',
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

export default function AdminInvoicesPage() {
	const [rows, setRows] = useState<AdminInvoice[]>([]);
	const [meta, setMeta] = useState(DEFAULT_META);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<'' | AdminInvoiceLifecycleStatus>('');
	const [sortBy, setSortBy] = useState<'createdAt' | 'issuedAt' | 'invoiceNumber' | 'amountMinor'>('createdAt');
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [bulkFailedIds, setBulkFailedIds] = useState<Set<string>>(new Set());
	const [selectedDetail, setSelectedDetail] = useState<AdminInvoiceDetail | null>(null);
	const [detailLoading, setDetailLoading] = useState(false);
	const [working, setWorking] = useState(false);
	const [refundTarget, setRefundTarget] = useState<AdminInvoice | null>(null);
	const [refundReason, setRefundReason] = useState('');
	const [refundAmount, setRefundAmount] = useState('');

	const loadInvoices = async (page = meta.page): Promise<void> => {
		setLoading(true);
		setError(null);
		try {
			const response = await listAdminInvoices({
				page,
				limit: meta.limit,
				q: query.trim() || undefined,
				status: statusFilter || undefined,
				sortBy,
				sortOrder,
			});

			setRows(response.data);
			setMeta(response.meta);
			setSelectedIds(new Set());
			setBulkFailedIds(new Set());
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to load invoices.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void loadInvoices(1);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sortBy, sortOrder]);

	const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));

	const toggleSelect = (id: string): void => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id); else next.add(id);
			return next;
		});
	};

	const toggleSelectAll = (): void => {
		if (allSelected) {
			setSelectedIds(new Set());
			return;
		}
		setSelectedIds(new Set(rows.map((row) => row.id)));
	};

	const openDetail = async (invoiceId: string): Promise<void> => {
		setDetailLoading(true);
		setSelectedDetail(null);
		try {
			const response = await getAdminInvoiceDetail(invoiceId);
			setSelectedDetail(response.data);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to load invoice detail');
		} finally {
			setDetailLoading(false);
		}
	};

	const runDownload = async (invoice: AdminInvoice): Promise<void> => {
		try {
			const blob = await downloadAdminInvoicePdf(invoice.id);
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = `${invoice.invoiceNumber}.pdf`;
			anchor.click();
			URL.revokeObjectURL(url);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Unable to download invoice PDF');
		}
	};

	const runResend = async (invoice: AdminInvoice): Promise<void> => {
		if (!invoice.paymentId) {
			toast.error('This invoice is not linked to a payment.');
			return;
		}
		setWorking(true);
		try {
			await resendAdminInvoice(invoice.paymentId);
			toast.success('Invoice resend queued successfully.');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Unable to resend invoice');
		} finally {
			setWorking(false);
		}
	};

	const runBulkResend = async (): Promise<void> => {
		if (selectedIds.size === 0) {
			toast.error('Select at least one invoice.');
			return;
		}

		setWorking(true);
		try {
			const response = await bulkResendAdminInvoices(Array.from(selectedIds));
			const failed = response.data.failedIds.length;
			setBulkFailedIds(new Set(response.data.failedIds));
			if (failed > 0) {
				toast(`Bulk resend complete: ${response.data.successCount} succeeded, ${failed} failed.`);
			} else {
				setBulkFailedIds(new Set());
				toast.success(`Bulk resend complete: ${response.data.successCount} succeeded.`);
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Bulk resend failed');
		} finally {
			setWorking(false);
		}
	};

	const runExport = async (): Promise<void> => {
		setWorking(true);
		try {
			const blob = await exportAdminInvoicesCsv(query.trim() || undefined);
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = `admin-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
			anchor.click();
			URL.revokeObjectURL(url);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Unable to export invoices');
		} finally {
			setWorking(false);
		}
	};

	const submitRefund = async (): Promise<void> => {
		if (!refundTarget) return;

		setWorking(true);
		try {
			await requestAdminInvoiceRefund(refundTarget.id, {
				reason: refundReason.trim() || undefined,
				amountMinor: refundAmount.trim() ? Math.round(Number(refundAmount) * 100) : undefined,
			});
			toast.success('Refund request submitted. Final status updates via reconciliation/webhook.');
			setRefundTarget(null);
			setRefundReason('');
			setRefundAmount('');
			await loadInvoices(meta.page);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Refund request failed');
		} finally {
			setWorking(false);
		}
	};

	const columns = useMemo(() => [
		{
			key: 'select',
			head: 'Select',
			render: (invoice: AdminInvoice) => (
				<input
					type="checkbox"
					checked={selectedIds.has(invoice.id)}
					onChange={() => toggleSelect(invoice.id)}
					aria-label={`Select ${invoice.invoiceNumber}`}
				/>
			),
		},
		{
			key: 'invoice',
			head: 'Invoice #',
			sortable: true,
			sortKey: 'invoiceNumber',
			render: (invoice: AdminInvoice) => (
				<div>
					<p className="text-sm font-semibold text-ink-800">{invoice.invoiceNumber}</p>
					<p className="text-xs text-ink-500">ID: {invoice.id.slice(0, 8)}...</p>
					{bulkFailedIds.has(invoice.id) ? <p className="text-[11px] font-medium text-rose-700">Bulk resend failed in last run</p> : null}
				</div>
			),
		},
		{
			key: 'user',
			head: 'User / Tenant',
			render: (invoice: AdminInvoice) => (
				<div>
					<p className="text-sm text-ink-700">{invoice.customerName || 'Unknown'}</p>
					<p className="text-xs text-ink-500">{invoice.customerEmail || '-'}</p>
					<p className="text-[11px] text-ink-400">Tenant: {invoice.tenantId || 'Platform'}</p>
				</div>
			),
		},
		{
			key: 'amount',
			head: 'Amount',
			sortable: true,
			sortKey: 'amountMinor',
			render: (invoice: AdminInvoice) => <span className="text-sm font-semibold text-ink-800">{formatMinor(invoice.amountMinor)}</span>,
		},
		{
			key: 'status',
			head: 'Status',
			render: (invoice: AdminInvoice) => (
				<span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusChipClass[invoice.lifecycleStatus] || 'bg-slate-100 text-slate-700'}`}>
					{invoice.lifecycleStatus}
				</span>
			),
		},
		{
			key: 'issued',
			head: 'Issued',
			sortable: true,
			sortKey: 'issuedAt',
			render: (invoice: AdminInvoice) => <span className="text-xs text-ink-600">{formatDateTime(invoice.issuedAt)}</span>,
		},
		{
			key: 'paid',
			head: 'Paid',
			render: (invoice: AdminInvoice) => <span className="text-xs text-ink-600">{formatDateTime(invoice.paidAt)}</span>,
		},
		{
			key: 'actions',
			head: 'Actions',
			render: (invoice: AdminInvoice) => (
				<div className="flex flex-wrap gap-2">
					<button onClick={() => { void openDetail(invoice.id); }} className="rounded-md border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50">View</button>
					<button onClick={() => { void runDownload(invoice); }} className="rounded-md border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50">Download</button>
					<button disabled={working || !invoice.paymentId || invoice.lifecycleStatus === 'DRAFT'} onClick={() => { void runResend(invoice); }} className="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50">Resend</button>
					<button disabled={working || invoice.lifecycleStatus !== 'PAID'} onClick={() => setRefundTarget(invoice)} className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50">Refund</button>
				</div>
			),
		},
	], [bulkFailedIds, selectedIds, working]);

	const handleSortChange = (nextSortKey: string): void => {
		const casted = nextSortKey as 'createdAt' | 'issuedAt' | 'invoiceNumber' | 'amountMinor';
		if (casted === sortBy) {
			setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
			return;
		}
		setSortBy(casted);
		setSortOrder('asc');
	};

	return (
		<AdminPageLayout
			title="Invoices"
			description="Billing control panel for invoice lifecycle, refunds, and document operations."
			actions={
				<>
					<input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search by invoice # or customer email"
						className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2"
					/>
					<select
						value={statusFilter}
						onChange={(event) => setStatusFilter(event.target.value as '' | AdminInvoiceLifecycleStatus)}
						className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2"
					>
						<option value="">All statuses</option>
						<option value="DRAFT">DRAFT</option>
						<option value="ISSUED">ISSUED</option>
						<option value="PAID">PAID</option>
						<option value="FAILED">FAILED</option>
						<option value="REFUNDED">REFUNDED</option>
					</select>
					<button onClick={() => { void loadInvoices(1); }} className="rounded-lg bg-sage-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sage-700">Apply</button>
				</>
			}
		>
			<ActionBar>
				<div className="rounded-md bg-ink-50 px-2 py-1 text-xs text-ink-600">Selected: {selectedIds.size}</div>
				<button onClick={toggleSelectAll} className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50">{allSelected ? 'Clear Selection' : 'Select Visible'}</button>
				<button disabled={working || selectedIds.size === 0} onClick={() => { void runBulkResend(); }} className="rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50">Bulk Resend</button>
				<button disabled={working} onClick={() => { void runExport(); }} className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50">Export CSV</button>
			</ActionBar>

			{error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

			<AdminTable
				columns={columns}
				rows={rows}
				rowKey={(row) => row.id}
				loading={loading}
				loadingText="Loading invoices..."
				emptyText="No invoices found for this filter."
				sortBy={sortBy}
				sortOrder={sortOrder}
				onSortChange={handleSortChange}
			/>

			<div className="mt-2 flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-3 text-sm">
				<p className="text-ink-500">
					Page <span className="font-semibold text-ink-700">{meta.page}</span> of <span className="font-semibold text-ink-700">{meta.totalPages || 1}</span>
				</p>
				<div className="flex gap-2">
					<button disabled={loading || meta.page <= 1} onClick={() => { void loadInvoices(meta.page - 1); }} className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50">Previous</button>
					<button disabled={loading || meta.page >= (meta.totalPages || 1)} onClick={() => { void loadInvoices(meta.page + 1); }} className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50">Next</button>
				</div>
			</div>

			{detailLoading ? (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 text-sm text-white">Loading invoice details...</div>
			) : null}

			{selectedDetail ? (
				<aside className="fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto border-l border-ink-100 bg-white p-5 shadow-soft-lg">
					<div className="flex items-start justify-between">
						<div>
							<h3 className="font-display text-lg font-bold text-ink-800">Invoice Inspector</h3>
							<p className="text-xs text-ink-500">{selectedDetail.invoice.invoiceNumber}</p>
						</div>
						<button onClick={() => setSelectedDetail(null)} className="rounded-md border border-ink-200 px-2 py-1 text-xs text-ink-600 hover:bg-ink-50">Close</button>
					</div>

					<div className="mt-4 space-y-3 text-sm">
						<DetailRow label="Invoice ID" value={selectedDetail.invoice.id} />
						<DetailRow label="Amount" value={formatMinor(selectedDetail.invoice.amountMinor)} />
						<DetailRow label="Lifecycle" value={selectedDetail.invoice.lifecycleStatus} />
						<DetailRow label="Issued" value={formatDateTime(selectedDetail.invoice.issuedAt)} />
						<DetailRow label="Paid" value={formatDateTime(selectedDetail.invoice.paidAt)} />
					</div>

					{selectedDetail.invoice && typeof selectedDetail.invoice.metadata?.upiQrDataUrl === 'string' ? (
						<div className="mt-4 rounded-lg border border-ink-100 p-3">
							<p className="mb-2 text-xs font-semibold text-ink-600">QR Preview</p>
							<img src={selectedDetail.invoice.metadata.upiQrDataUrl as string} alt="Invoice UPI QR" className="h-28 w-28 rounded border border-ink-100" />
						</div>
					) : null}

					<div className="mt-4 rounded-lg border border-ink-100 p-3">
						<p className="text-xs font-semibold text-ink-600">Payment</p>
						{selectedDetail.payment ? (
							<div className="mt-2 space-y-1 text-xs text-ink-700">
								<p>ID: {selectedDetail.payment.id}</p>
								<p>Status: {selectedDetail.payment.status}</p>
								<p>Reference: {selectedDetail.payment.merchantTransactionId}</p>
							</div>
						) : <p className="mt-2 text-xs text-ink-500">No payment linked.</p>}
					</div>

					<div className="mt-4 rounded-lg border border-ink-100 p-3">
						<p className="text-xs font-semibold text-ink-600">Timeline</p>
						<div className="mt-2 space-y-2">
							{selectedDetail.events.map((event) => (
								<div key={event.id} className="rounded-md bg-ink-50 px-2 py-2 text-xs text-ink-700">
									<p className="font-semibold">{event.eventType}</p>
									<p>{formatDateTime(event.createdAt)}</p>
								</div>
							))}
						</div>
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

			{refundTarget ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-lg rounded-xl border border-ink-100 bg-white p-5 shadow-soft-lg">
						<h3 className="font-display text-lg font-bold text-ink-800">Request Refund</h3>
						<p className="mt-1 text-sm text-ink-600">Invoice: {refundTarget.invoiceNumber}</p>
						<textarea
							value={refundReason}
							onChange={(event) => setRefundReason(event.target.value)}
							placeholder="Reason"
							className="mt-3 min-h-24 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2"
						/>
						<input
							value={refundAmount}
							onChange={(event) => setRefundAmount(event.target.value)}
							placeholder="Refund amount (INR, optional)"
							className="mt-2 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2"
						/>
						<div className="mt-4 flex justify-end gap-2">
							<button onClick={() => setRefundTarget(null)} className="rounded-md border border-ink-200 px-3 py-2 text-xs font-medium text-ink-700 hover:bg-ink-50">Cancel</button>
							<button disabled={working} onClick={() => { void submitRefund(); }} className="rounded-md bg-sage-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sage-700 disabled:opacity-50">Submit</button>
						</div>
					</div>
				</div>
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
