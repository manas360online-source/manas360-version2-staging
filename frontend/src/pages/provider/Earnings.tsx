import { useQuery } from '@tanstack/react-query';
import { fetchProviderEarnings } from '../../api/provider';
import ProviderWalletSummaryCard from '../../components/provider/ProviderWalletSummaryCard';

const formatCurrency = (minor: number): string =>
	new Intl.NumberFormat('en-IN', {
		style: 'currency',
		currency: 'INR',
		maximumFractionDigits: 0,
	}).format(minor / 100);

const formatDate = (value: string): string => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '-';
	return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const statusClassName = (status: string): string => {
	const normalized = status.toUpperCase();
	if (normalized === 'COMPLETED') return 'bg-[#E8F5EE] text-[#1F6B45]';
	if (normalized === 'CONFIRMED') return 'bg-[#EEF3FF] text-[#3157A6]';
	return 'bg-slate-100 text-slate-600';
};

export default function Earnings() {
	const earningsQuery = useQuery({
		queryKey: ['providerEarnings'],
		queryFn: fetchProviderEarnings,
		refetchInterval: 15000,
		refetchOnWindowFocus: true,
	});

	const data = earningsQuery.data;
	const availableBalanceMinor = Math.max(
		0,
		Number(data?.summary?.availableBalanceMinor ?? 0),
	);

	return (
		<div className="space-y-6">
			<section className="rounded-[28px] border border-[#D9E1D5] bg-[radial-gradient(circle_at_top_left,_rgba(74,103,65,0.18),_transparent_38%),linear-gradient(135deg,#F8FBF5_0%,#FFFFFF_62%)] p-8 shadow-[0_18px_60px_rgba(31,41,55,0.06)]">
				<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6B7B68]">Practice Metrics</p>
				<h1 className="mt-3 text-3xl font-semibold text-[#23313A]">Provider Wallet</h1>
				<p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
					Session earnings only. No manual top-up. After a session is completed, provider share is reflected in pending payouts and then moves to available balance after payout processing.
				</p>
			</section>

			{earningsQuery.isLoading ? (
				<section className="grid gap-4 md:grid-cols-3">
					{Array.from({ length: 3 }).map((_, index) => (
						<div key={`provider-earnings-kpi-${index}`} className="h-36 animate-pulse rounded-[24px] bg-[#EEF2EA]" />
					))}
				</section>
			) : earningsQuery.isError || !data ? (
				<section className="rounded-[24px] border border-rose-200 bg-rose-50 p-6">
					<h2 className="text-lg font-semibold text-rose-900">Unable to load earnings</h2>
					<p className="mt-2 text-sm text-rose-700">
						{earningsQuery.error instanceof Error ? earningsQuery.error.message : 'Revenue metrics are unavailable.'}
					</p>
				</section>
			) : (
				<>
					<section className="grid gap-4 md:grid-cols-3">
						<ProviderWalletSummaryCard
							title="Total Earned"
							amountMinor={Number(data.summary.totalEarningsMinor || 0)}
							note={`Lifetime session earnings • base rate ${formatCurrency(data.summary.sessionRateMinor)}`}
							accent="slate"
						/>
						<ProviderWalletSummaryCard
							title="Available Balance"
							amountMinor={availableBalanceMinor}
							note="Ready for withdrawal request"
							accent="emerald"
						/>
						<ProviderWalletSummaryCard
							title="Pending Payouts"
							amountMinor={Number(data.summary.pendingPayoutsMinor || 0)}
							note="From completed sessions, awaiting payout release"
							accent="amber"
						/>
					</section>

					<section className="rounded-[24px] border border-[#DCE5D9] bg-white p-6 shadow-sm">
						<div className="flex items-center justify-between gap-4">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7B68]">Wallet Throughput</p>
								<h2 className="mt-2 text-xl font-semibold text-[#23313A]">Last 6 months session revenue</h2>
							</div>
							<p className="text-xs text-slate-500">{data.summary.sessionsThisMonth} sessions this month</p>
						</div>
						<div className="mt-6 grid gap-4 md:grid-cols-6">
							{data.monthlyTrend.map((month) => (
								<div key={month.key} className="rounded-2xl bg-[#F7F9F6] p-4">
									<p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7B68]">{month.label}</p>
									<p className="mt-3 text-2xl font-semibold text-[#23313A]">{formatCurrency(month.amountMinor)}</p>
									<p className="mt-2 text-xs text-slate-500">{month.sessions} sessions</p>
								</div>
							))}
						</div>
					</section>

					<section className="rounded-[24px] border border-[#DCE5D9] bg-white p-6 shadow-sm">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7B68]">Recent Transactions</p>
							<h2 className="mt-2 text-xl font-semibold text-[#23313A]">Wallet transaction activity</h2>
						</div>

						<div className="mt-6 overflow-x-auto">
							<table className="min-w-full divide-y divide-[#E8EDE4] text-sm">
								<thead>
									<tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
										<th className="pb-3 pr-4">Session ID</th>
										<th className="pb-3 pr-4">Date</th>
										<th className="pb-3 pr-4">Patient Name</th>
										<th className="pb-3 pr-4">Amount</th>
										<th className="pb-3 pr-4">Status</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[#EEF2EA]">
									{data.recentTransactions.length === 0 ? (
										<tr>
											<td colSpan={5} className="py-8 text-center text-sm text-slate-500">
												No qualifying session revenue yet.
											</td>
										</tr>
									) : (
										data.recentTransactions.map((transaction) => (
											<tr key={transaction.id}>
												<td className="py-4 pr-4 font-mono text-xs text-slate-600">{transaction.bookingReferenceId || transaction.id}</td>
												<td className="py-4 pr-4 text-slate-600">{formatDate(transaction.date)}</td>
												<td className="py-4 pr-4 font-medium text-[#23313A]">{transaction.patientName}</td>
												<td className="py-4 pr-4 font-semibold text-[#23313A]">{formatCurrency(transaction.amountMinor)}</td>
												<td className="py-4 pr-4">
													<span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClassName(transaction.status)}`}>
														{transaction.status}
													</span>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</section>
				</>
			)}
		</div>
	);
}