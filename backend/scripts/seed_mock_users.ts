import bcrypt from 'bcrypt';
import { prisma } from '../src/config/db';
import {
	OnboardingStatus,
	ProviderPlan,
	ProviderSubscriptionTier,
	ProviderType,
	UserProvider,
	UserRole,
} from '@prisma/client';

type MockUserSeed = {
	email?: string | null;
	password?: string;
	phone: string;
	role: UserRole;
	providerType?: ProviderType;
	firstName: string;
	lastName: string;
	name: string;
};

type ProviderProfileSeed = {
	displayName: string;
	bio: string;
	specializations: string[];
	languages: string[];
	yearsOfExperience: number;
	consultationFee: number;
	averageRating: number;
	availability: Array<{ dayOfWeek: number; startMinute: number; endMinute: number; isAvailable: boolean }>;
};

const MOCK_USERS: MockUserSeed[] = [
	{
		email: 'admin@manas360.local',
		password: 'Admin@123',
		phone: '+917000600211',
		role: UserRole.ADMIN,
		firstName: 'System',
		lastName: 'Admin',
		name: 'System Admin',
	},
	{
		email: null,
		phone: '+917000100211',
		role: UserRole.PATIENT,
		firstName: 'Mock',
		lastName: 'Patient',
		name: 'Mock Patient',
	},
	{
		email: null,
		phone: '+917000100212',
		role: UserRole.PATIENT,
		firstName: 'Priya',
		lastName: 'QA',
		name: 'Priya QA',
	},
	{
		email: null,
		phone: '+917000100213',
		role: UserRole.PATIENT,
		firstName: 'Aman',
		lastName: 'Free',
		name: 'Aman Free',
	},
	{
		email: null,
		phone: '+917000200211',
		role: UserRole.THERAPIST,
		providerType: ProviderType.THERAPIST,
		firstName: 'Mock',
		lastName: 'Therapist',
		name: 'Mock Therapist',
	},
	{
		email: null,
		phone: '+917000500211',
		role: UserRole.PSYCHOLOGIST,
		providerType: ProviderType.PSYCHOLOGIST,
		firstName: 'Mock',
		lastName: 'Psychologist',
		name: 'Mock Psychologist',
	},
	{
		email: null,
		phone: '+917000400211',
		role: UserRole.PSYCHIATRIST,
		providerType: ProviderType.PSYCHIATRIST,
		firstName: 'Mock',
		lastName: 'Psychiatrist',
		name: 'Mock Psychiatrist',
	},
	{
		email: null,
		phone: '+917000300211',
		role: UserRole.COACH,
		providerType: ProviderType.COACH,
		firstName: 'Mock',
		lastName: 'Coach',
		name: 'Mock Coach',
	},
	{
		email: null,
		phone: '+917000200212',
		role: UserRole.THERAPIST,
		providerType: ProviderType.THERAPIST,
		firstName: 'Rohan',
		lastName: 'Sharma',
		name: 'Rohan Sharma',
	},
	{
		email: null,
		phone: '+917000500212',
		role: UserRole.PSYCHOLOGIST,
		providerType: ProviderType.PSYCHOLOGIST,
		firstName: 'Ananya',
		lastName: 'Iyer',
		name: 'Ananya Iyer',
	},
	{
		email: null,
		phone: '+917000400212',
		role: UserRole.PSYCHIATRIST,
		providerType: ProviderType.PSYCHIATRIST,
		firstName: 'Arjun',
		lastName: 'Mehta',
		name: 'Arjun Mehta',
	},
	{
		email: null,
		phone: '+917000300212',
		role: UserRole.COACH,
		providerType: ProviderType.COACH,
		firstName: 'Nisha',
		lastName: 'Kapoor',
		name: 'Nisha Kapoor',
	},
];

