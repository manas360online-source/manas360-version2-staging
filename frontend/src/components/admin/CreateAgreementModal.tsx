import { Building2, Crown, Mail, Phone, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createAdminAgreement, type AdminAgreementTier, type AdminAgreementRecord } from '../../api/admin.api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';

type CreateAgreementModalProps = {
	isOpen: boolean;
	onClose: () => void;
	onSuccess?: (createdAgreement: AdminAgreementRecord) => void;
};

const TIER_PRICING: Record<AdminAgreementTier, number> = {
	startup: 120000,
	growth: 240000,
	enterprise: 480000,
	custom: 0,
};

const TIER_LABELS: Record<AdminAgreementTier, string> = {
	startup: 'Startup',
	growth: 'Growth',
	enterprise: 'Enterprise',
	custom: 'Custom',
};

const tierOptions: AdminAgreementTier[] = ['startup', 'growth', 'enterprise', 'custom'];

const normalizePhone = (value: string): string => value.replace(/[^0-9+]/g, '').trim();

const isValidPhone = (value: string): boolean => {
	const normalized = normalizePhone(value);
	return /^\+?[0-9]{10,15}$/.test(normalized);
};

export default function CreateAgreementModal({ isOpen, onClose, onSuccess }: CreateAgreementModalProps) {
	const [companyLegalName, setCompanyLegalName] = useState('');
	const [signatoryEmail, setSignatoryEmail] = useState('');
	const [signatoryPhone, setSignatoryPhone] = useState('');
	const [selectedTier, setSelectedTier] = useState<AdminAgreementTier>('startup');
	const [employeeCount, setEmployeeCount] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const annualFee = useMemo(() => TIER_PRICING[selectedTier], [selectedTier]);
	const employeeCountValue = Number(employeeCount);
	const hasValidEmployeeCount = Number.isInteger(employeeCountValue) && employeeCountValue > 0;
	const perEmployeeRate = useMemo(() => {
		if (!Number.isFinite(employeeCountValue) || employeeCountValue <= 0) {
			return 0;
		}

		return Math.round(annualFee / employeeCountValue);
	}, [annualFee, employeeCountValue]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		setError(null);
	}, [isOpen]);

	const resetForm = () => {
		setCompanyLegalName('');
		setSignatoryEmail('');
		setSignatoryPhone('');
		setSelectedTier('startup');
		setEmployeeCount('');
		setError(null);
	};

	const handleClose = () => {
		if (submitting) {
			return;
		}

		resetForm();
		onClose();
	};

	const validate = (): string | null => {
		if (!companyLegalName.trim()) return 'Company legal name is required.';
		if (!signatoryEmail.trim()) return 'Signatory email is required.';
		if (!/^\S+@\S+\.\S+$/.test(signatoryEmail.trim())) return 'Enter a valid signatory email.';
		if (!signatoryPhone.trim()) return 'Signatory phone is required.';
		if (!isValidPhone(signatoryPhone)) return 'Enter a valid phone number with 10 to 15 digits.';
		if (!tierOptions.includes(selectedTier)) return 'Select a valid tier.';
		if (!employeeCount.trim()) return 'Employee count is required.';

		const parsedEmployeeCount = Number(employeeCount);
		if (!Number.isInteger(parsedEmployeeCount) || parsedEmployeeCount <= 0) {
			return 'Employee count must be a positive whole number.';
		}

		return null;
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const validationError = validate();
		if (validationError) {
			setError(validationError);
			return;
		}

		setSubmitting(true);
		setError(null);

		try {
			const payload = {
				company_legal_name: companyLegalName.trim(),
				signatory_email: signatoryEmail.trim(),
				signatory_phone: normalizePhone(signatoryPhone),
				selected_tier: selectedTier,
				employee_count: Number(employeeCount),
				annual_fee: annualFee,
				per_employee_rate: perEmployeeRate,
			};

			const response = await createAdminAgreement(payload);
			const createdAgreement = response?.data;
			if (!createdAgreement) {
				throw new Error('Agreement creation succeeded but no record was returned.');
			}

			onSuccess?.(createdAgreement);
			resetForm();
			onClose();
		} catch (submissionError: any) {
			setError(submissionError?.response?.data?.message || submissionError?.message || 'Failed to create agreement.');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={handleClose} title="Create Agreement" size="lg">
			<form className="space-y-5" onSubmit={handleSubmit}>
				<div className="rounded-2xl border border-calm-sage/20 bg-calm-sage/5 p-4">
					<div className="mb-4 flex items-center gap-2">
						<Building2 size={18} className="text-calm-sage" />
						<h3 className="text-sm font-semibold uppercase tracking-wide text-wellness-muted">Company Details</h3>
					</div>
					<Input
						id="company_legal_name"
						label="Company Legal Name"
						value={companyLegalName}
						onChange={(e) => setCompanyLegalName(e.target.value)}
						disabled={submitting}
						required
					/>
				</div>

				<div className="rounded-2xl border border-calm-sage/20 bg-white p-4">
					<div className="mb-4 flex items-center gap-2">
						<Mail size={18} className="text-calm-sage" />
						<h3 className="text-sm font-semibold uppercase tracking-wide text-wellness-muted">Signatory Details</h3>
					</div>
					<div className="grid gap-5 md:grid-cols-2">
						<Input
							id="signatory_email"
							label="Signatory Email"
							type="email"
							value={signatoryEmail}
							onChange={(e) => setSignatoryEmail(e.target.value)}
							disabled={submitting}
							required
						/>
						<div className="relative">
							<Phone size={16} className="pointer-events-none absolute right-4 top-[42px] text-wellness-muted" />
							<Input
								id="signatory_phone"
								label="Signatory Phone"
								type="tel"
								value={signatoryPhone}
								onChange={(e) => setSignatoryPhone(e.target.value)}
								disabled={submitting}
								required
							/>
						</div>
					</div>
				</div>

				<div className="rounded-2xl border border-calm-sage/20 bg-white p-4">
					<div className="mb-4 flex items-center gap-2">
						<Crown size={18} className="text-calm-sage" />
						<h3 className="text-sm font-semibold uppercase tracking-wide text-wellness-muted">Plan Selection</h3>
					</div>
					<div className="grid gap-5 md:grid-cols-2">
						<div>
							<label htmlFor="selected_tier" className="mb-2 block text-sm font-medium text-wellness-text">
								Selected Tier
							</label>
							<select
								id="selected_tier"
								value={selectedTier}
								onChange={(e) => setSelectedTier(e.target.value as AdminAgreementTier)}
								disabled={submitting}
								className="w-full rounded-2xl border-2 border-calm-sage/30 bg-white px-5 py-3 text-wellness-text focus:border-calm-sage focus:outline-none focus:ring-2 focus:ring-calm-sage/20"
								required
							>
								{tierOptions.map((tier) => (
									<option key={tier} value={tier}>
										{TIER_LABELS[tier]}
									</option>
								))}
							</select>
						</div>
						<div className="relative">
							<Users size={16} className="pointer-events-none absolute right-4 top-[42px] text-wellness-muted" />
							<Input
								id="employee_count"
								label="Employee Count"
								type="number"
								min="1"
								step="1"
								value={employeeCount}
								onChange={(e) => setEmployeeCount(e.target.value)}
								disabled={submitting}
								required
								helperText="Used to auto-calculate per-employee pricing."
							/>
						</div>
					</div>
				</div>

				<div className="rounded-2xl border border-calm-sage/20 bg-calm-sage/5 p-4">
					<div className="mb-4 flex items-center justify-between gap-3">
						<h3 className="text-sm font-semibold uppercase tracking-wide text-wellness-muted">Pricing Summary</h3>
						<span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-wellness-text">
							{TIER_LABELS[selectedTier]} Plan
						</span>
					</div>
					<div className="grid gap-4 md:grid-cols-2">
						<div className="rounded-xl border border-calm-sage/20 bg-white p-4">
							<p className="text-sm text-wellness-muted">Annual Fee</p>
							<p className="mt-1 text-2xl font-semibold text-wellness-text">INR {annualFee.toLocaleString('en-IN')}</p>
						</div>
						<div className="rounded-xl border border-calm-sage/20 bg-white p-4">
							<p className="text-sm text-wellness-muted">Per Employee Rate</p>
							<p className="mt-1 text-2xl font-semibold text-wellness-text">INR {perEmployeeRate.toLocaleString('en-IN')}</p>
						</div>
					</div>
					<p className="mt-3 text-xs text-wellness-muted">
						{hasValidEmployeeCount
							? `Calculated using ${employeeCountValue.toLocaleString('en-IN')} employees.`
							: 'Enter employee count to get per-employee pricing.'}
					</p>
				</div>

				{error ? (
					<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
						{error}
					</div>
				) : null}

				<div className="flex items-center justify-end gap-3 border-t border-calm-sage/15 pt-3">
					<Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>
						Cancel
					</Button>
					<Button type="submit" loading={submitting} disabled={submitting}>
						Create Agreement
					</Button>
				</div>
			</form>
		</Modal>
	);
}