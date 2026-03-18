import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/db';
import { PROVIDER_PLANS, type ProviderPlanKey } from '../config/providerPlans';

const db = prisma;

/** Calculate expiry date from now based on plan duration */
const calculateExpiry = (durationDays: number): Date => {
	const expiry = new Date();
	expiry.setDate(expiry.getDate() + (durationDays || 30));
	return expiry;
};

/** Get the current provider subscription */
export const getProviderSubscription = async (providerId: string) => {
	const sub = await db.providerSubscription.findUnique({
		where: { providerId },
	});

	if (!sub) {
		return {
			plan: 'free',
			price: 0,
			leadsPerWeek: 0,
			status: 'none',
			startDate: null,
			expiryDate: null,
			autoRenew: false,
			planDetails: PROVIDER_PLANS.free,
		};
	}

	const planDetails = PROVIDER_PLANS[sub.plan as ProviderPlanKey] || PROVIDER_PLANS.free;

	return {
		...sub,
		planDetails,
	};
};

/** Activate or upgrade a provider subscription */
export const activateProviderSubscription = async (
	providerId: string,
	planKey: ProviderPlanKey,
	paymentId?: string,
) => {
	const plan = PROVIDER_PLANS[planKey];
	if (!plan) throw new AppError('Invalid provider plan', 422);

	if (planKey === 'free') {
		// Free plan: upsert with no expiry
		return db.providerSubscription.upsert({
			where: { providerId },
			create: {
				providerId,
				plan: planKey,
				price: 0,
				leadsPerWeek: 0,
				startDate: new Date(),
				expiryDate: new Date('2099-12-31'),
				status: 'active',
				autoRenew: false,
			},
			update: {
				plan: planKey,
				price: 0,
				leadsPerWeek: 0,
				startDate: new Date(),
				expiryDate: new Date('2099-12-31'),
				status: 'active',
				autoRenew: false,
				paymentId: paymentId || undefined,
			},
		});
	}

	return db.providerSubscription.upsert({
		where: { providerId },
		create: {
			providerId,
			plan: planKey,
			price: plan.price,
			leadsPerWeek: plan.leadsPerWeek,
			startDate: new Date(),
			expiryDate: calculateExpiry(plan.durationDays),
			status: 'active',
			autoRenew: true,
			paymentId: paymentId || undefined,
		},
		update: {
			plan: planKey,
			price: plan.price,
			leadsPerWeek: plan.leadsPerWeek,
			startDate: new Date(),
			expiryDate: calculateExpiry(plan.durationDays),
			status: 'active',
			autoRenew: true,
			paymentId: paymentId || undefined,
		},
	});
};

/** Cancel a provider subscription */
export const cancelProviderSubscription = async (providerId: string) => {
	const sub = await db.providerSubscription.findUnique({ where: { providerId } });
	if (!sub) throw new AppError('No active subscription found', 404);

	return db.providerSubscription.update({
		where: { providerId },
		data: { status: 'cancelled', autoRenew: false },
	});
};

/** Get provider lead stats for the current week */
export const getProviderLeadStats = async (providerId: string) => {
	const now = new Date();
	const weekStart = new Date(now);
	weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
	weekStart.setHours(0, 0, 0, 0);

	const sub = await getProviderSubscription(providerId);

	const [assignedThisWeek, claimedThisWeek] = await Promise.all([
		db.lead.count({
			where: {
				providerId,
				createdAt: { gte: weekStart },
			},
		}),
		db.lead.count({
			where: {
				providerId,
				status: 'ACCEPTED',
				acceptedAt: { gte: weekStart },
			},
		}),
	]);

	return {
		currentPlan: sub.plan,
		leadsPerWeek: sub.leadsPerWeek || 0,
		leadsAssigned: assignedThisWeek,
		leadsClaimed: claimedThisWeek,
		leadsRemaining: Math.max(0, (sub.leadsPerWeek || 0) - assignedThisWeek),
	};
};