const PROVIDER_PROFILE_SEEDS: Record<string, ProviderProfileSeed> = {
	'+917000200211': {
		displayName: 'Mock Therapist',
		bio: 'Trauma-informed therapist for QA and frontend provider-list testing.',
		specializations: ['Anxiety Therapy', 'Stress Recovery'],
		languages: ['English', 'Hindi'],
		yearsOfExperience: 6,
		consultationFee: 69900,
		averageRating: 4.7,
		availability: [
			{ dayOfWeek: 1, startMinute: 600, endMinute: 1080, isAvailable: true },
			{ dayOfWeek: 3, startMinute: 600, endMinute: 1080, isAvailable: true },
		],
	},
	'+917000500211': {
		displayName: 'Mock Psychologist',
		bio: 'Clinical psychologist profile seeded for patient assessments and care-team screens.',
		specializations: ['Clinical Psychology', 'Behavioral Assessment'],
		languages: ['English', 'Tamil'],
		yearsOfExperience: 8,
		consultationFee: 99900,
		averageRating: 4.8,
		availability: [
			{ dayOfWeek: 2, startMinute: 660, endMinute: 1140, isAvailable: true },
			{ dayOfWeek: 4, startMinute: 660, endMinute: 1140, isAvailable: true },
		],
	},
	'+917000400211': {
		displayName: 'Mock Psychiatrist',
		bio: 'Psychiatrist profile seeded for medication-pathway and urgent care testing.',
		specializations: ['Medication Management', 'Clinical Psychiatry'],
		languages: ['English', 'Hindi'],
		yearsOfExperience: 10,
		consultationFee: 149900,
		averageRating: 4.9,
		availability: [
			{ dayOfWeek: 1, startMinute: 720, endMinute: 1020, isAvailable: true },
			{ dayOfWeek: 5, startMinute: 720, endMinute: 1020, isAvailable: true },
		],
	},
	'+917000300211': {
		displayName: 'Mock Coach',
		bio: 'Coach profile seeded for self-care and wellness planning flows.',
		specializations: ['Wellness Coaching', 'Habit Building'],
		languages: ['English'],
		yearsOfExperience: 5,
		consultationFee: 49900,
		averageRating: 4.6,
		availability: [
			{ dayOfWeek: 0, startMinute: 600, endMinute: 960, isAvailable: true },
			{ dayOfWeek: 6, startMinute: 600, endMinute: 960, isAvailable: true },
		],
	},
	'+917000200212': {
		displayName: 'Rohan Sharma',
		bio: 'Therapist test account for bookings, sessions, and care-team views.',
		specializations: ['CBT', 'Relationship Therapy'],
		languages: ['English', 'Hindi'],
		yearsOfExperience: 7,
		consultationFee: 79900,
		averageRating: 4.8,
		availability: [
			{ dayOfWeek: 1, startMinute: 600, endMinute: 1080, isAvailable: true },
			{ dayOfWeek: 2, startMinute: 600, endMinute: 1080, isAvailable: true },
		],
	},
	'+917000500212': {
		displayName: 'Ananya Iyer',
		bio: 'Psychologist test account for reports, assessment review, and provider browsing.',
		specializations: ['Clinical Psychology', 'Trauma Assessment'],
		languages: ['English', 'Tamil'],
		yearsOfExperience: 9,
		consultationFee: 109900,
		averageRating: 4.9,
		availability: [
			{ dayOfWeek: 3, startMinute: 660, endMinute: 1140, isAvailable: true },
			{ dayOfWeek: 4, startMinute: 660, endMinute: 1140, isAvailable: true },
		],
	},
	'+917000400212': {
		displayName: 'Arjun Mehta',
		bio: 'Psychiatrist test account for urgent care and medication-pathway validation.',
		specializations: ['Clinical Psychiatry', 'Medication Reviews'],
		languages: ['English', 'Hindi'],
		yearsOfExperience: 11,
		consultationFee: 159900,
		averageRating: 4.9,
		availability: [
			{ dayOfWeek: 2, startMinute: 720, endMinute: 1020, isAvailable: true },
			{ dayOfWeek: 5, startMinute: 720, endMinute: 1020, isAvailable: true },
		],
	},
	'+917000300212': {
		displayName: 'Nisha Kapoor',
		bio: 'Coach test account for wellness goal and recovery-planning flows.',
		specializations: ['Wellness Coaching', 'Lifestyle Design'],
		languages: ['English', 'Hindi'],
		yearsOfExperience: 4,
		consultationFee: 59900,
		averageRating: 4.7,
		availability: [
			{ dayOfWeek: 0, startMinute: 660, endMinute: 960, isAvailable: true },
			{ dayOfWeek: 6, startMinute: 660, endMinute: 960, isAvailable: true },
		],
	},
};

