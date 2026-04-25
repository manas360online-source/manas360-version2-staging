import { useState, useEffect } from 'react';
import { Search, Wallet, User, ArrowRight, History, CreditCard, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { searchAdminEntities, creditUserWallet, type AdminGlobalSearchResult } from '../../api/admin.api';
import AdminPageLayout from '../../components/admin/AdminPageLayout';

interface SelectedUser {
	id: string;
	name: string;
	email: string;
	role: string;
}

export default function AdminWalletPage() {
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState<AdminGlobalSearchResult['users']>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
	
	const [amount, setAmount] = useState('');
	const [reason, setReason] = useState('');
	const [expiryDays, setExpiryDays] = useState('365');
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (searchQuery.trim().length < 2) {
			setSearchResults([]);
			return;
		}

		const timer = setTimeout(async () => {
			setIsSearching(true);
			try {
				const response = await searchAdminEntities(searchQuery, 5);
				setSearchResults(response.data.users);
			} catch (err) {
				console.error('Search failed', err);
			} finally {
				setIsSearching(false);
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [searchQuery]);

	const handleSelectUser = (user: AdminGlobalSearchResult['users'][0]) => {
		setSelectedUser({
			id: user.id,
			name: user.name,
			email: user.email,
			role: 'User' // API doesn't return role in global search usually, but we can assume or fix if needed
		});
		setSearchQuery('');
		setSearchResults([]);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedUser) return;
		
		const numAmount = parseFloat(amount);
		if (isNaN(numAmount) || numAmount <= 0) {
			toast.error('Please enter a valid positive amount');
			return;
		}

		setIsSubmitting(true);
		try {
			await creditUserWallet({
				userId: selectedUser.id,
				amount: numAmount,
				reason: reason.trim() || undefined,
				expiresInDays: parseInt(expiryDays)
			});
			
			toast.success(`Successfully credited ₹${numAmount} to ${selectedUser.name}`);
			setAmount('');
			setReason('');
			setSelectedUser(null);
		} catch (err: any) {
			toast.error(err.message || 'Failed to credit wallet');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<AdminPageLayout
			title="Wallet Management"
			description="Manually adjust user balances, issue refunds, or grant promotional credits with built-in audit trails."
		>
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				{/* Step 1: User Search */}
				<div className="lg:col-span-2 space-y-6">
					<div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft-sm">
						<h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink-800">
							<User className="h-5 w-5 text-sage-600" />
							1. Select Target User
						</h3>
						<p className="mt-1 text-sm text-ink-500">Search by name or email to find the user you wish to credit.</p>
						
						<div className="relative mt-4">
							<div className="absolute inset-y-0 left-0 flex items-center pl-3">
								<Search className="h-4 w-4 text-ink-400" />
							</div>
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search user name or email..."
								className="w-full rounded-xl border border-ink-100 bg-ink-50/30 py-3 pl-10 pr-4 text-sm outline-none ring-sage-500 transition focus:bg-white focus:ring-2"
							/>
							{isSearching && (
								<div className="absolute inset-y-0 right-0 flex items-center pr-3">
									<Loader2 className="h-4 w-4 animate-spin text-ink-400" />
								</div>
							)}
						</div>

						{searchResults.length > 0 && (
							<div className="mt-2 divide-y divide-ink-50 rounded-xl border border-ink-100 bg-white shadow-lg overflow-hidden">
								{searchResults.map((user) => (
									<button
										key={user.id}
										onClick={() => handleSelectUser(user)}
										className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-sage-50"
									>
										<div>
											<p className="text-sm font-semibold text-ink-800">{user.name}</p>
											<p className="text-xs text-ink-500">{user.email}</p>
										</div>
										<ArrowRight className="h-4 w-4 text-sage-400" />
									</button>
								))}
							</div>
						)}

						{selectedUser && (
							<div className="mt-6 flex items-center justify-between rounded-xl bg-sage-50 p-4 border border-sage-100">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-600 text-sm font-bold text-white">
										{selectedUser.name.charAt(0).toUpperCase()}
									</div>
									<div>
										<p className="text-sm font-bold text-sage-900">{selectedUser.name}</p>
										<p className="text-xs text-sage-700">{selectedUser.email}</p>
									</div>
								</div>
								<button 
									onClick={() => setSelectedUser(null)}
									className="text-xs font-medium text-sage-600 hover:text-sage-800 underline"
								>
									Change
								</button>
							</div>
						)}
					</div>

					{/* Wallet Stats / Recent activity (Placeholder for now) */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft-sm">
							<div className="flex items-center justify-between">
								<h4 className="text-xs font-semibold uppercase tracking-wider text-ink-500">Recent adjustments</h4>
								<History className="h-4 w-4 text-ink-400" />
							</div>
							<div className="mt-4 space-y-3">
								<p className="text-sm text-ink-400 italic">No recent manual adjustments found.</p>
							</div>
						</div>
						<div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft-sm">
							<div className="flex items-center justify-between">
								<h4 className="text-xs font-semibold uppercase tracking-wider text-ink-500">System Balance</h4>
								<CheckCircle2 className="h-4 w-4 text-emerald-500" />
							</div>
							<p className="mt-4 text-2xl font-bold text-ink-800">₹0.00</p>
							<p className="text-xs text-ink-500">Active platform credits</p>
						</div>
					</div>
				</div>

				{/* Step 2: Credit Form */}
				<div className="lg:col-span-1">
					<form 
						onSubmit={handleSubmit}
						className={`rounded-2xl border border-ink-100 bg-white p-6 shadow-soft-sm sticky top-6 ${!selectedUser ? 'opacity-50 pointer-events-none' : ''}`}
					>
						<h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink-800">
							<CreditCard className="h-5 w-5 text-sage-600" />
							2. Apply Credit
						</h3>
						
						<div className="mt-6 space-y-4">
							<div>
								<label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5 ml-1">
									Credit Amount (₹)
								</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<span className="text-ink-400 text-sm">₹</span>
									</div>
									<input
										type="number"
										step="0.01"
										value={amount}
										onChange={(e) => setAmount(e.target.value)}
										placeholder="0.00"
										className="w-full rounded-xl border border-ink-100 bg-white py-2.5 pl-8 pr-4 text-sm outline-none ring-sage-500 transition focus:ring-2"
										required
									/>
								</div>
							</div>

							<div>
								<label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5 ml-1">
									Reason / Reference
								</label>
								<textarea
									value={reason}
									onChange={(e) => setReason(e.target.value)}
									placeholder="e.g. Refund for cancelled session #123"
									className="w-full rounded-xl border border-ink-100 bg-white py-2.5 px-3 text-sm outline-none ring-sage-500 transition focus:ring-2 min-h-[80px]"
									required
								/>
							</div>

							<div>
								<label className="block text-xs font-semibold text-ink-500 uppercase mb-1.5 ml-1">
									Validity Period
								</label>
								<select
									value={expiryDays}
									onChange={(e) => setExpiryDays(e.target.value)}
									className="w-full rounded-xl border border-ink-100 bg-white py-2.5 px-3 text-sm outline-none ring-sage-500 transition focus:ring-2"
								>
									<option value="30">30 Days</option>
									<option value="90">90 Days</option>
									<option value="180">6 Months</option>
									<option value="365">1 Year</option>
									<option value="730">2 Years</option>
								</select>
								<p className="mt-1.5 flex items-center gap-1 text-[10px] text-ink-400 ml-1">
									<Clock className="h-3 w-3" />
									Credits will expire automatically after this period
								</p>
							</div>

							{!selectedUser && (
								<div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 border border-amber-100">
									<AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
									<p className="text-[11px] text-amber-700">Please select a user to enable the form.</p>
								</div>
							)}

							<button
								type="submit"
								disabled={isSubmitting || !selectedUser}
								className="w-full rounded-xl bg-sage-600 py-3 text-sm font-bold text-white shadow-lg shadow-sage-200 transition hover:bg-sage-700 disabled:bg-ink-200 disabled:shadow-none flex items-center justify-center gap-2 mt-4"
							>
								{isSubmitting ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin" />
										Processing...
									</>
								) : (
									<>
										<Wallet className="h-4 w-4" />
										Credit Wallet
									</>
								)}
							</button>
						</div>
					</form>
				</div>
			</div>
		</AdminPageLayout>
	);
}
