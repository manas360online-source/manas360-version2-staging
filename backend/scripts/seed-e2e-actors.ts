import { prisma } from '../src/config/db';
import { ProviderType, UserRole, UserProvider, SubscriptionStatus, SubscriptionDomain, SubscriptionPlan } from '@prisma/client';

async function seedEndToEndActors() {
	console.log('Seeding End-to-End Test Users (Providers & Patients)...');

	const providerPhone = '+919999900001';
	const patient1Phone = '+919999900002';
	const patient2Phone = '+919999900003';

	// 1. Create or Update Provider
	const provider = await prisma.user.upsert({
		where: { phone: providerPhone },
		update: {
			firstName: 'Dr. Jane',
			lastName: 'E2E',
			name: 'Dr. Jane E2E',
			role: UserRole.THERAPIST,
			providerType: ProviderType.THERAPIST,
			status: 'ACTIVE',
			isTherapistVerified: true,
			onboardingStatus: 'COMPLETED',
			phoneVerified: true,
		},
		create: {
			phone: providerPhone,
			phoneVerified: true,
			role: UserRole.THERAPIST,
			providerType: ProviderType.THERAPIST,
			provider: UserProvider.LOCAL,
			firstName: 'Dr. Jane',
			lastName: 'E2E',
			name: 'Dr. Jane E2E',
			status: 'ACTIVE',
			isTherapistVerified: true,
			onboardingStatus: 'COMPLETED',
		},
	});

	await prisma.therapistProfile.upsert({
		where: { userId: provider.id },
		update: {
			displayName: 'Dr. Jane E2E',
			bio: 'E2E test provider with active subscription.',
			availability: [
				{ dayOfWeek: 1, startMinute: 600, endMinute: 1080, isAvailable: true },
				{ dayOfWeek: 3, startMinute: 600, endMinute: 1080, isAvailable: true },
			],
			onboardingCompleted: true,
			isVerified: true,
		},
		create: {
			userId: provider.id,
			displayName: 'Dr. Jane E2E',
			bio: 'E2E test provider with active subscription.',
			availability: [
				{ dayOfWeek: 1, startMinute: 600, endMinute: 1080, isAvailable: true },
				{ dayOfWeek: 3, startMinute: 600, endMinute: 1080, isAvailable: true },
			],
			onboardingCompleted: true,
			isVerified: true,
		},
	});

	// Provider Marketplace Subscription (ACTIVE)
	const phonepeSubId = `PROV_${provider.id.substring(0, 8)}_SUB`;
	await prisma.marketplaceSubscription.upsert({
		where: { phonepeSubscriptionId: phonepeSubId },
		update: {
			status: SubscriptionStatus.ACTIVE,
			currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		},
		create: {
			userId: provider.id,
			domain: SubscriptionDomain.PROVIDER,
			plan: SubscriptionPlan.PREMIUM,
			status: SubscriptionStatus.ACTIVE,
			phonepePlanId: 'E2E_PROV_PREMIUM',
			phonepeSubscriptionId: phonepeSubId,
			currentPeriodStart: new Date(),
			currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		},
	});

	// 2. Create or Update Patients
	const patient1 = await prisma.user.upsert({
		where: { phone: patient1Phone },
		update: {
			firstName: 'Patient Uno',
			lastName: 'E2E',
			name: 'Patient Uno E2E',
			role: UserRole.PATIENT,
			status: 'ACTIVE',
			phoneVerified: true,
		},
		create: {
			phone: patient1Phone,
			phoneVerified: true,
			role: UserRole.PATIENT,
			provider: UserProvider.LOCAL,
			firstName: 'Patient Uno',
			lastName: 'E2E',
			name: 'Patient Uno E2E',
			status: 'ACTIVE',
		},
	});

	const patient2 = await prisma.user.upsert({
		where: { phone: patient2Phone },
		update: {
			firstName: 'Patient Dos',
			lastName: 'E2E',
			name: 'Patient Dos E2E',
			role: UserRole.PATIENT,
			status: 'ACTIVE',
			phoneVerified: true,
		},
		create: {
			phone: patient2Phone,
			phoneVerified: true,
			role: UserRole.PATIENT,
			provider: UserProvider.LOCAL,
			firstName: 'Patient Dos',
			lastName: 'E2E',
			name: 'Patient Dos E2E',
			status: 'ACTIVE',
		},
	});

	// Patient Profiles
	for (const pt of [patient1, patient2]) {
		await prisma.patientProfile.upsert({
			where: { userId: pt.id },
			update: { age: 30, gender: 'female', medicalHistory: 'None', emergencyContact: { phone: '0000', name: 'N/A', relationship: 'N/A' } },
			create: { userId: pt.id, age: 30, gender: 'female', medicalHistory: 'None', emergencyContact: { phone: '0000', name: 'N/A', relationship: 'N/A' } },
		});
		
		// Patient Marketplace Subscription
		const ptSubId = `PAT_${pt.id.substring(0, 8)}_SUB`;
		await prisma.marketplaceSubscription.upsert({
			where: { phonepeSubscriptionId: ptSubId },
			update: { status: SubscriptionStatus.ACTIVE, currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
			create: {
				userId: pt.id,
				domain: SubscriptionDomain.PATIENT,
				plan: SubscriptionPlan.PREMIUM,
				status: SubscriptionStatus.ACTIVE,
				phonepePlanId: 'E2E_PAT_PREMIUM',
				phonepeSubscriptionId: ptSubId,
				currentPeriodStart: new Date(),
				currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
				nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			},
		});

		// Legacy Patient Subscription
		await prisma.patientSubscription.upsert({
			where: { userId: pt.id },
			update: { status: 'active', renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
			create: {
				userId: pt.id,
				planName: 'Premium Plan (E2E)',
				price: 2499,
				billingCycle: 'monthly',
				status: 'active',
				renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			},
		});

		// Link Patients to Provider in CareTeam
		await prisma.careTeamAssignment.upsert({
			where: { patientId_providerId: { patientId: pt.id, providerId: provider.id } },
			update: { status: 'ACTIVE', accessScope: { role: 'therapist', permissions: ['read_patient', 'message_patient'] } },
			create: {
				patientId: pt.id,
				providerId: provider.id,
				status: 'ACTIVE',
				accessScope: { role: 'therapist', permissions: ['read_patient', 'message_patient'] },
			},
		});
	}

	console.log('--- TEST ACCOUNTS SEEDED SUCCESSFULLY ---');
	console.log('[PROVIDER]');
	console.log('Phone: ' + providerPhone + ' (Dr. Jane E2E, Subscription: ACTIVE)');
	console.log('');
	console.log('[PATIENTS]');
	console.log('Phone: ' + patient1Phone + ' (Patient Uno E2E, Subscription: ACTIVE)');
	console.log('Phone: ' + patient2Phone + ' (Patient Dos E2E, Subscription: ACTIVE)');
	console.log('-----------------------------------------');
}

seedEndToEndActors()
	.then(async () => {
		await prisma.$disconnect();
		process.exit(0);
	})
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
