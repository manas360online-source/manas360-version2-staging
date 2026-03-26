import bcrypt from 'bcrypt';
import { prisma } from '../src/config/db';
import { ProviderType, UserProvider, UserRole } from '@prisma/client';

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
				isTherapistVerified: mappedProviderType ? true : undefined,
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
				isTherapistVerified: Boolean(mappedProviderType),
			},
		});
		usersByPhone.set(entry.phone, user);

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
			update: profileSeed,
			create: {
				userId: user.id,
				...profileSeed,
			},
		});
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

		await prisma.patientSubscription.upsert({
			where: { userId: user.id },
			update: {
				planName: 'Premium Plan',
				price: 2499,
				billingCycle: 'monthly',
				status: 'active',
				autoRenew: true,
				renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			},
			create: {
				userId: user.id,
				planName: 'Premium Plan',
				price: 2499,
				billingCycle: 'monthly',
				status: 'active',
				autoRenew: true,
				renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			},
		});
	}

	const patientUsers = ['+917000100211', '+917000100212']
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

	console.log('Mock users seeded with provider profiles and care-team assignments.');
	console.log(
		JSON.stringify(
			{
				patients: patientUsers.map((user) => ({ phone: user.phone, loginMethod: 'PHONE_OTP' })),
				providers: MOCK_USERS.filter((entry) => roleToProviderType(entry.role)).map((entry) => ({
					phone: entry.phone,
					loginMethod: 'PHONE_OTP',
					role: entry.role,
				})),
				admin: MOCK_USERS
					.filter((entry) => entry.role === UserRole.ADMIN)
					.map((entry) => ({ email: entry.email, password: entry.password, loginMethod: 'EMAIL_PASSWORD' })),
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