const patientProfileSeedByPhone: Record<string, { age: number; gender: string; medicalHistory: string }> = {
	'+917000100211': { age: 28, gender: 'female', medicalHistory: 'Generalized anxiety history noted for QA testing.' },
	'+917000100212': { age: 34, gender: 'male', medicalHistory: 'Sleep disruption and workplace stress noted for QA testing.' },
	'+917000100213': { age: 26, gender: 'male', medicalHistory: 'Baseline free-tier patient for regression testing.' },
};

const PATIENT_SUBSCRIPTIONS_BY_PHONE: Record<string, {
	planName: string;
	price: number;
	billingCycle: 'monthly' | 'quarterly' | 'yearly';
	status: string;
	autoRenew: boolean;
	renewalOffsetDays: number;
}> = {
	'+917000100211': {
		planName: 'Premium Plan',
		price: 2499,
		billingCycle: 'monthly',
		status: 'active',
		autoRenew: true,
		renewalOffsetDays: 30,
	},
	'+917000100212': {
		planName: 'Premium Plus Plan',
		price: 4999,
		billingCycle: 'quarterly',
		status: 'trialing',
		autoRenew: true,
		renewalOffsetDays: 45,
	},
};

const PROVIDER_SUBSCRIPTIONS_BY_PHONE: Record<string, {
	plan: ProviderPlan;
	price: number;
	status: string;
	billingCycle: string;
	leadsPerWeek: number;
	bonusLeads: number;
	tier: ProviderSubscriptionTier;
	expiryOffsetDays: number;
}> = {
	'+917000200211': { plan: ProviderPlan.standard, price: 4999, status: 'active', billingCycle: 'monthly', leadsPerWeek: 15, bonusLeads: 2, tier: ProviderSubscriptionTier.GROWTH, expiryOffsetDays: 45 },
	'+917000500211': { plan: ProviderPlan.premium, price: 8999, status: 'active', billingCycle: 'monthly', leadsPerWeek: 30, bonusLeads: 5, tier: ProviderSubscriptionTier.SCALE, expiryOffsetDays: 60 },
	'+917000400211': { plan: ProviderPlan.premium, price: 9999, status: 'grace', billingCycle: 'monthly', leadsPerWeek: 25, bonusLeads: 3, tier: ProviderSubscriptionTier.SCALE, expiryOffsetDays: 20 },
	'+917000300211': { plan: ProviderPlan.basic, price: 2999, status: 'active', billingCycle: 'monthly', leadsPerWeek: 10, bonusLeads: 0, tier: ProviderSubscriptionTier.STARTER, expiryOffsetDays: 35 },
	'+917000200212': { plan: ProviderPlan.standard, price: 4999, status: 'active', billingCycle: 'monthly', leadsPerWeek: 20, bonusLeads: 3, tier: ProviderSubscriptionTier.GROWTH, expiryOffsetDays: 55 },
	'+917000500212': { plan: ProviderPlan.premium, price: 8999, status: 'trial', billingCycle: 'monthly', leadsPerWeek: 30, bonusLeads: 5, tier: ProviderSubscriptionTier.SCALE, expiryOffsetDays: 40 },
	'+917000400212': { plan: ProviderPlan.premium, price: 9999, status: 'active', billingCycle: 'monthly', leadsPerWeek: 25, bonusLeads: 4, tier: ProviderSubscriptionTier.SCALE, expiryOffsetDays: 70 },
	'+917000300212': { plan: ProviderPlan.basic, price: 2999, status: 'active', billingCycle: 'monthly', leadsPerWeek: 12, bonusLeads: 1, tier: ProviderSubscriptionTier.STARTER, expiryOffsetDays: 30 },
};

const PREMIUM_PATIENT_PHONES = ['+917000100211', '+917000100212'];

