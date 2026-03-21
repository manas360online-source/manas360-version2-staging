import { useEffect, useMemo, useState } from 'react';
import {
	CartesianGrid,
	Bar,
	BarChart,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
	Cell,
} from 'recharts';
import {
	getAdminPaymentReliabilityMetrics,
	type AdminPaymentReliabilityMetrics,
} from '../../api/admin.api';

const currencyFormat = new Intl.NumberFormat('en-IN', {
	style: 'currency',
	currency: 'INR',
	maximumFractionDigits: 0,
});

const numberFormat = new Intl.NumberFormat('en-IN');

const PIE_COLORS = ['#1D4ED8', '#0D9488', '#EA580C', '#7C3AED', '#D946EF', '#DC2626', '#64748B'];

function StatCard({ label, value, note }: { label: string; value: string | number; note?: string }) {
	return (
		<div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
			<p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{label}</p>
			<p className="mt-2 font-display text-3xl font-bold text-ink-900">{value}</p>
			{note ? <p className="mt-2 text-xs text-ink-500">{note}</p> : null}
		</div>
	);
}

export default function AdminPaymentReliabilityPage() {
	const [days, setDays] = useState(30);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [metrics, setMetrics] = useState<AdminPaymentReliabilityMetrics | null>(null);

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			setError(null);
			try {
				const response = await getAdminPaymentReliabilityMetrics(days);
				setMetrics(response.data);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to load payment reliability metrics');
			} finally {
				setLoading(false);
			}
		};

		void load();
	}, [days]);

	const revenueByPlanData = useMemo(() => {
		const rows = Object.entries(metrics?.revenuePerPlanMinor || {});
		return rows
			.map(([plan, amount]) => ({ name: plan, value: Number(amount || 0) / 100 }))
			.sort((a, b) => b.value - a.value)
			.slice(0, 8);
	}, [metrics]);

	const failureReasonData = useMemo(
		() => (metrics?.failureReasons || []).map((row) => ({ name: row.reason, value: row.count })),
		[metrics],
	);

	return (
		<div className="space-y-8 pb-12">
			<section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="font-display text-2xl font-bold tracking-tight text-ink-900">Payment Reliability</h2>
					<p className="text-sm text-ink-500">Revenue health, retries, and failure diagnostics in a single view.</p>
				</div>
				<div className="inline-flex items-center rounded-xl border border-ink-200 bg-white px-3 py-2">
					<label htmlFor="days" className="mr-2 text-xs font-semibold uppercase tracking-wider text-ink-500">Window</label>
					<select
						id="days"
						value={days}
						onChange={(e) => setDays(Number(e.target.value))}
						className="rounded-md border border-ink-200 bg-white px-2 py-1 text-sm text-ink-700"
					>
						<option value={7}>Last 7 days</option>
						<option value={30}>Last 30 days</option>
						<option value={90}>Last 90 days</option>
					</select>
				</div>
			</section>

			{error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				<StatCard
					label="Total Revenue"
					value={loading ? '...' : currencyFormat.format((metrics?.revenueMinor || 0) / 100)}
					note={`Window: ${days} days`}
				/>
				<StatCard
					label="Total Payments"
					value={loading ? '...' : numberFormat.format(metrics?.totalPayments || 0)}
					note="Captured + failed attempts"
				/>
				<StatCard
					label="Success Rate"
					value={loading ? '...' : `${(metrics?.successRate || 0).toFixed(2)}%`}
					note="Higher is better"
				/>
				<StatCard
					label="Retry Success %"
					value={loading ? '...' : `${(metrics?.retrySuccessRate || 0).toFixed(2)}%`}
					note="Recovered by retries"
				/>
			</div>

			<section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
					<h3 className="mb-4 font-display text-sm font-bold text-ink-800">Payment Outcomes Trend</h3>
					<div className="h-72">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={metrics?.daily || []}>
								<CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
								<XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6B7280' }} />
								<YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
								<Tooltip />
								<Legend />
								<Line type="monotone" dataKey="success" stroke="#059669" strokeWidth={2} dot={false} name="Success" />
								<Line type="monotone" dataKey="failed" stroke="#DC2626" strokeWidth={2} dot={false} name="Failed" />
								<Line type="monotone" dataKey="retryAttempts" stroke="#D97706" strokeWidth={2} dot={false} name="Retries" />
							</LineChart>
						</ResponsiveContainer>
					</div>
				</div>

				<div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
					<h3 className="mb-4 font-display text-sm font-bold text-ink-800">Revenue Per Plan</h3>
					<div className="h-72">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={revenueByPlanData}>
								<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
								<XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} />
								<YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
								<Tooltip formatter={(val: number) => currencyFormat.format(val)} />
								<Bar dataKey="value" fill="#1D4ED8" radius={[4, 4, 0, 0]} barSize={36} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			</section>

			<section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
					<h3 className="mb-4 font-display text-sm font-bold text-ink-800">Failure Reasons</h3>
					<div className="h-72">
						{failureReasonData.length ? (
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie data={failureReasonData} dataKey="value" nameKey="name" outerRadius={96} innerRadius={46}>
										{failureReasonData.map((_, index) => (
											<Cell key={`failure-cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
										))}
									</Pie>
									<Tooltip />
									<Legend wrapperStyle={{ fontSize: 12 }} />
								</PieChart>
							</ResponsiveContainer>
						) : (
							<div className="flex h-full items-center justify-center text-sm text-ink-500">No failures in selected window</div>
						)}
					</div>
				</div>

				<div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
					<h3 className="mb-4 font-display text-sm font-bold text-ink-800">Daily Revenue Trend</h3>
					<div className="h-72">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={metrics?.daily || []}>
								<CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
								<XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6B7280' }} />
								<YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
								<Tooltip formatter={(val: number) => currencyFormat.format(Number(val || 0) / 100)} />
								<Line type="monotone" dataKey="revenueMinor" stroke="#0D9488" strokeWidth={2} dot={false} name="Revenue" />
							</LineChart>
						</ResponsiveContainer>
					</div>
				</div>
			</section>
		</div>
	);
}
