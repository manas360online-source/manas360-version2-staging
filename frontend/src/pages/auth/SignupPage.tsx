import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getApiErrorMessage, signupWithPhone, verifyPhoneSignupOtp } from '../../api/auth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth, getPostLoginRoute } from '../../context/AuthContext';

type SignupRole = 'patient' | 'therapist' | 'psychiatrist' | 'psychologist' | 'coach';
type ProviderAgreementKey = 'THERAPIST_IC_AGREEMENT' | 'THERAPIST_NDA' | 'THERAPIST_DATA_PROCESSING_AGREEMENT';

const PROVIDER_AGREEMENTS: Array<{ key: ProviderAgreementKey; label: string; sections: string[] }> = [
	{
		key: 'THERAPIST_IC_AGREEMENT',
		label: 'Therapist IC Agreement',
		sections: [
			'This Independent Contractor Agreement defines your professional relationship with MANAS360 as a non-employee provider.',
			'You confirm your licenses, registrations, and qualifications are valid and must be maintained without interruption.',
			'You are solely responsible for clinical decisions, patient safety, and professional standards during every session.',
			'Platform policies require on-platform communication, documentation, and billing for all assigned patients.',
			'Payment terms, payout timelines, and deductions are governed by current provider commercial policy.',
			'Any misleading profile details, credential mismatch, or repeated policy breaches may lead to immediate suspension.',
			'You agree to cooperate in audits, quality reviews, and incident reporting obligations mandated by law.',
			'This agreement survives account status changes for clauses related to confidentiality, records, and disputes.',
		],
	},
	{
		key: 'THERAPIST_NDA',
		label: 'Therapist NDA',
		sections: [
			'All patient information, clinical notes, internal processes, and business data are confidential information.',
			'You must not disclose sensitive platform, patient, or operational details to any unauthorized person.',
			'Access to data is permitted strictly for service delivery and legal compliance purposes only.',
			'Data export, screenshots, offline storage, or personal device transfers are prohibited unless explicitly authorized.',
			'Any breach, suspected breach, or accidental disclosure must be reported immediately to compliance operations.',
			'Confidentiality obligations continue even after your association with the platform ends.',
			'Regulatory obligations under Indian privacy and healthcare standards remain fully applicable.',
			'Violation of NDA obligations may trigger legal action, access termination, and financial liability.',
		],
	},
	{
		key: 'THERAPIST_DATA_PROCESSING_AGREEMENT',
		label: 'Therapist Data Processing Agreement',
		sections: [
			'You process personal and health data only for authorized clinical workflows and minimum necessary usage.',
			'Data access must follow role-based controls, secure authentication, and approved platform workflows.',
			'You must avoid storing patient data in personal tools, chat apps, or third-party systems without approval.',
			'Patient rights requests, corrections, and deletion requests must be routed through official compliance channels.',
			'Incident response timelines apply for any security events, unauthorized access, or data handling violations.',
			'Cross-border transfer, analytics reuse, or secondary use of data requires explicit policy approval.',
			'You agree to follow retention, deletion, and archival policies defined by MANAS360 and applicable law.',
			'Failure to comply with data processing obligations may lead to suspension and legal/regulatory consequences.',
		],
	},
];

const PATIENT_TERMS_SECTIONS: string[] = [
	'You are registering for MANAS360 services and agree to use the platform for lawful wellness and care purposes only.',
	'You confirm all information submitted during registration is accurate and belongs to you.',
	'Your personal and health-related information will be processed under the platform Privacy Policy and applicable law.',
	'Session booking, cancellation, and refund handling follow the published platform Refund and Cancellation Policy.',
	'The platform may maintain logs and records for safety, support, billing, and compliance operations.',
	'Medical advice is provided by licensed professionals; emergency situations require immediate local emergency support.',
	'By accepting, you confirm that you have read and understood the Terms of Service, Privacy Policy, and Refund Policy.',
];

