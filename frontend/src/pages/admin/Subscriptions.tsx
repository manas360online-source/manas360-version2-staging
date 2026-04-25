import { useEffect, useMemo, useState } from 'react';
import { getAdminSubscriptions, type AdminSubscription, type AdminSubscriptionPlanType, type AdminSubscriptionStatus } from '../../api/admin.api';

const statusBadge: Record<string, string> = {
	active: 'bg-emerald-100 text-emerald-700',
	expired: 'bg-rose-100 text-rose-700',
	cancelled: 'bg-slate-100 text-slate-600',
	paused: 'bg-amber-100 text-amber-700',
};

const planBadge: Record<string, string> = {
	basic: 'bg-sky-100 text-sky-700',
	premium: 'bg-violet-100 text-violet-700',
	pro: 'bg-indigo-100 text-indigo-700',
};

const formatDate = (value: string): string => {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function AdminSubscriptionsPage() {
	const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(25);
	const [status, setStatus] = useState<'' | AdminSubscriptionStatus>('active');
	const [planType, setPlanType] = useState<'' | AdminSubscriptionPlanType>('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [meta, setMeta] = useState({ page: 1, limit: 25, totalItems: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false });

	const load = async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await getAdminSubscriptions({
				page,
				limit,
				status: status || undefined,
				planType: planType || undefined,
			});
			setSubscriptions(response.data.data);
			setMeta(response.data.meta);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load subscriptions');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page, limit, status, planType]);

	const filtered = useMemo(() => subscriptions, [subscriptions]);

	const exportCsv = () => {
		const rows = [
			['User', 'Email', 'Plan', 'Status', 'Expiry', 'Auto Renew', 'Price', 'Billing Cycle'],
			...filtered.map((subscription) => [
				subscription.user.name || `${subscription.user.id.slice(0, 8)}...`,
				subscription.user.email,
				subscription.plan.name,
				subscription.status,
				subscription.expiryDate,
				subscription.autoRenew ? 'Yes' : 'No',
				String(subscription.price),
				subscription.billingCycle,
			]),
		];
		const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `manas360-subscriptions-${new Date().toISOString().slice(0, 10)}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="space-y-4">
			<div className="rounded-xl border border-ink-100 bg-white p-5">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<h2 className="font-display text-xl font-bold text-ink-800">Subscriptions</h2>
						<p className="mt-1 text-sm text-ink-600">Live view of active, paused, expired, and cancelled subscriptions.</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<select value={status} onChange={(event) => setStatus(event.target.value as '' | AdminSubscriptionStatus)} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none focus:ring-2 focus:ring-sage-500">
							<option value="">All statuses</option>
							<option value="active">Active</option>
							<option value="expired">Expired</option>
							<option value="cancelled">Cancelled</option>
							<option value="paused">Paused</option>
						</select>
						<select value={planType} onChange={(event) => setPlanType(event.target.value as '' | AdminSubscriptionPlanType)} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none focus:ring-2 focus:ring-sage-500">
							<option value="">All plans</option>
							<option value="basic">Basic</option>
							<option value="premium">Premium</option>
							<option value="pro">Pro</option>
						</select>
						<select value={limit} onChange={(event) => setLimit(Number(event.target.value))} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none focus:ring-2 focus:ring-sage-500">
							<option value={10}>10</option>
							<option value={25}>25</option>
							<option value={50}>50</option>
						</select>
						<button onClick={exportCsv} className="rounded-lg bg-sage-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sage-700">
							Export CSV
						</button>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<StatCard label="Total" value={String(meta.totalItems)} />
				<StatCard label="Active" value={String(filtered.filter((item) => item.status === 'active').length)} />
				<StatCard label="Paused" value={String(filtered.filter((item) => item.status === 'paused').length)} />
				<StatCard label="Expired" value={String(filtered.filter((item) => item.status === 'expired').length)} />
			</div>

			{error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

			<div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-ink-100">
						<thead className="bg-ink-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">User</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Plan</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Status</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Renewal</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Billing</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Price</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-ink-100 bg-white">
							{loading ? (
								<tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-500">Loading subscriptions...</td></tr>
							) : filtered.length === 0 ? (
								<tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-500">No subscriptions found.</td></tr>
							) : filtered.map((subscription) => (
								<tr key={subscription._id}>
									<td className="px-4 py-3">
										<p className="text-sm font-semibold text-ink-800">{subscription.user.name || subscription.user.email}</p>
										<p className="text-xs text-ink-500">{subscription.user.email}</p>
									</td>
									<td className="px-4 py-3">
										<span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${planBadge[String(subscription.plan.type).toLowerCase()] || 'bg-slate-100 text-slate-600'}`}>{subscription.plan.name}</span>
									</td>
									<td className="px-4 py-3">
										<span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusBadge[String(subscription.status).toLowerCase()] || 'bg-slate-100 text-slate-600'}`}>{subscription.status}</span>
									</td>
									<td className="px-4 py-3 text-sm text-ink-700">{formatDate(subscription.expiryDate)}</td>
									<td className="px-4 py-3 text-sm text-ink-700">{subscription.billingCycle} · {subscription.autoRenew ? 'Auto renew' : 'Manual'}</td>
									<td className="px-4 py-3 text-sm text-ink-700">₹{subscription.price.toLocaleString('en-IN')}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<div className="flex items-center justify-between border-t border-ink-100 px-4 py-3 text-sm">
					<p className="text-ink-500">Page <span className="font-semibold text-ink-700">{meta.page}</span> of <span className="font-semibold text-ink-700">{meta.totalPages || 1}</span></p>
					<div className="flex gap-2">
						<button disabled={!meta.hasPrevPage} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-ink-100 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40">Prev</button>
						<button disabled={!meta.hasNextPage} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-ink-100 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40">Next</button>
					</div>
				</div>
			</div>
		</div>
	);
}

function StatCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl border border-ink-100 bg-white p-4">
			<p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
			<p className="mt-2 text-2xl font-bold text-ink-800">{value}</p>
		</div>
	);
}
