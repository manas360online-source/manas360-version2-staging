import { Filter, Plus, Search, RefreshCw, FileText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import CreateAgreementModal from '../../components/admin/CreateAgreementModal';
import { getAdminAgreementStats, listAdminAgreements, type AdminAgreementRecord, type AdminAgreementStats } from '../../api/admin.api';
import StatusBadge from '../../components/ui/StatusBadge';

const AGREEMENTS_QUERY_KEY = ['admin-agreements'] as const;
const AGREEMENTS_STATS_QUERY_KEY = ['admin-agreements-stats'] as const;

export default function AgreementsPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

	const agreementsQuery = useQuery<AdminAgreementRecord[]>({
		queryKey: AGREEMENTS_QUERY_KEY,
		queryFn: async () => {
			const response = await listAdminAgreements();
			return response?.data?.items ?? [];
		},
		staleTime: 30_000,
		refetchOnWindowFocus: false,
		retry: 1,
	});

	const handleCreateSuccess = () => {
		void queryClient.invalidateQueries({ queryKey: AGREEMENTS_QUERY_KEY });
		void queryClient.invalidateQueries({ queryKey: AGREEMENTS_STATS_QUERY_KEY });
	};

	const agreements = agreementsQuery.data ?? [];
	const loading = agreementsQuery.isLoading;
	const error = agreementsQuery.error
		? ((agreementsQuery.error as any)?.response?.data?.message || (agreementsQuery.error as any)?.message || 'Unable to load agreements.')
		: null;

	const statsQuery = useQuery<AdminAgreementStats>({
		queryKey: AGREEMENTS_STATS_QUERY_KEY,
		queryFn: async () => {
			const response = await getAdminAgreementStats();
			return response?.data ?? {
				totalAgreements: 0,
				activeAgreements: 0,
				pendingSignatures: 0,
				draftAgreements: 0,
			};
		},
		staleTime: 30_000,
		refetchOnWindowFocus: false,
		retry: 1,
	});

	const stats = statsQuery.data ?? {
		totalAgreements: agreements.length,
		activeAgreements: agreements.filter((item) => String(item.status || '').toLowerCase() === 'active').length,
		pendingSignatures: agreements.filter((item) => {
			const current = String(item.status || '').toLowerCase();
			return current === 'sent' || current === 'client_reviewing' || current === 'signed_uploaded';
		}).length,
		draftAgreements: agreements.filter((item) => String(item.status || '').toLowerCase() === 'draft').length,
	};

	const filteredAgreements = useMemo(() => agreements.filter((agreement) => {
		const query = searchQuery.trim().toLowerCase();
		const matchesSearch = !query || [agreement.company_legal_name, agreement.signatory_email, agreement.signatory_phone, agreement.selected_tier, agreement.status]
			.some((value) => String(value || '').toLowerCase().includes(query));
		const matchesStatus = statusFilter === 'all' || String(agreement.status || '').toLowerCase() === statusFilter;
		return matchesSearch && matchesStatus;
	}), [agreements, searchQuery, statusFilter]);

	const formatDate = (value?: string) => {
		if (!value) return '—';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '—';
		return new Intl.DateTimeFormat('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		}).format(date);
	};

	const tierLabel = (tier: string) => {
		const normalized = String(tier || '').toLowerCase();
		return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : '—';
	};

	const handleCreateAgreement = () => {
		setIsCreateModalOpen(true);
	};

	const canCopyLink = (agreement: AdminAgreementRecord): boolean => {
		const status = String(agreement.status || '').toLowerCase();
		return status === 'sent' && Boolean(agreement.share_url);
	};

	const handleCopyLink = async (agreement: AdminAgreementRecord) => {
		const status = String(agreement.status || '').toLowerCase();
		if (status !== 'sent') {
			toast.error('Copy Link is available only when status is Sent.');
			return;
		}

		if (!agreement.share_url) {
			toast.error('Share link is not available yet.');
			return;
		}

		try {
			await navigator.clipboard.writeText(agreement.share_url);
			toast.success('Link copied');
		} catch {
			toast.error('Unable to copy link');
		}
	};

	const handleSendViaEmail = () => {
		toast('Send via Email coming soon');
	};

	const openAgreementDetail = (agreementId: string) => {
		navigate(`/admin/operations/agreements/${encodeURIComponent(agreementId)}`);
	};

	const openClientAgreement = (agreementId?: string) => {
		const targetId = agreementId && agreementId.trim().length > 0 ? agreementId : 'draft';
		navigate(`/admin/operations/agreements/${encodeURIComponent(targetId)}/client`);
	};

	return (
		<div className="p-6">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Agreements</h1>
					<p className="mt-1 text-gray-600">Manage corporate and platform agreements</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => openClientAgreement()}
						className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
					>
						<FileText size={18} />
						Open Client Agreement
					</button>
					<button
						onClick={handleCreateAgreement}
						className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
					>
						<Plus size={20} />
						Create Agreement
					</button>
				</div>
			</div>

			<div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Agreements</p>
					<p className="mt-2 text-2xl font-bold text-gray-900">{statsQuery.isLoading ? '—' : stats.totalAgreements}</p>
				</div>
				<div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Active Agreements</p>
					<p className="mt-2 text-2xl font-bold text-emerald-700">{statsQuery.isLoading ? '—' : stats.activeAgreements}</p>
				</div>
				<div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pending Signatures</p>
					<p className="mt-2 text-2xl font-bold text-amber-700">{statsQuery.isLoading ? '—' : stats.pendingSignatures}</p>
				</div>
				<div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Draft Agreements</p>
					<p className="mt-2 text-2xl font-bold text-slate-700">{statsQuery.isLoading ? '—' : stats.draftAgreements}</p>
				</div>
			</div>

			<div className="mb-6 grid gap-3 md:grid-cols-[1fr_220px_auto]">
				<div className="relative">
					<Search size={20} className="absolute left-3 top-3 text-gray-400" />
					<input
						type="text"
						placeholder="Search company, email, phone, tier, status..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-blue-500 focus:outline-none"
					/>
				</div>
				<div className="relative">
					<Filter size={18} className="absolute left-3 top-3 text-gray-400" />
					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
						className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 focus:border-blue-500 focus:outline-none"
					>
						<option value="all">All statuses</option>
						<option value="draft">Draft</option>
						<option value="sent">Sent</option>
						<option value="client_reviewing">Client Reviewing</option>
						<option value="signed_uploaded">Signed Uploaded</option>
						<option value="active">Active</option>
					</select>
				</div>
				<button
					type="button"
					onClick={() => {
						void agreementsQuery.refetch();
						void statsQuery.refetch();
					}}
					disabled={agreementsQuery.isFetching}
					className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
				>
					<RefreshCw size={16} />
					{agreementsQuery.isFetching ? 'Refreshing...' : 'Refresh'}
				</button>
			</div>

			<div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
				Status flow: draft → sent → client_reviewing → signed_uploaded → active
			</div>

			{error ? (
				<div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					{error}
				</div>
			) : null}

			{loading ? (
				<div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center text-gray-600">
					Loading agreements...
				</div>
			) : filteredAgreements.length === 0 ? (
				<div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
					<p className="text-gray-600">No agreements found</p>
					<button
						onClick={handleCreateAgreement}
						className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
					>
						Create your first agreement
					</button>
				</div>
			) : (
				<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Company Name</th>
								<th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
								<th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Tier</th>
								<th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Created Date</th>
								<th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100 bg-white">
							{filteredAgreements.map((agreement) => (
								<tr key={agreement.id} className="hover:bg-gray-50">
									<td className="px-6 py-4">
										<div className="font-medium text-gray-900">{agreement.company_legal_name}</div>
										<div className="text-sm text-gray-500">{agreement.signatory_email}</div>
									</td>
									<td className="px-6 py-4">
											<StatusBadge status={agreement.status} />
									</td>
									<td className="px-6 py-4 text-sm text-gray-700">{tierLabel(agreement.selected_tier)}</td>
									<td className="px-6 py-4 text-sm text-gray-700">{formatDate(agreement.createdAt)}</td>
									<td className="px-6 py-4">
										<div className="flex flex-wrap items-center gap-3">
											<button
												type="button"
												onClick={() => openAgreementDetail(agreement.id)}
												className="text-sm font-medium text-gray-700 hover:text-gray-900"
											>
												View
											</button>
											<button
												type="button"
												onClick={() => openClientAgreement(agreement.id)}
												className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
											>
												Client Agreement
											</button>
											<button
												type="button"
												onClick={() => void handleCopyLink(agreement)}
												disabled={!canCopyLink(agreement)}
												className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-gray-400"
											>
												Copy Link
											</button>
											<button
												type="button"
												onClick={handleSendViaEmail}
												className="text-sm font-medium text-gray-600 hover:text-gray-800"
											>
												Send via Email
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<CreateAgreementModal
				isOpen={isCreateModalOpen}
				onClose={() => setIsCreateModalOpen(false)}
				onSuccess={handleCreateSuccess}
			/>
		</div>
	);
}