export default function SignupPage() {
	const { checkAuth } = useAuth();
	const navigate = useNavigate();

	const [name, setName] = useState('');
	const [phone, setPhone] = useState('');
	const [role, setRole] = useState<SignupRole>('patient');
	const [otp, setOtp] = useState('');
	const [otpSent, setOtpSent] = useState(false);
	const [devOtp, setDevOtp] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [acceptedTerms, setAcceptedTerms] = useState(false);
	const [aadhaar, setAadhaar] = useState('');
	const [otpForAadhaar, setOtpForAadhaar] = useState('');
	const [isAadhaarVerified, setIsAadhaarVerified] = useState(false);
	const [isAadhaarOtpSent, setIsAadhaarOtpSent] = useState(false);
	const [isAadhaarOtpLoading, setIsAadhaarOtpLoading] = useState(false);
	const [maskedAadhaar, setMaskedAadhaar] = useState('');
	const [generatedAadhaarOtp, setGeneratedAadhaarOtp] = useState('');
	const [providerAgreementsAccepted, setProviderAgreementsAccepted] = useState<Record<ProviderAgreementKey, boolean>>({
		THERAPIST_IC_AGREEMENT: false,
		THERAPIST_NDA: false,
		THERAPIST_DATA_PROCESSING_AGREEMENT: false,
	});
	const [showPatientTermsModal, setShowPatientTermsModal] = useState(false);
	const [canAcceptPatientTerms, setCanAcceptPatientTerms] = useState(false);
	const [activeAgreement, setActiveAgreement] = useState<ProviderAgreementKey | null>(null);
	const [canAcceptActiveAgreement, setCanAcceptActiveAgreement] = useState(false);
	const agreementScrollRef = useRef<HTMLDivElement | null>(null);
	const patientTermsScrollRef = useRef<HTMLDivElement | null>(null);

	const isProviderFlow = role !== 'patient';
	const allProviderAgreementsAccepted = useMemo(
		() => Object.values(providerAgreementsAccepted).every(Boolean),
		[providerAgreementsAccepted],
	);

	const activeAgreementConfig = useMemo(
		() => PROVIDER_AGREEMENTS.find((agreement) => agreement.key === activeAgreement) ?? null,
		[activeAgreement],
	);

	useEffect(() => {
		if (!isProviderFlow) {
			setAadhaar('');
			setOtpForAadhaar('');
			setIsAadhaarVerified(false);
			setIsAadhaarOtpSent(false);
			setIsAadhaarOtpLoading(false);
			setMaskedAadhaar('');
			setGeneratedAadhaarOtp('');
			setProviderAgreementsAccepted({
				THERAPIST_IC_AGREEMENT: false,
				THERAPIST_NDA: false,
				THERAPIST_DATA_PROCESSING_AGREEMENT: false,
			});
			setActiveAgreement(null);
			setCanAcceptActiveAgreement(false);
		}
	}, [isProviderFlow]);

	useEffect(() => {
		if (!showPatientTermsModal) return;
		const container = patientTermsScrollRef.current;
		if (!container) return;
		container.scrollTop = 0;
		setCanAcceptPatientTerms(false);
	}, [showPatientTermsModal]);

	const openAgreement = (key: ProviderAgreementKey) => {
		setActiveAgreement(key);
		setCanAcceptActiveAgreement(Boolean(providerAgreementsAccepted[key]));
	};

	useEffect(() => {
		if (!activeAgreement) return;
		const container = agreementScrollRef.current;
		if (!container) return;
		container.scrollTop = 0;
		const scrollAvailable = container.scrollHeight > container.clientHeight + 2;
		if (!scrollAvailable) {
			setCanAcceptActiveAgreement(true);
		}
	}, [activeAgreement]);

	const handleAgreementScroll = () => {
		const container = agreementScrollRef.current;
		if (!container) return;
		const reachedBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 8;
		if (reachedBottom) {
			setCanAcceptActiveAgreement(true);
		}
	};

	const acceptActiveAgreement = () => {
		if (!activeAgreement || !canAcceptActiveAgreement) return;
		setProviderAgreementsAccepted((prev) => ({ ...prev, [activeAgreement]: true }));
		setActiveAgreement(null);
	};

	const openPatientTermsModal = () => {
		setShowPatientTermsModal(true);
	};

	const handlePatientTermsScroll = () => {
		const container = patientTermsScrollRef.current;
		if (!container) return;
		const reachedBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 8;
		if (reachedBottom) {
			setCanAcceptPatientTerms(true);
		}
	};

	const acceptPatientTermsFromModal = () => {
		if (!canAcceptPatientTerms) return;
		setAcceptedTerms(true);
		setShowPatientTermsModal(false);
	};

	const maskAadhaar = (value: string): string => {
		const digits = value.replace(/\D/g, '').slice(0, 12);
		if (digits.length < 4) return '**** **** ****';
		return `**** **** ${digits.slice(-4)}`;
	};

	const sendAadhaarOtp = () => {
		if (!isProviderFlow) return;
		const digits = aadhaar.replace(/\D/g, '').slice(0, 12);
		if (digits.length !== 12) {
			setError('Please enter a valid 12-digit Aadhaar number.');
			return;
		}

		setIsAadhaarOtpLoading(true);
		setError(null);
		const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
		setGeneratedAadhaarOtp(mockOtp);
		setIsAadhaarVerified(false);
		setIsAadhaarOtpSent(true);
		setOtpForAadhaar('');
		setTimeout(() => {
			setIsAadhaarOtpLoading(false);
			// TODO: Replace this mock OTP flow with a real Aadhaar eKYC provider integration.
			console.log('Mock Aadhaar OTP:', mockOtp);
		}, 400);
	};

	const verifyAadhaarOtp = () => {
		if (!isProviderFlow) return;
		if (!isAadhaarOtpSent) {
			setError('Please send Aadhaar OTP first.');
			return;
		}

		const enteredOtp = otpForAadhaar.replace(/\D/g, '').slice(0, 6);
		if (enteredOtp.length !== 6) {
			setError('Please enter a valid 6-digit Aadhaar OTP.');
			return;
		}

		if (enteredOtp !== generatedAadhaarOtp) {
			setIsAadhaarVerified(false);
			setError('Invalid Aadhaar OTP.');
			return;
		}

		setError(null);
		setIsAadhaarVerified(true);
		setMaskedAadhaar(maskAadhaar(aadhaar));
		setAadhaar('');
	};

	const requestOtp = async () => {
		if (!isProviderFlow && !acceptedTerms) {
			setError('Please accept Terms & Conditions to continue.');
			return;
		}

		if (isProviderFlow && !isAadhaarVerified) {
			setError('Please complete Aadhaar verification to continue.');
			return;
		}

		if (isProviderFlow && !allProviderAgreementsAccepted) {
			setError('Please read and accept all provider legal agreements to continue.');
			return;
		}

		setError(null);
		setLoading(true);
		setDevOtp(null);
		try {
			const result = await signupWithPhone(phone.trim(), { name: name.trim(), role });
			setOtpSent(true);
			setDevOtp(result.devOtp || null);
		} catch (err) {
			setError(getApiErrorMessage(err, 'Failed to send OTP'));
		} finally {
			setLoading(false);
		}
	};

	const location = useLocation();

	const resolveReturnTo = (): string => {
		const qp = new URLSearchParams(location.search);
		return qp.get('returnTo') || qp.get('next') || window.location.pathname || '/';
	};

	const verifyOtp = async () => {
		const acceptedDocuments = [
			...(isProviderFlow && providerAgreementsAccepted.THERAPIST_IC_AGREEMENT ? ['THERAPIST_IC_AGREEMENT'] : []),
			...(isProviderFlow && providerAgreementsAccepted.THERAPIST_NDA ? ['THERAPIST_NDA'] : []),
			...(isProviderFlow && providerAgreementsAccepted.THERAPIST_DATA_PROCESSING_AGREEMENT ? ['THERAPIST_DATA_PROCESSING_AGREEMENT'] : []),
		];

		setError(null);
		setLoading(true);
		try {
			const result = await verifyPhoneSignupOtp(phone.trim(), otp.trim(), {
				acceptedTerms: isProviderFlow ? allProviderAgreementsAccepted : acceptedTerms,
				acceptedDocuments,
			});
			await checkAuth({ force: true });
			// If backend indicates patient requires a subscription, send to plans page
			if ((result.user as any)?.requiresSubscription) {
				const returnTo = resolveReturnTo();
				navigate(`/plans?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
				return;
			}
			const postLoginRoute = getPostLoginRoute(result.user);
			navigate(postLoginRoute, { replace: true });
		} catch (err) {
			setError(getApiErrorMessage(err, 'OTP verification failed'));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="responsive-page">
			<div className="responsive-container py-6 sm:py-10">
				<div className="mx-auto w-full max-w-lg rounded-3xl border border-calm-sage/20 bg-wellness-surface p-5 shadow-soft-md sm:p-8">
					<div className="mb-3">
						<Link to="/" className="text-sm text-calm-sage underline underline-offset-2 hover:text-wellness-text">
							Back to Home
						</Link>
					</div>
					<h1 className="text-2xl font-semibold text-wellness-text sm:text-3xl">Create your account</h1>
					<p className="mt-2 text-sm text-wellness-muted sm:text-base">Register using phone number and OTP.</p>

					<div className="mt-6 space-y-4">
						<Input
							id="signup-name"
							label="Full Name"
							autoComplete="name"
							placeholder="Your full name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							required
						/>
						<Input
							id="signup-phone"
							label="Phone Number"
							type="tel"
							autoComplete="tel"
							placeholder="+919876543210"
							value={phone}
							onChange={(event) => setPhone(event.target.value)}
							required
						/>

						<div>
							<label htmlFor="signup-role" className="mb-2 block text-sm font-medium text-wellness-text">Role</label>
							<select
								id="signup-role"
								value={role}
								onChange={(event) => setRole(event.target.value as SignupRole)}
								className="w-full rounded-2xl border-2 border-calm-sage/30 bg-white px-5 py-3 text-wellness-text transition-smooth focus:border-calm-sage focus:outline-none focus:ring-2 focus:ring-calm-sage/20"
							>
								<option value="patient">Patient</option>
								<option value="therapist">Therapist</option>
								<option value="psychiatrist">Psychiatrist</option>
								<option value="psychologist">Psychologist</option>
								<option value="coach">Coach</option>
							</select>
						</div>

						{!isProviderFlow ? (
							<label className="flex items-start gap-2 text-sm text-wellness-text">
								<input
									type="checkbox"
									checked={acceptedTerms}
									readOnly
									onClick={(event) => {
										event.preventDefault();
										openPatientTermsModal();
									}}
								/>
								<button type="button" onClick={openPatientTermsModal} className="text-left underline underline-offset-2 text-calm-sage">
									I accept the Terms of Service, Privacy Policy, and Refund &amp; Cancellation Policy.
								</button>
							</label>
						) : null}

						{isProviderFlow ? (
							<div className="rounded-2xl border border-calm-sage/30 bg-white p-4">
								<p className="text-sm font-semibold text-wellness-text">Aadhaar Verification</p>
								<p className="mt-1 text-xs text-wellness-muted">
									Providers must verify Aadhaar before phone OTP registration.
								</p>
								<div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
									<Input
										id="provider-aadhaar"
										label="Aadhaar Number"
										inputMode="numeric"
										maxLength={12}
										placeholder="12-digit Aadhaar"
										value={aadhaar}
										onChange={(event) => setAadhaar(event.target.value.replace(/\D/g, '').slice(0, 12))}
										disabled={isAadhaarVerified || isAadhaarOtpLoading}
										required
									/>
									<Button type="button" onClick={sendAadhaarOtp} loading={isAadhaarOtpLoading} className="min-h-[48px] sm:self-end">
										{isAadhaarOtpLoading ? 'Sending...' : 'Send OTP'}
									</Button>
								</div>

								{isAadhaarOtpSent && !isAadhaarVerified ? (
									<div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
										<Input
											id="provider-aadhaar-otp"
											label="Aadhaar OTP"
											inputMode="numeric"
											pattern="\\d{6}"
											maxLength={6}
											placeholder="6-digit OTP"
											value={otpForAadhaar}
											onChange={(event) => setOtpForAadhaar(event.target.value.replace(/\D/g, '').slice(0, 6))}
											required
										/>
										<Button type="button" onClick={verifyAadhaarOtp} className="min-h-[48px] sm:self-end">
											Verify Aadhaar
										</Button>
									</div>
								) : null}

								{isAadhaarVerified ? (
									<p className="mt-2 text-xs font-medium text-emerald-700">Aadhaar verified: {maskedAadhaar}</p>
								) : null}

								<div className="my-4 h-px bg-calm-sage/20" />
								<p className="text-sm font-semibold text-wellness-text">Provider Legal Agreements</p>
								<p className="mt-1 text-xs text-wellness-muted">
									To register as a provider, read each agreement fully and accept it.
								</p>

								<div className="mt-3 space-y-2 text-sm">
									{PROVIDER_AGREEMENTS.map((agreement) => (
										<div key={agreement.key} className="flex items-center justify-between rounded-xl border border-calm-sage/20 bg-calm-sage/5 px-3 py-2">
											<label
												className="flex cursor-pointer items-center gap-2 text-wellness-text"
												onClick={() => openAgreement(agreement.key)}
											>
												<input
													type="checkbox"
													checked={providerAgreementsAccepted[agreement.key]}
													readOnly
													onClick={(event) => {
														event.preventDefault();
														openAgreement(agreement.key);
													}}
												/>
												<span className="underline underline-offset-2">I agree to the {agreement.label}</span>
											</label>
											<span className="text-xs font-semibold text-calm-sage">
												{providerAgreementsAccepted[agreement.key] ? 'Accepted' : 'Pending'}
											</span>
										</div>
									))}
								</div>
							</div>
						) : null}

						{otpSent ? (
							<Input
								id="signup-otp"
								label="OTP"
								inputMode="numeric"
								pattern="\\d{6}"
								maxLength={6}
								autoComplete="one-time-code"
								placeholder="6-digit OTP"
								value={otp}
								onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
								required
							/>
						) : null}

						{!otpSent ? (
							<Button type="button" fullWidth loading={loading} className="min-h-[48px]" onClick={requestOtp}>
								{loading ? 'Sending OTP...' : 'Send OTP'}
							</Button>
						) : (
							<Button type="button" fullWidth loading={loading} className="min-h-[48px]" onClick={verifyOtp}>
								{loading ? 'Verifying OTP...' : 'Verify OTP and Register'}
							</Button>
						)}
					</div>

					{activeAgreementConfig ? (
						<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
							<div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
								<div className="mb-3 flex items-center justify-between">
									<h2 className="text-lg font-semibold text-wellness-text">{activeAgreementConfig.label}</h2>
									<button
										type="button"
										onClick={() => setActiveAgreement(null)}
										className="rounded-md border border-slate-300 px-2 py-1 text-xs"
									>
										Close
									</button>
								</div>

								<p className="mb-2 text-xs text-wellness-muted">
									Read completely and scroll to the bottom to enable acceptance.
								</p>

								<div
									ref={agreementScrollRef}
									onScroll={handleAgreementScroll}
									className="max-h-80 overflow-y-auto rounded-lg border border-slate-200 p-4 text-sm leading-6 text-slate-700"
								>
									{activeAgreementConfig.sections.map((section, idx) => (
										<p key={`${activeAgreementConfig.key}-${idx}`} className="mb-3 last:mb-0">{idx + 1}. {section}</p>
									))}
								</div>

								<div className="mt-4 flex justify-end gap-2">
									<button
										type="button"
										onClick={() => setActiveAgreement(null)}
										className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
									>
										Cancel
									</button>
									<button
										type="button"
										onClick={acceptActiveAgreement}
										disabled={!canAcceptActiveAgreement}
										className="rounded-lg bg-calm-sage px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
									>
										I have read and agree
									</button>
								</div>
							</div>
						</div>
					) : null}

					{showPatientTermsModal ? (
						<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
							<div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
								<div className="mb-3 flex items-center justify-between">
									<h2 className="text-lg font-semibold text-wellness-text">Patient Terms & Conditions</h2>
									<button
										type="button"
										onClick={() => setShowPatientTermsModal(false)}
										className="rounded-md border border-slate-300 px-2 py-1 text-xs"
									>
										Close
									</button>
								</div>

								<p className="mb-2 text-xs text-wellness-muted">
									Read completely and scroll to the bottom to enable acceptance.
								</p>

								<div
									ref={patientTermsScrollRef}
									onScroll={handlePatientTermsScroll}
									className="max-h-80 overflow-y-auto rounded-lg border border-slate-200 p-4 text-sm leading-6 text-slate-700"
								>
									{PATIENT_TERMS_SECTIONS.map((section, idx) => (
										<p key={`patient-terms-${idx}`} className="mb-3 last:mb-0">{idx + 1}. {section}</p>
									))}
								</div>

								<div className="mt-4 flex justify-end gap-2">
									<button
										type="button"
										onClick={() => setShowPatientTermsModal(false)}
										className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
									>
										Cancel
									</button>
									<button
										type="button"
										onClick={acceptPatientTermsFromModal}
										disabled={!canAcceptPatientTerms}
										className="rounded-lg bg-calm-sage px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
									>
										I have read and agree
									</button>
								</div>
							</div>
						</div>
					) : null}

					{devOtp ? (
						<p className="mt-3 text-xs text-wellness-muted">
							Development OTP: <span className="font-semibold text-wellness-text">{devOtp}</span>
						</p>
					) : null}

					{error ? (
						<p role="alert" aria-live="polite" className="mt-3 text-sm text-red-600">{error}</p>
					) : null}

					<p className="mt-2 text-center text-sm text-wellness-muted">
						Already have an account?{' '}
						<Link to="/auth/login" className="text-calm-sage underline underline-offset-2 hover:text-wellness-text">
							Login here
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
