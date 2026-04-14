import { Download, ExternalLink, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { approveAdminAgreement, getAdminAgreementById, rejectAdminAgreement, type AdminAgreementDetail } from '../../api/admin.api';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

const AGREEMENT_STATUS_FLOW = ['draft', 'sent', 'client_reviewing', 'signed_uploaded', 'active'] as const;
const AGREEMENTS_QUERY_KEY = ['admin-agreements'] as const;

const formatDateTime = (value?: string): string => {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return new Intl.DateTimeFormat('en-IN', {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(date);
};

const formatCurrency = (value?: number, currency = 'INR'): string => {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		return '—';
	}

	try {
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency,
			maximumFractionDigits: 0,
		}).format(value);
	} catch {
		return `${currency} ${value.toLocaleString('en-IN')}`;
	}
};

const optionValue = (value: unknown): string => {
	if (value == null) return '—';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (Array.isArray(value)) return value.map((item) => optionValue(item)).join(', ');
	return JSON.stringify(value);
};

export default function AgreementDetailPage() {
	const { agreementId } = useParams<{ agreementId: string }>();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
	const [rejectReason, setRejectReason] = useState('');
	const [rejectReasonError, setRejectReasonError] = useState<string | null>(null);

	const agreementQuery = useQuery<AdminAgreementDetail | null>({
		queryKey: ['admin-agreement', agreementId],
		enabled: Boolean(agreementId),
		queryFn: async () => {
			if (!agreementId) {
				return null;
			}

			const response = await getAdminAgreementById(agreementId);
			return response?.data ?? null;
		},
		staleTime: 30_000,
		refetchOnWindowFocus: false,
		retry: 1,
	});

	const approveMutation = useMutation({
		mutationFn: async () => {
			if (!agreementId) throw new Error('Agreement id is missing.');
			return approveAdminAgreement(agreementId);
		},
		onSuccess: () => {
			toast.success('Agreement approved successfully');
			void queryClient.invalidateQueries({ queryKey: AGREEMENTS_QUERY_KEY });
			void queryClient.invalidateQueries({ queryKey: ['admin-agreement', agreementId] });
		},
		onError: (approveError: any) => {
			toast.error(approveError?.response?.data?.message || approveError?.message || 'Failed to approve agreement');
		},
	});

	const rejectMutation = useMutation({
		mutationFn: async (reason: string) => {
			if (!agreementId) throw new Error('Agreement id is missing.');
			return rejectAdminAgreement(agreementId, reason);
		},
		onSuccess: () => {
			toast.success('Agreement rejected successfully');
			setIsRejectModalOpen(false);
			void queryClient.invalidateQueries({ queryKey: AGREEMENTS_QUERY_KEY });
			void queryClient.invalidateQueries({ queryKey: ['admin-agreement', agreementId] });
		},
		onError: (rejectError: any) => {
			toast.error(rejectError?.response?.data?.message || rejectError?.message || 'Failed to reject agreement');
		},
	});

	const agreement = agreementQuery.data ?? null;
	const loading = agreementQuery.isLoading;
	const error = !agreementId
		? 'Agreement id is missing.'
		: agreementQuery.error
			? ((agreementQuery.error as any)?.response?.data?.message || (agreementQuery.error as any)?.message || 'Unable to load agreement details.')
			: null;
	const actionLoading = approveMutation.isLoading || rejectMutation.isLoading;

	const companyDetails = useMemo(() => ({
		legalName: agreement?.company_details?.legal_name || agreement?.company_legal_name || '—',
		displayName: agreement?.company_details?.display_name || agreement?.company_legal_name || '—',
		companyKey: agreement?.company_details?.company_key || '—',
		contactEmail: agreement?.company_details?.contact_email || agreement?.signatory_email || '—',
		contactPhone: agreement?.company_details?.contact_phone || agreement?.signatory_phone || '—',
		address: agreement?.company_details?.address || '—',
		industry: agreement?.company_details?.industry || '—',
	}), [agreement]);

	const pricingInfo = useMemo(() => ({
		annualFee: agreement?.pricing_info?.annual_fee ?? agreement?.annual_fee,
		perEmployeeRate: agreement?.pricing_info?.per_employee_rate ?? agreement?.per_employee_rate,
		currency: agreement?.pricing_info?.currency || 'INR',
	}), [agreement]);

	const signedDocumentUrl = agreement?.signed_document_url || null;
	const normalizedStatus = String(agreement?.status || 'draft').toLowerCase();
	const currentStatusIndex = AGREEMENT_STATUS_FLOW.indexOf(normalizedStatus as (typeof AGREEMENT_STATUS_FLOW)[number]);
	const canApprove = normalizedStatus === 'signed_uploaded';

	const handlePreviewDocument = () => {
		if (!signedDocumentUrl) {
			toast.error('Signed document file is not available.');
			return;
		}

		window.open(signedDocumentUrl, '_blank', 'noopener,noreferrer');
	};

	const handleDownloadDocument = () => {
		if (!signedDocumentUrl) {
			toast.error('Signed document file is not available.');
			return;
		}

		const link = document.createElement('a');
		link.href = signedDocumentUrl;
		link.target = '_blank';
		link.rel = 'noopener noreferrer';
		link.download = '';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const handleApprove = async () => {
		if (!canApprove) {
			toast.error('Approve is available only when status is Signed Uploaded.');
			return;
		}

		await approveMutation.mutateAsync();
	};

	const openRejectModal = () => {
		setRejectReason('');
		setRejectReasonError(null);
		setIsRejectModalOpen(true);
	};

	const handleReject = async () => {
		const trimmedReason = rejectReason.trim();
		if (trimmedReason.length < 3) {
			setRejectReasonError('Please enter a rejection reason (at least 3 characters).');
			return;
		}

		setRejectReasonError(null);
		await rejectMutation.mutateAsync(trimmedReason);
	};

	return (
		<div className="p-6">
			<div className="mb-6 flex items-center justify-between gap-4">
				<div>
					<button type="button" onClick={() => navigate('/admin/operations/agreements')} className="text-sm font-medium text-blue-600 hover:text-blue-700">
						Back to agreements
					</button>
					<h1 className="mt-2 text-2xl font-bold text-gray-900">Agreement Details</h1>
					<p className="mt-1 text-gray-600">Review company details, pricing, selected options, and document status.</p>
					{agreementId ? (
						<button
							type="button"
							onClick={() => navigate(`/admin/operations/agreements/${encodeURIComponent(agreementId)}/client`)}
							className="mt-3 inline-flex rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
						>
							Open Client Agreement
						</button>
					) : null}
				</div>
				<button
					type="button"
					onClick={() => void agreementQuery.refetch()}
					className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					disabled={loading || actionLoading || agreementQuery.isFetching}
				>
					<RefreshCw size={16} />
					{agreementQuery.isFetching ? 'Refreshing...' : 'Refresh'}
				</button>
			</div>

			{loading ? (
				<div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center text-gray-600">
					Loading agreement details...
				</div>
			) : error ? (
				<div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					{error}
				</div>
			) : agreement ? (
				<div className="space-y-6">
					<div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
						<div className="font-medium">Status flow</div>
						<div className="mt-1">{AGREEMENT_STATUS_FLOW.join(' → ')}</div>
						<div className="mt-2">Current stage: <span className="font-semibold">{normalizedStatus.replace(/_/g, ' ')}</span></div>
					</div>

					<div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
						<div className="flex flex-wrap items-center justify-end gap-3">
							<Button type="button" variant="secondary" onClick={openRejectModal} disabled={actionLoading}>
								Reject
							</Button>
							<Button
								type="button"
								onClick={handleApprove}
								loading={approveMutation.isLoading}
								disabled={actionLoading || !canApprove}
							>
								Approve
							</Button>
							{!canApprove ? (
								<p className="w-full text-right text-xs text-gray-500">Approve is enabled only at signed_uploaded.</p>
							) : null}
						</div>
					</div>

					<div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
						<div className="mb-4 flex flex-wrap items-start justify-between gap-4">
							<div>
								<p className="text-sm font-medium uppercase tracking-wide text-gray-500">Agreement</p>
								<h2 className="mt-1 text-xl font-semibold text-gray-900">{agreement.agreement_number || agreement.id}</h2>
							</div>
							<StatusBadge status={agreement.status} />
						</div>

						<div className="mb-5 flex flex-wrap items-center gap-2">
							{AGREEMENT_STATUS_FLOW.map((status, index) => (
								<span
									key={status}
									className={`rounded-full px-2.5 py-1 text-xs font-medium ${
										(index <= (currentStatusIndex >= 0 ? currentStatusIndex : 0))
											? 'bg-blue-100 text-blue-800'
											: 'bg-gray-100 text-gray-500'
									}`}
								>
									{status.replace(/_/g, ' ')}
								</span>
							))}
						</div>

						<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
							<div>
								<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Company Legal Name</p>
								<p className="mt-1 text-sm text-gray-900">{companyDetails.legalName}</p>
							</div>
							<div>
								<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Company Key</p>
								<p className="mt-1 text-sm text-gray-900">{companyDetails.companyKey}</p>
							</div>
							<div>
								<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Signatory Email</p>
								<p className="mt-1 text-sm text-gray-900">{companyDetails.contactEmail}</p>
							</div>
							<div>
								<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Signatory Phone</p>
								<p className="mt-1 text-sm text-gray-900">{companyDetails.contactPhone}</p>
							</div>
							<div>
								<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Industry</p>
								<p className="mt-1 text-sm text-gray-900">{companyDetails.industry}</p>
							</div>
							<div>
								<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Address</p>
								<p className="mt-1 text-sm text-gray-900">{companyDetails.address}</p>
							</div>
							<div>
								<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Created At</p>
								<p className="mt-1 text-sm text-gray-900">{formatDateTime(agreement.createdAt)}</p>
							</div>
							<div>
								<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Updated At</p>
								<p className="mt-1 text-sm text-gray-900">{formatDateTime(agreement.updatedAt)}</p>
							</div>
						</div>
					</div>

					<div className="grid gap-6 xl:grid-cols-2">
						<div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
							<h3 className="text-lg font-semibold text-gray-900">Pricing Info</h3>
							<div className="mt-4 grid gap-4 sm:grid-cols-2">
								<div>
									<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Annual Fee</p>
									<p className="mt-1 text-base font-medium text-gray-900">{formatCurrency(pricingInfo.annualFee, pricingInfo.currency)}</p>
								</div>
								<div>
									<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Per Employee Rate</p>
									<p className="mt-1 text-base font-medium text-gray-900">{formatCurrency(pricingInfo.perEmployeeRate, pricingInfo.currency)}</p>
								</div>
								<div>
									<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Selected Tier</p>
									<p className="mt-1 text-base font-medium text-gray-900">{agreement.selected_tier || '—'}</p>
								</div>
								<div>
									<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Employee Count</p>
									<p className="mt-1 text-base font-medium text-gray-900">{agreement.employee_count ?? '—'}</p>
								</div>
							</div>
						</div>

						<div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
							<h3 className="text-lg font-semibold text-gray-900">Selected Options</h3>
							<div className="mt-4 space-y-3">
								{agreement.selected_options && Object.keys(agreement.selected_options).length > 0 ? (
									Object.entries(agreement.selected_options).map(([key, value]) => (
										<div key={key} className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 px-4 py-3">
											<p className="text-sm font-medium text-gray-700">{key.replace(/_/g, ' ')}</p>
											<p className="text-sm text-gray-900">{optionValue(value)}</p>
										</div>
									))
								) : (
									<p className="text-sm text-gray-500">No selected options available.</p>
								)}
							</div>
						</div>
					</div>

					<div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
						<h3 className="text-lg font-semibold text-gray-900">Signed Document</h3>
						{signedDocumentUrl ? (
							<div className="mt-4 flex flex-wrap items-center gap-3">
								<Button type="button" variant="secondary" onClick={handlePreviewDocument}>
									<ExternalLink size={16} className="mr-2" />
									View PDF
								</Button>
								<Button type="button" variant="ghost" onClick={handleDownloadDocument}>
									<Download size={16} className="mr-2" />
									Download
								</Button>
							</div>
						) : (
							<div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
								Signed document file is missing or not uploaded yet.
							</div>
						)}
					</div>
				</div>
			) : null}

			<Modal
				isOpen={isRejectModalOpen}
				onClose={() => {
					if (rejectMutation.isLoading) return;
					setIsRejectModalOpen(false);
				}}
				title="Reject Agreement"
				size="md"
			>
				<div className="space-y-4">
					<p className="text-sm text-gray-600">Please provide a reason for rejecting this agreement.</p>
					<div>
						<label htmlFor="reject-reason" className="mb-2 block text-sm font-medium text-gray-700">Reason</label>
						<textarea
							id="reject-reason"
							value={rejectReason}
							onChange={(event) => setRejectReason(event.target.value)}
							rows={4}
							disabled={rejectMutation.isLoading}
							className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
							placeholder="Enter rejection reason"
						/>
						{rejectReasonError ? <p className="mt-2 text-sm text-red-600">{rejectReasonError}</p> : null}
					</div>
					<div className="flex items-center justify-end gap-3">
						<Button
							type="button"
							variant="ghost"
							onClick={() => setIsRejectModalOpen(false)}
							disabled={rejectMutation.isLoading}
						>
							Cancel
						</Button>
						<Button type="button" variant="secondary" onClick={handleReject} loading={rejectMutation.isLoading}>
							Reject Agreement
						</Button>
					</div>
				</div>
			</Modal>
		</div>
	);
}