const consentSetForRole = (role: UserRole): string[] => {
	const base = ['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'INFORMED_CONSENT'];
	if (
		role === UserRole.THERAPIST
		|| role === UserRole.PSYCHOLOGIST
		|| role === UserRole.PSYCHIATRIST
		|| role === UserRole.COACH
	) {
		return [...base, 'THERAPIST_IC_AGREEMENT', 'THERAPIST_NDA', 'THERAPIST_DATA_PROCESSING_AGREEMENT'];
	}
	return base;
};

const plusDays = (days: number): Date => {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d;
};

const roleToProviderType = (role: UserRole): ProviderType | null => {
	if (role === UserRole.THERAPIST) return ProviderType.THERAPIST;
	if (role === UserRole.PSYCHOLOGIST) return ProviderType.PSYCHOLOGIST;
	if (role === UserRole.PSYCHIATRIST) return ProviderType.PSYCHIATRIST;
	if (role === UserRole.COACH) return ProviderType.COACH;
	return null;
};

async function run() {
	console.log('Seeding mock users...');
	const usersByPhone = new Map<string, any>();

	for (const entry of MOCK_USERS) {
		const passwordHash = entry.password ? await bcrypt.hash(entry.password, 12) : null;
		const mappedProviderType = entry.providerType ?? roleToProviderType(entry.role);
		const isPlatformAdmin = entry.role === UserRole.ADMIN;
		const whereClause = entry.email ? { email: entry.email } : { phone: entry.phone };
		const user = await prisma.user.upsert({
			where: whereClause,
			update: {
				passwordHash: isPlatformAdmin ? passwordHash : null,
				email: entry.email ?? null,
				emailVerified: isPlatformAdmin,
				phone: entry.phone,
				phoneVerified: true,
				role: entry.role,
				providerType: mappedProviderType,
				provider: UserProvider.LOCAL,
				firstName: entry.firstName,
				lastName: entry.lastName,
				name: entry.name,
				status: 'ACTIVE',
				onboardingStatus: mappedProviderType ? OnboardingStatus.COMPLETED : null,
				isTherapistVerified: mappedProviderType ? true : undefined,
				therapistVerifiedAt: mappedProviderType ? new Date() : null,
				isDeleted: false,
				failedLoginAttempts: 0,
				lockUntil: null,
			},
			create: {
				email: entry.email ?? null,
				passwordHash: isPlatformAdmin ? passwordHash : null,
				emailVerified: isPlatformAdmin,
				phone: entry.phone,
				phoneVerified: true,
				role: entry.role,
				providerType: mappedProviderType,
				provider: UserProvider.LOCAL,
				firstName: entry.firstName,
				lastName: entry.lastName,
				name: entry.name,
				status: 'ACTIVE',
				onboardingStatus: mappedProviderType ? OnboardingStatus.COMPLETED : null,
				isTherapistVerified: Boolean(mappedProviderType),
				therapistVerifiedAt: mappedProviderType ? new Date() : null,
			},
		});
		usersByPhone.set(entry.phone, user);

		const consentTypes = consentSetForRole(entry.role);
		for (const consentType of consentTypes) {
			const existingConsent = await prisma.consent.findFirst({
				where: {
					userId: user.id,
					consentType,
					status: 'GRANTED',
				},
				select: { id: true },
			});
			if (!existingConsent) {
				await prisma.consent.create({
					data: {
						userId: user.id,
						consentType,
						purpose: 'REGISTRATION',
						status: 'GRANTED',
						grantedAt: new Date(),
						metadata: { source: 'seed_mock_users' },
					},
				});
			}
		}

		console.log(
			JSON.stringify(
				{
					ok: true,
					id: user.id,
					email: entry.email ?? null,
					phone: entry.phone,
					loginMethod: isPlatformAdmin ? 'EMAIL_PASSWORD' : 'PHONE_OTP',
					password: isPlatformAdmin ? entry.password : undefined,
					role: entry.role,
				},
				null,
				2,
			),
		);
	}

	for (const [phone, profileSeed] of Object.entries(PROVIDER_PROFILE_SEEDS)) {
		const user = usersByPhone.get(phone);
		if (!user) continue;

		await prisma.therapistProfile.upsert({
			where: { userId: user.id },
			update: {
				...profileSeed,
				onboardingCompleted: true,
				isVerified: true,
				verifiedAt: new Date(),
			},
			create: {
				userId: user.id,
				...profileSeed,
				onboardingCompleted: true,
				isVerified: true,
				verifiedAt: new Date(),
			},
		});

		const providerSubSeed = PROVIDER_SUBSCRIPTIONS_BY_PHONE[phone];
		if (providerSubSeed) {
			await prisma.providerSubscription.upsert({
				where: { providerId: user.id },
				update: {
					plan: providerSubSeed.plan,
					price: providerSubSeed.price,
					status: providerSubSeed.status,
					billingCycle: providerSubSeed.billingCycle,
					leadsPerWeek: providerSubSeed.leadsPerWeek,
					bonusLeads: providerSubSeed.bonusLeads,
					tier: providerSubSeed.tier,
					expiryDate: plusDays(providerSubSeed.expiryOffsetDays),
					autoRenew: true,
					weekStartsAt: new Date(),
				},
				create: {
					providerId: user.id,
					plan: providerSubSeed.plan,
					price: providerSubSeed.price,
					status: providerSubSeed.status,
					billingCycle: providerSubSeed.billingCycle,
					leadsPerWeek: providerSubSeed.leadsPerWeek,
					bonusLeads: providerSubSeed.bonusLeads,
					tier: providerSubSeed.tier,
					expiryDate: plusDays(providerSubSeed.expiryOffsetDays),
					autoRenew: true,
					weekStartsAt: new Date(),
					startDate: new Date(),
				},
			});

			await prisma.platformAccess.upsert({
				where: { providerId: user.id },
				update: {
					billingCycle: providerSubSeed.billingCycle,
					amountMinor: providerSubSeed.price * 100,
					status: 'active',
					autoRenew: true,
					expiryDate: plusDays(providerSubSeed.expiryOffsetDays),
				},
				create: {
					providerId: user.id,
					billingCycle: providerSubSeed.billingCycle,
					amountMinor: providerSubSeed.price * 100,
					status: 'active',
					autoRenew: true,
					startDate: new Date(),
					expiryDate: plusDays(providerSubSeed.expiryOffsetDays),
				},
			});
		}
	}

	for (const [phone, patientSeed] of Object.entries(patientProfileSeedByPhone)) {
		const user = usersByPhone.get(phone);
		if (!user) continue;

		await prisma.patientProfile.upsert({
			where: { userId: user.id },
			update: {
				age: patientSeed.age,
				gender: patientSeed.gender,
				medicalHistory: patientSeed.medicalHistory,
				emergencyContact: {
					name: 'QA Emergency Contact',
					relationship: 'Family',
					phone: '+910000000000',
				},
				isDeleted: false,
				deletedAt: null,
			},
			create: {
				userId: user.id,
				age: patientSeed.age,
				gender: patientSeed.gender,
				medicalHistory: patientSeed.medicalHistory,
				emergencyContact: {
					name: 'QA Emergency Contact',
					relationship: 'Family',
					phone: '+910000000000',
				},
			},
		});

		const subSeed = PATIENT_SUBSCRIPTIONS_BY_PHONE[phone];
		if (subSeed) {
			await prisma.patientSubscription.upsert({
				where: { userId: user.id },
				update: {
					planName: subSeed.planName,
					price: subSeed.price,
					billingCycle: subSeed.billingCycle,
					status: subSeed.status,
					autoRenew: subSeed.autoRenew,
					renewalDate: plusDays(subSeed.renewalOffsetDays),
				},
				create: {
					userId: user.id,
					planName: subSeed.planName,
					price: subSeed.price,
					billingCycle: subSeed.billingCycle,
					status: subSeed.status,
					autoRenew: subSeed.autoRenew,
					renewalDate: plusDays(subSeed.renewalOffsetDays),
				},
			});
		}

		if (PREMIUM_PATIENT_PHONES.includes(phone)) {
			await prisma.patientPaymentMethod.upsert({
				where: { userId: user.id },
				update: {
					cardLast4: phone.slice(-4),
					cardBrand: 'VISA',
					expiryMonth: 12,
					expiryYear: 2030,
				},
				create: {
					userId: user.id,
					cardLast4: phone.slice(-4),
					cardBrand: 'VISA',
					expiryMonth: 12,
					expiryYear: 2030,
				},
			});

			const invoiceExists = await prisma.patientInvoice.findFirst({
				where: { userId: user.id, status: 'PAID' },
				select: { id: true },
			});
			if (!invoiceExists) {
				await prisma.patientInvoice.create({
					data: {
						userId: user.id,
						amount: Number(subSeed?.price || 2499),
						status: 'PAID',
						invoiceUrl: `https://example.com/invoices/${phone.replace(/[^0-9]/g, '')}-premium.pdf`,
					},
				});
			}

			const wallet = await prisma.userWallet.upsert({
				where: { userId: user.id },
				update: { balance: 35000, lastTxnDate: new Date() },
				create: { userId: user.id, balance: 35000, lastTxnDate: new Date() },
			});

			const txRef = `seed-wallet-credit-${phone.replace(/[^0-9]/g, '')}`;
			const existingWalletTx = await prisma.userWalletTransaction.findFirst({
				where: { walletId: wallet.id, referenceId: txRef },
				select: { id: true },
			});
			if (!existingWalletTx) {
				await prisma.userWalletTransaction.create({
					data: {
						walletId: wallet.id,
						amount: 35000,
						balanceAfter: 35000,
						description: 'Seeded premium wallet credit',
						transactionType: 'CREDIT',
						referenceId: txRef,
					},
				});
			}
		}
	}

	const patientUsers = ['+917000100211', '+917000100212', '+917000100213']
		.map((phone) => usersByPhone.get(phone))
		.filter(Boolean);
	const providerUsers = MOCK_USERS
		.filter((entry) => roleToProviderType(entry.role))
		.map((entry) => usersByPhone.get(entry.phone))
		.filter(Boolean);

	for (const patient of patientUsers) {
		for (const provider of providerUsers) {
			await prisma.careTeamAssignment.upsert({
				where: {
					patientId_providerId: {
						patientId: patient.id,
						providerId: provider.id,
					},
				},
				update: {
					status: 'ACTIVE',
					accessScope: {
						role: String(provider.role).toLowerCase(),
						permissions: ['read_patient', 'write_assessment', 'message_patient', 'book_session'],
					},
					revokedAt: null,
				},
				create: {
					patientId: patient.id,
					providerId: provider.id,
					status: 'ACTIVE',
					accessScope: {
						role: String(provider.role).toLowerCase(),
						permissions: ['read_patient', 'write_assessment', 'message_patient', 'book_session'],
					},
				},
			});
		}
	}

	// Seed booking/session/payment-intent style entities so patient/provider timelines are populated.
	const primaryPatient = usersByPhone.get('+917000100211');
	const secondaryPatient = usersByPhone.get('+917000100212');
	const primaryTherapist = usersByPhone.get('+917000200211');
	const secondaryPsychologist = usersByPhone.get('+917000500211');

	if (primaryPatient && primaryTherapist) {
		const primaryPatientProfile = await prisma.patientProfile.findUnique({ where: { userId: primaryPatient.id }, select: { id: true } });
		if (primaryPatientProfile) {
			await prisma.therapySession.upsert({
				where: { bookingReferenceId: 'SEED-BK-PAID-001' },
				update: {
					patientProfileId: primaryPatientProfile.id,
					therapistProfileId: primaryTherapist.id,
					dateTime: plusDays(2),
					status: 'CONFIRMED',
					durationMinutes: 50,
					sessionFeeMinor: BigInt(79900),
					paymentStatus: 'PAID',
				},
				create: {
					bookingReferenceId: 'SEED-BK-PAID-001',
					patientProfileId: primaryPatientProfile.id,
					therapistProfileId: primaryTherapist.id,
					dateTime: plusDays(2),
					status: 'CONFIRMED',
					durationMinutes: 50,
					sessionFeeMinor: BigInt(79900),
					paymentStatus: 'PAID',
				},
			});

			await prisma.therapySession.upsert({
				where: { bookingReferenceId: 'SEED-BK-COMPLETED-001' },
				update: {
					patientProfileId: primaryPatientProfile.id,
					therapistProfileId: primaryTherapist.id,
					dateTime: plusDays(-5),
					status: 'COMPLETED',
					durationMinutes: 50,
					sessionFeeMinor: BigInt(69900),
					paymentStatus: 'PAID',
				},
				create: {
					bookingReferenceId: 'SEED-BK-COMPLETED-001',
					patientProfileId: primaryPatientProfile.id,
					therapistProfileId: primaryTherapist.id,
					dateTime: plusDays(-5),
					status: 'COMPLETED',
					durationMinutes: 50,
					sessionFeeMinor: BigInt(69900),
					paymentStatus: 'PAID',
				},
			});

			await prisma.sessionBookingIntent.upsert({
				where: { merchantTransactionId: 'SEED-MTI-BOOK-001' },
				update: {
					patientId: primaryPatient.id,
					providerId: primaryTherapist.id,
					scheduledAt: plusDays(3),
					amountMinor: BigInt(79900),
					status: 'CONFIRMED',
				},
				create: {
					merchantTransactionId: 'SEED-MTI-BOOK-001',
					patientId: primaryPatient.id,
					providerId: primaryTherapist.id,
					scheduledAt: plusDays(3),
					amountMinor: BigInt(79900),
					status: 'CONFIRMED',
				},
			});
		}
	}

	if (secondaryPatient && secondaryPsychologist) {
		await prisma.appointmentRequest.upsert({
			where: { id: 'seed-apptreq-001' },
			update: {
				patientId: secondaryPatient.id,
				availabilityPrefs: { preferredDays: ['Tue', 'Thu'], preferredTime: 'Evening' },
				providers: [{ providerId: secondaryPsychologist.id, status: 'PENDING', name: secondaryPsychologist.name || 'Provider' }],
				status: 'PENDING',
				preferredSpecialization: 'Clinical Psychology',
			},
			create: {
				id: 'seed-apptreq-001',
				patientId: secondaryPatient.id,
				availabilityPrefs: { preferredDays: ['Tue', 'Thu'], preferredTime: 'Evening' },
				providers: [{ providerId: secondaryPsychologist.id, status: 'PENDING', name: secondaryPsychologist.name || 'Provider' }],
				status: 'PENDING',
				preferredSpecialization: 'Clinical Psychology',
			},
		});
	}

	console.log('Mock users seeded with provider profiles and care-team assignments.');
	console.log(
		JSON.stringify(
			{
				patients: patientUsers.map((user) => {
					const phone = String(user.phone || '');
					const sub = PATIENT_SUBSCRIPTIONS_BY_PHONE[phone];
					return {
						phone,
						loginMethod: 'PHONE_OTP',
						subscription: sub
							? { plan: sub.planName, status: sub.status, renewalInDays: sub.renewalOffsetDays }
							: { plan: 'Free', status: 'none' },
					};
				}),
				providers: MOCK_USERS.filter((entry) => roleToProviderType(entry.role)).map((entry) => ({
					phone: entry.phone,
					loginMethod: 'PHONE_OTP',
					role: entry.role,
					providerSubscription: PROVIDER_SUBSCRIPTIONS_BY_PHONE[entry.phone]
						? {
							plan: PROVIDER_SUBSCRIPTIONS_BY_PHONE[entry.phone].plan,
							status: PROVIDER_SUBSCRIPTIONS_BY_PHONE[entry.phone].status,
							expiryInDays: PROVIDER_SUBSCRIPTIONS_BY_PHONE[entry.phone].expiryOffsetDays,
						}
						: null,
				})),
				admin: MOCK_USERS
					.filter((entry) => entry.role === UserRole.ADMIN)
					.map((entry) => ({ email: entry.email, password: entry.password, loginMethod: 'EMAIL_PASSWORD' })),
				notes: {
					premiumPatients: PREMIUM_PATIENT_PHONES,
					bookableProviderRule: 'Only providers with active/trial/grace provider_subscriptions and future expiry appear in patient booking list.',
					seededBookingReferences: ['SEED-BK-PAID-001', 'SEED-BK-COMPLETED-001'],
				},
			},
			null,
			2,
		),
	);
}

run()
	.then(async () => {
		await prisma.$disconnect();
		process.exit(0);
	})
	.catch(async (error) => {
		console.error(error);
		await prisma.$disconnect();
		process.exit(1);
	});
