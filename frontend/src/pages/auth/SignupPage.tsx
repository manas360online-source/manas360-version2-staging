import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getApiErrorMessage, me as fetchMe, signupWithPhone, verifyPhoneSignupOtp } from '../../api/auth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth, getPostLoginRoute } from '../../context/AuthContext';
import NriPatch, { type NriConsentState } from '../legal/nri';

type SignupRole = 'patient' | 'therapist' | 'psychiatrist' | 'psychologist' | 'coach';
type ProviderAgreementKey = 'THERAPIST_IC_AGREEMENT' | 'THERAPIST_NDA' | 'THERAPIST_DATA_PROCESSING_AGREEMENT';

const PROVIDER_AGREEMENTS: Array<{ key: ProviderAgreementKey; label: string; sections: string[] }> = [
	{
		key: 'THERAPIST_IC_AGREEMENT',
		label: 'Therapist IC Agreement',
		sections: [
			'1. NATURE OF RELATIONSHIP',
			'1.1 The Provider is engaged as an independent contractor. Nothing in this Agreement shall be construed to create an employer-employee relationship, partnership, joint venture, agency, franchise, or fiduciary relationship between the parties.',
			'1.2 The Provider retains full and exclusive clinical autonomy and professional judgment in all therapeutic interactions. MANAS360 does not direct, control, supervise, or interfere with clinical decision-making, diagnosis, treatment planning, prescriptions, or patient management.',
			'1.3 The Provider is solely responsible for all tax liabilities, including income tax, GST (if applicable), professional tax, and any statutory contributions required under Indian law.',
			'2. PROVIDER REPRESENTATIONS AND ELIGIBILITY',
			'2.1 The Provider represents and warrants that they hold:',
			'(a) A valid degree in psychology, psychiatry, counseling, psychotherapy or related field from a recognized institution;',
			'(b) Valid and current registration with the Rehabilitation Council of India (RCI), National Medical Commission (NMC), relevant State Medical Council, or other applicable regulatory authority;',
			"(c) Professional indemnity insurance (recommended) or willingness to participate in MANAS360's group insurance programme;",
			'(d) No pending disciplinary actions, license suspensions, or criminal charges related to professional conduct.',
			'3. SERVICES',
			"3.1 The Provider agrees to offer professional mental health services via the MANAS360 Platform, including video therapy, audio therapy, chat-based therapy, group sessions, and clinical assessments.",
			'3.2 The Provider shall maintain an up-to-date availability calendar on the Platform and honour all confirmed bookings.',
			"3.3 The Provider shall maintain complete and accurate session notes using MANAS360's SOAP/Progress Note templates within 24 hours of each session.",
			'4. REVENUE SHARE',
			'4.1 The revenue share between MANAS360 and the Provider shall be as follows:',
			'(a) Provider receives 60% of the session fee charged to the patient;',
			'(b) MANAS360 retains 40% as the platform fee, which covers technology infrastructure, payment processing, marketing, administrative support and patient acquisition.',
			'4.2 Example: For a session priced at INR 1,000 by the Provider, the Provider receives INR 600 and MANAS360 retains INR 400.',
			'4.3 The Provider sets their own session fees within the range of INR 300 to INR 5,000 per session. MANAS360 may suggest pricing based on market benchmarks but does not mandate specific fees.',
			'4.4 Revenue share percentages may be revised with 60 days\' written notice to the Provider.',
			'5. PAYMENT TERMS',
			"5.1 Payouts are processed weekly (every Monday) for sessions completed in the prior week via UPI bank transfer to the Provider's registered bank account.",
			'5.2 Minimum payout threshold: INR 500. Amounts below the threshold will be carried forward.',
			'5.3 Detailed payout statements including session count, gross earnings, platform fee, TDS (if applicable), and net payout are available on the Provider Dashboard.',
			'5.4 Tax Deducted at Source (TDS) shall be deducted at applicable rates under the Income Tax Act, 1961. TDS certificates will be issued quarterly.',
			'6. PROVIDER OBLIGATIONS',
			'6.1 Maintain valid and subsisting professional qualifications, licenses, and registrations at all times, and immediately notify MANAS360 of any suspension, restriction, lapse, investigation, or change in registration status.',
			'6.2 Comply with all applicable laws, including the Mental Healthcare Act, 2017, Telemedicine Practice Guidelines, 2020, NMC Code of Ethics, and DPDPA 2023.',
			'6.3 Attend mandatory platform training and quarterly compliance updates.',
			'6.4 Respond to patient booking requests within four (4) hours during declared availability and maintain professional responsiveness and continuity of care.',
			'6.5 Not solicit, divert or attempt to move MANAS360 patients for off-platform services or share personal contact information with patients.',
			'6.6 Report all incidents, including clinical emergencies, patient complaints, data breaches, and ethical concerns, to MANAS360 within 24 hours.',
			'6.7 Maintain strict confidentiality of all patient information and access, use, store, or disclose such information solely for lawful clinical purposes.',
			"6.8 Implement appropriate technical and organizational safeguards to protect personal data against unauthorized access, disclosure, alteration, loss, or misuse, in accordance with applicable data protection laws and the Platform's privacy and security policies.",
			'7. PLATFORM OBLIGATIONS',
			'7.1 Provide a reliable and secure technology infrastructure to support teleconsultation services, with a targeted service availability of 99.5% uptime, subject to scheduled maintenance, force majeure events, and factors beyond its reasonable control.',
			'7.2 Responsible for managing patient acquisition initiatives, marketing activities, payment processing mechanisms, and billing administration in connection with services delivered through the Platform, subject to applicable laws and agreed commercial terms.',
			'7.3 Provide integrated session management tools, standardized SOAP note templates, prescription management functionality (where applicable and limited to licensed psychiatrists), and access to clinical dashboards to support documentation, care coordination, and service delivery.',
			'7.4 Process payouts as per Section 5.',
			'7.5 Provide professional indemnity insurance coverage under a group policy arrangement, on an optional basis, with the applicable premium or associated costs to be shared as mutually agreed.',
			'8. LIABILITY AND INDEMNIFICATION',
			'8.1 The Provider shall be solely liable for clinical negligence, malpractice, or breach of professional standards.',
			'8.2 The Provider agrees to indemnify and hold harmless MANAS360 from claims arising out of clinical misconduct; regulatory violations; misrepresentation of credentials; and breach of confidentiality.',
			'9. TERM AND TERMINATION',
			"9.1 This Agreement shall commence upon the Provider's acceptance of its terms and activation of the Provider's profile on the Platform, and shall continue in full force and effect unless and until terminated.",
			"9.2 Either party may terminate with 30 days' written notice.",
			"9.3 Notwithstanding the foregoing, MANAS360 may suspend or terminate this Agreement with immediate effect, without prior notice, if the Provider: (a) has any professional credential, license, or registration revoked, suspended, restricted, or allowed to lapse; (b) engages in professional misconduct or unethical practice; (c) breaches patient confidentiality or data protection obligations; (d) receives three or more verified patient complaints within a 90 day period; or (e) fails to comply with or fails a compliance, quality, or regulatory audit.",
			'9.4 Upon termination, the Provider shall complete all scheduled sessions and receive pending payouts within 15 business days.',
			'10. INTELLECTUAL PROPERTY',
			"10.1 MANAS360 retains all right, title, and interest, including all intellectual property rights, in and to the Platform's technology, software, systems, branding, trademarks, trade names, logos, content, templates, workflows, and other proprietary materials, and nothing in this Agreement shall be construed as granting the Provider any ownership rights therein.",
			"10.2 Session notes created by the Provider using MANAS360 templates are the joint property of the Provider and the patient, hosted on MANAS360's infrastructure.",
			'11. GOVERNING LAW',
			'11.1 This Agreement shall be governed by and construed in accordance with the laws of India. Any dispute, controversy, or claim arising out of or in connection with this Agreement shall be referred to and finally resolved by arbitration in accordance with the Arbitration and Conciliation Act, 1996, as amended from time to time. The seat and venue of arbitration shall be Bengaluru, Karnataka, India, and the arbitral proceedings shall be conducted in the English language.',
			'ACCEPTANCE',
			'By clicking "I Accept" and activating your Provider profile, you agree to the terms of this Agreement.',
		],
	},
	{
		key: 'THERAPIST_NDA',
		label: 'Therapist NDA',
		sections: [
			'1. CONFIDENTIAL INFORMATION',
			"1.1 \"Confidential Information\" includes: (a) all patient data, health records, assessment scores, session notes, and personal information; (b) MANAS360 business plans, commercial strategies, technology, algorithms, pricing, and strategies; (c) Provider network data, including other Providers' identities and performance metrics; (d) any information marked as confidential or that a reasonable person would understand to be confidential.",
			'2. OBLIGATIONS',
			'2.1 The Provider shall: (a) keep all Confidential Information strictly confidential; (b) use Confidential Information solely for providing professional services through MANAS360 platform; (c) not disclose Confidential Information to any third party without prior written consent; (d) implement reasonable and industry standard security measures to protect Confidential Information.',
			"2.2 The Provider shall NOT: (a) download, export, copy, store, or transmit patient data to personal devices or external systems; (b) discuss patient cases with persons not involved in the patient's care; (c) use patient data for research, publication, or teaching without explicit written consent and institutional ethics approval; (d) retain patient data after termination of this Agreement.",
			'3. EXCEPTIONS',
			'3.1 Confidentiality obligations do not apply to information that: (a) is publicly available through no fault of the Provider; (b) was known to the Provider before disclosure; (c) is independently developed without reference to Confidential Information; (d) is required to be disclosed by law, court order, or regulatory authority, provided the Provider gives MANAS360 prompt written notice.',
			'4. PATIENT DATA HANDLING',
			'4.1 All patient data must be accessed exclusively through the MANAS360 Platform. Downloading, exporting, or screen-capturing patient data is prohibited unless explicitly authorized.',
			'4.2 Session notes must be entered directly into the MANAS360 Platform and not stored locally.',
			'4.3 All video/audio sessions are encrypted end-to-end. The Provider shall not use recording software.',
			'5. SURVIVAL',
			'5.1 Confidentiality obligations survive termination of the Provider relationship for a period of 5 years, except for patient health data which remains confidential indefinitely.',
			'6. REMEDIES',
			'6.1 The Provider acknowledges and agrees that any breach or threatened breach of this Agreement may result in irreparable harm to MANAS360 and/or affected patients, for which monetary damages may be an inadequate remedy. Accordingly, MANAS360 shall be entitled to seek immediate injunctive or equitable relief, in addition to any other rights or remedies available under law.',
			'6.2 The Provider further acknowledges that any unauthorized disclosure, misuse, or breach of patient data or sensitive personal information may attract statutory penalties and liabilities under applicable laws, including the Digital Personal Data Protection Act, 2023 (which may prescribe penalties up to INR 250 crore for certain contraventions) and the Information Technology Act, 2000, in addition to civil, regulatory, or criminal consequences as may be applicable.',
			'7. GOVERNING LAW',
			'7.1 This Agreement shall be governed by and construed in accordance with the laws of India. Any dispute, controversy, or claim arising out of or in connection with this Agreement shall be referred to and finally resolved by arbitration in accordance with the Arbitration and Conciliation Act, 1996, as amended from time to time. The seat and venue of arbitration shall be Bengaluru, Karnataka, India, and the arbitral proceedings shall be conducted in the English language.',
			'ACCEPTANCE',
			'By clicking "I Accept," the Provider agrees to this NDA.',
		],
	},
	{
		key: 'THERAPIST_DATA_PROCESSING_AGREEMENT',
		label: 'Therapist Data Processing Agreement',
		sections: [
			'1. DEFINITIONS',
			'1.1 "Data Fiduciary" shall have the meaning assigned under the Digital Personal Data Protection Act, 2023 ("DPDP Act") and refers to MANAS360, which determines the purpose and means of processing personal data.',
			'1.2 "Data Processor" means the Provider, who processes personal data on behalf of the Data Fiduciary in the course of providing therapeutic services.',
			'1.3 "Personal Data" means any data about an individual who is identifiable, including health data, as defined under DPDPA 2023.',
			'1.4 "Processing" includes collection, recording, storage, organization, structuring, use, sharing, disclosure, restriction, erasure, or destruction of Personal Data.',
			'2. SCOPE',
			"2.1 This DPA governs the Provider's processing of patient personal data accessed through the MANAS360 Platform.",
			'3. PROCESSING OBLIGATIONS',
			'3.1 The Provider shall process patient data ONLY for the purpose of providing mental health services through the Platform.',
			'3.2 The Provider shall not process patient data for any other purpose, including personal research, marketing, or sharing with third parties.',
			"3.3 The Provider shall implement reasonable security safeguards as specified in MANAS360's Security Policy, including: (a) using a secure, password-protected device; (b) enabling 2-factor authentication; (c) not accessing patient data on shared or public computers; (d) conducting sessions from a private, sound-proof location.",
			"3.4 The Provider shall adhere to the principle of data minimization by accessing only such Personal Data as is strictly necessary for providing services to patients formally assigned to them through the Platform. The Provider shall not attempt to access, view, retrieve, or manipulate personal or clinical data relating to patients who are not under their authorized care or clinical responsibility. The Provider is strictly prohibited from downloading, exporting, copying, transferring, or storing any Personal Data outside the Platform's secure environment unless such action is expressly permitted in writing by MANAS360 or is otherwise required under applicable law.",
			'4. SUB-PROCESSING',
			'4.1 The Provider shall not appoint or engage any sub-processor to process patient data without prior written consent from MANAS360.',
			'5. DATA BREACH',
			'5.1 The Provider shall notify MANAS360 of any suspected or actual personal data breach within 12 hours of becoming aware.',
			'5.2 Notification shall include: nature of breach, categories of data affected, number of individuals affected, and remedial measures taken.',
			'5.3 The Provider shall be solely liable for any losses, damages, penalties, regulatory fines, or other adverse consequences arising out of or in connection with unauthorized or unlawful processing of personal data, negligent or improper handling of Personal Data, failure to implement required technical or organizational security safeguards, or delay or failure in providing mandatory breach notification as required under applicable law.',
			'6. DATA SUBJECT REQUESTS',
			'6.1 If a patient contacts the Provider directly to exercise their DPDPA rights (access, correction, erasure), the Provider shall forward the request to MANAS360 within 24 hours. The Provider shall assist MANAS360 in fulfilling statutory obligations relating to data subject rights.',
			'7. RETURN AND DELETION',
			'7.1 Upon termination, the Provider shall cease all processing and confirm in writing that no patient data is retained on personal devices or systems.',
			'8. AUDIT',
			"8.1 MANAS360 reserves the right to conduct data protection audits (no more than once per quarter with 7 days' notice) to verify compliance. The Provider shall cooperate fully and provide reasonable access to relevant documentation demonstrating compliance.",
			'9. GOVERNING LAW',
			'9.1 This Agreement shall be governed by and construed in accordance with the laws of India. Any dispute, controversy, or claim arising out of or in connection with this Agreement shall be referred to and finally resolved by arbitration in accordance with the Arbitration and Conciliation Act, 1996, as amended from time to time. The seat and venue of arbitration shall be Bengaluru, Karnataka, India, and the arbitral proceedings shall be conducted in the English language.',
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
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const location = useLocation();
	const locationState = location.state as { role?: SignupRole } | null;
	const initialRole = useMemo<SignupRole>(() => {
		const candidateRole = locationState?.role || new URLSearchParams(location.search).get('role');
		if (candidateRole === 'therapist' || candidateRole === 'psychiatrist' || candidateRole === 'psychologist' || candidateRole === 'coach') {
			return candidateRole;
		}

		return 'patient';
	}, [location.search, locationState]);

	const [name, setName] = useState('');
	const [phone, setPhone] = useState('');
	const [role, setRole] = useState<SignupRole>(initialRole);
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
	const [nriConsent, setNriConsent] = useState<NriConsentState>({
		nri_declared: false,
		nri_tos_accepted: false,
		nri_tos_accepted_at: '',
	});
	const [showPatientTermsModal, setShowPatientTermsModal] = useState(false);
	const [canAcceptPatientTerms, setCanAcceptPatientTerms] = useState(false);
	const [activeAgreement, setActiveAgreement] = useState<ProviderAgreementKey | null>(null);
	const [canAcceptActiveAgreement, setCanAcceptActiveAgreement] = useState(false);
	const agreementScrollRef = useRef<HTMLDivElement | null>(null);
	const patientTermsScrollRef = useRef<HTMLDivElement | null>(null);

	const isPatientLeadFlow = useMemo(() => {
		const query = new URLSearchParams(location.search);
		const returnTarget = String(query.get('next') || query.get('returnTo') || '').toLowerCase();
		return (
			returnTarget.includes('/assessment-preset')
			|| returnTarget.includes('/patient/sessions')
			|| returnTarget.includes('/patient/dashboard')
			|| returnTarget.includes('/plans')
		);
	}, [location.search]);

	const isCertificationContext = useMemo(() => {
		const query = new URLSearchParams(location.search);
		const next = String(query.get('next') || query.get('returnTo') || '').toLowerCase();
		return (
			next.includes('/certifications')
			|| next.includes('/certification/enroll')
			|| next.includes('/provider/certifications')
			|| next.includes('/provider/certification/enroll')
		);
	}, [location.search]);

	const isProviderFlow = !isCertificationContext && !isPatientLeadFlow && role !== 'patient';
	const allProviderAgreementsAccepted = useMemo(
		() => Object.values(providerAgreementsAccepted).every(Boolean),
		[providerAgreementsAccepted],
	);

	const activeAgreementConfig = useMemo(
		() => PROVIDER_AGREEMENTS.find((agreement) => agreement.key === activeAgreement) ?? null,
		[activeAgreement],
	);

	useEffect(() => {
		if (isPatientLeadFlow) {
			setRole('patient');
		}

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
	}, [isPatientLeadFlow, isProviderFlow]);

	useEffect(() => {
		if (!showPatientTermsModal) return;
		const container = patientTermsScrollRef.current;
		if (!container) return;
		container.scrollTop = 0;
		const scrollAvailable = container.scrollHeight > container.clientHeight + 2;
		setCanAcceptPatientTerms(!scrollAvailable);
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
		const mockOtp = Math.floor(1000 + Math.random() * 9000).toString();
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

		const enteredOtp = otpForAadhaar.replace(/\D/g, '').slice(0, 4);
		if (enteredOtp.length !== 4) {
			setError('Please enter a valid 4-digit OTP.');
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
			const result = await signupWithPhone(
				phone.trim(),
				isCertificationContext
					? { name: name.trim(), role: 'learner' }
					: { name: name.trim(), role: isPatientLeadFlow ? 'patient' : role },
			);
			setOtpSent(true);
			setDevOtp(result.devOtp || null);
		} catch (err) {
			setError(getApiErrorMessage(err, 'Failed to send OTP'));
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		const query = new URLSearchParams(location.search);
		const prefillPhone = query.get('phone');
		const reason = query.get('reason');
		const userType = String(query.get('userType') || '').toLowerCase();
		const queryRole = query.get('role');

		if (prefillPhone && !phone) {
			setPhone(prefillPhone);
		}

		if ((locationState?.role || queryRole) && role === 'patient') {
			const candidateRole = locationState?.role || queryRole;
			if (candidateRole === 'therapist' || candidateRole === 'psychiatrist' || candidateRole === 'psychologist' || candidateRole === 'coach') {
				setRole(candidateRole);
			}
		}

		if (reason === 'terms' && !otpSent && !error) {
			setError('Please review and accept Terms & Conditions to complete registration.');
		}

		if (!isPatientLeadFlow && !isCertificationContext && !otpSent) {
			if (userType === 'therapist' || userType === 'psychiatrist' || userType === 'psychologist' || userType === 'coach' || userType === 'patient') {
				setRole(userType as SignupRole);
			}
		}
	}, [location.search, phone, otpSent, error, isPatientLeadFlow, isCertificationContext]);


	const resolveReturnTo = (): string => {
		const qp = new URLSearchParams(location.search);
		const candidate = qp.get('returnTo') || qp.get('next') || '';
		if (!candidate) {
			return '';
		}

		if (!candidate.startsWith('/')) {
			return '';
		}

		if (candidate.startsWith('/auth/')) {
			return '';
		}

		return candidate;
	};

	const hasSessionCookieHint = (): boolean => {
		if (typeof document === 'undefined') return false;
		const csrfCookieName = (import.meta.env.VITE_CSRF_COOKIE_NAME || 'csrf_token').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		return new RegExp(`(?:^|; )${csrfCookieName}=`).test(document.cookie);
	};

	const verifyOtp = async () => {
		if (!isCertificationContext && nriConsent.nri_declared && !nriConsent.nri_tos_accepted) {
			setError('Please review and accept NRI Terms of Service to complete registration.');
			return;
		}

		const acceptedDocuments = [
			...(isProviderFlow && providerAgreementsAccepted.THERAPIST_IC_AGREEMENT ? ['THERAPIST_IC_AGREEMENT'] : []),
			...(isProviderFlow && providerAgreementsAccepted.THERAPIST_NDA ? ['THERAPIST_NDA'] : []),
			...(isProviderFlow && providerAgreementsAccepted.THERAPIST_DATA_PROCESSING_AGREEMENT ? ['THERAPIST_DATA_PROCESSING_AGREEMENT'] : []),
		];

		setError(null);
		setLoading(true);
		try {
			const guestGameToken = localStorage.getItem('guest_game_token') || undefined;
			const result = await verifyPhoneSignupOtp(phone.trim(), otp.trim(), {
				acceptedTerms: isProviderFlow ? allProviderAgreementsAccepted : acceptedTerms,
				acceptedDocuments,
				nri_declared: nriConsent.nri_declared,
				nri_tos_accepted: nriConsent.nri_tos_accepted,
				nri_tos_accepted_at: nriConsent.nri_tos_accepted_at || undefined,
			}, guestGameToken);

			if (guestGameToken) {
				localStorage.removeItem('guest_game_token');
			}
			await checkAuth({ force: true });
			await queryClient.invalidateQueries({ queryKey: ['wallet'] });

			let resolvedUser = result.user;
			if (hasSessionCookieHint()) {
				try {
					resolvedUser = await fetchMe();
				} catch {
					// Keep OTP response user as fallback.
				}
			}

			const returnTo = resolveReturnTo();
			if (isCertificationContext) {
				navigate(returnTo || '/certifications', { replace: true });
				return;
			}
			// If backend indicates patient requires a subscription, send to plans page
			if ((resolvedUser as any)?.requiresSubscription) {
				navigate(`/plans?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
				return;
			}
			const postLoginRoute = getPostLoginRoute(resolvedUser);
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
					<p className="mt-2 text-sm text-wellness-muted sm:text-base">
						{isCertificationContext
							? 'Register for certification using phone number and OTP.'
							: 'Register using phone number and OTP.'}
					</p>

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

						{!isCertificationContext && !isPatientLeadFlow ? (
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
						) : null}

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

						{!isCertificationContext ? (
							<NriPatch onChange={setNriConsent} blockSubmitButtons={false} />
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
											pattern="\\d{4}"
											maxLength={4}
											placeholder="4-digit OTP"
											value={otpForAadhaar}
											onChange={(event) => setOtpForAadhaar(event.target.value.replace(/\D/g, '').slice(0, 4))}
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
								pattern="\\d{4}"
								maxLength={4}
								autoComplete="one-time-code"
								placeholder="4-digit OTP"
								value={otp}
								onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 4))}
								required
							/>
						) : null}

						{!otpSent ? (
							<Button
								type="button"
								fullWidth
								loading={loading}
								className="min-h-[48px]"
								onClick={requestOtp}
							>
								{loading ? 'Sending OTP...' : 'Send OTP'}
							</Button>
						) : (
							<Button
								type="button"
								fullWidth
								loading={loading}
								className="min-h-[48px]"
								onClick={verifyOtp}
							>
								{loading ? 'Verifying OTP...' : (isCertificationContext ? 'Verify OTP and Continue' : 'Verify OTP and Register')}
							</Button>
						)}

						{nriConsent.nri_declared && !nriConsent.nri_tos_accepted ? (
							<p className="text-xs text-amber-700">
								NRI Terms of Service must be accepted before final registration. You can send OTP now and accept NRI terms before verifying OTP.
							</p>
						) : null}
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
										<p key={`${activeAgreementConfig.key}-${idx}`} className="mb-3 last:mb-0">{section}</p>
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
