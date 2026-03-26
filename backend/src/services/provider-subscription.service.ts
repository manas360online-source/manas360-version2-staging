import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/db';
import { PROVIDER_PLANS, type ProviderPlanKey } from '../config/providerPlans';
import { PLAN_CONFIG } from '../config/plans';
import { calculateGraceEndDate } from './subscription.helper';

const db = prisma as any;
const SUBSCRIPTION_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

const recordProviderSubscriptionHistory = async (input: {
	providerId: string;
	subscriptionRefId?: string;
	oldPlan?: string;
	newPlan?: string;
	oldStatus?: string;
	newStatus?: string;
	oldPrice?: number;
	newPrice?: number;
	paymentId?: string;
	transactionId?: string;
	reason: 'PROVIDER_PLAN_ACTIVATED' | 'PROVIDER_MANUAL_CANCEL' | 'PAYMENT_SUCCESS' | 'OTHER';
	metadata?: Record<string, unknown>;
}) => {
	await (db as any).subscriptionHistory.create({
		data: {
			subscriptionType: 'PROVIDER',
			subscriptionRefId: input.subscriptionRefId,
			providerId: input.providerId,
			oldPlan: input.oldPlan,
			newPlan: input.newPlan,
			oldStatus: input.oldStatus,
			newStatus: input.newStatus,
			oldPrice: input.oldPrice,
			newPrice: input.newPrice,
			paymentId: input.paymentId,
			transactionId: input.transactionId || input.paymentId,
			reason: input.reason,
			metadata: input.metadata || undefined,
		},
	}).catch(() => null);
};

const withProviderSubscriptionLock = async <T>(providerId: string, handler: (current: any) => Promise<T>): Promise<T> => {
	let current = await db.providerSubscription.findUnique({ where: { providerId } });
	const staleCutoff = new Date(Date.now() - SUBSCRIPTION_LOCK_TIMEOUT_MS);
	const lockStartedAt = new Date();

	if (!current) {
		// Seed a row so lock-based updates are deterministic for first-time activation.
		current = await db.providerSubscription.create({
			data: {
				providerId,
				plan: 'free',
				price: 0,
				leadsPerWeek: 0,
				startDate: new Date(),
				expiryDate: new Date('2099-12-31'),
				status: 'inactive',
				autoRenew: false,
				processing: true,
				processingStartedAt: lockStartedAt,
			},
		});
	} else {
		const lock = await db.providerSubscription.updateMany({
			where: {
				providerId,
				OR: [
					{ processing: false },
					{ processing: true, processingStartedAt: { lt: staleCutoff } },
				],
			},
			data: { processing: true, processingStartedAt: lockStartedAt },
		});

		if (!lock?.count) {
			throw new AppError('Provider subscription is currently being processed. Please retry shortly.', 409);
		}

		current = await db.providerSubscription.findUnique({ where: { providerId } });
	}

	try {
		return await handler(current);
	} finally {
		await db.providerSubscription.updateMany({
			where: { providerId },
			data: { processing: false, processingStartedAt: null },
		}).catch(() => null);
	}
};

/** Calculate expiry date from now based on plan duration */
const calculateExpiry = (durationDays: number): Date => {
	const expiry = new Date();
	expiry.setDate(expiry.getDate() + (durationDays || 30));
	return expiry;
};

const resolveTierForPlan = (planKey: ProviderPlanKey): 'STARTER' | 'GROWTH' | 'SCALE' | null => {
	if (planKey === 'basic') return 'STARTER';
	if (planKey === 'standard') return 'GROWTH';
	if (planKey === 'premium') return 'SCALE';
	return null;
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
	const tier = (sub.tier || resolveTierForPlan(sub.plan as ProviderPlanKey) || null) as any;
	const tierDetails = tier ? (PLAN_CONFIG as any)[tier] : null;

	return {
		...sub,
		planDetails,
		tierDetails,
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

	return withProviderSubscriptionLock(providerId, async (current) => {
		if (planKey === 'free') {
			const next = await db.providerSubscription.update({
				where: { providerId },
				data: {
					plan: planKey,
					tier: null,
					price: 0,
					leadsPerWeek: 0,
					bonusLeads: 0,
					startDate: new Date(),
					expiryDate: new Date('2099-12-31'),
					status: 'active',
					autoRenew: false,
					paymentId: paymentId || undefined,
					leadsUsedThisWeek: 0,
					weekStartsAt: new Date(),
				},
			});

			await recordProviderSubscriptionHistory({
				providerId,
				subscriptionRefId: String(next.id),
				oldPlan: String(current?.plan || ''),
				newPlan: String(next.plan || ''),
				oldStatus: String(current?.status || ''),
				newStatus: String(next.status || ''),
				oldPrice: Number(current?.price || 0),
				newPrice: Number(next.price || 0),
				paymentId,
				transactionId: paymentId,
				reason: 'PROVIDER_PLAN_ACTIVATED',
				metadata: { autoRenew: false },
			});

			return next;
		}

		const mappedTier = resolveTierForPlan(planKey);
		const tierConfig = mappedTier ? (PLAN_CONFIG as any)[mappedTier] : null;
		const currentStatus = String(current?.status || '').toLowerCase();
		const hasPaidSubscriptionAlready = Number(current?.price || 0) > 0
			&& ['active', 'trial', 'grace'].includes(currentStatus);
		const nextStatus = hasPaidSubscriptionAlready ? 'active' : 'trial';
		const expiryDays = nextStatus === 'trial' ? 15 : plan.durationDays;
		const trialEndDate = nextStatus === 'trial' ? new Date(new Date().getTime() + 15 * 24 * 60 * 60 * 1000).toISOString() : undefined;

		const next = await db.providerSubscription.update({
			where: { providerId },
			data: {
				plan: planKey,
				tier: mappedTier,
				price: plan.price,
				leadsPerWeek: Number(tierConfig?.leadsPerWeek ?? plan.leadsPerWeek),
				bonusLeads: Number(tierConfig?.bonusLeads ?? 0),
				startDate: new Date(),
				expiryDate: calculateExpiry(expiryDays),
				status: nextStatus,
				autoRenew: true,
				paymentId: paymentId || undefined,
				leadsUsedThisWeek: 0,
				weekStartsAt: new Date(),
				metadata: nextStatus === 'trial' ? {
					trialEndDate,
					graceEndDate: null,
					isFirstActivation: true
				} : undefined,
			},
		});

		await recordProviderSubscriptionHistory({
			providerId,
			subscriptionRefId: String(next.id),
			oldPlan: String(current?.plan || ''),
			newPlan: String(next.plan || ''),
			oldStatus: String(current?.status || ''),
			newStatus: String(next.status || ''),
			oldPrice: Number(current?.price || 0),
			newPrice: Number(next.price || 0),
			paymentId,
			transactionId: paymentId,
			reason: 'PROVIDER_PLAN_ACTIVATED',
			metadata: { autoRenew: true },
		});

		return next;
	});
};

/** Cancel a provider subscription */
export const cancelProviderSubscription = async (providerId: string) => {
	const sub = await db.providerSubscription.findUnique({ where: { providerId } });
	if (!sub) throw new AppError('No active subscription found', 404);

	return withProviderSubscriptionLock(providerId, async (current) => {
		const next = await db.providerSubscription.update({
			where: { providerId },
			data: { status: 'cancelled', autoRenew: false },
		});

		await recordProviderSubscriptionHistory({
			providerId,
			subscriptionRefId: String(next.id),
			oldPlan: String(current?.plan || ''),
			newPlan: String(next.plan || ''),
			oldStatus: String(current?.status || ''),
			newStatus: String(next.status || ''),
			oldPrice: Number(current?.price || 0),
			newPrice: Number(next.price || 0),
			reason: 'PROVIDER_MANUAL_CANCEL',
		});

		return next;
	});
};

export const getProviderSubscriptionBanner = async (providerId: string) => {
	const sub = await db.providerSubscription.findUnique({
		where: { providerId },
		select: { status: true, metadata: true },
	});

	if (!sub) return null;

	const status = String(sub.status || '').toLowerCase();
	if (status === 'locked') {
		return {
			type: 'locked' as const,
			message: 'Leads are paused. Renew now to continue receiving patients.',
		};
	}

	if (status === 'grace') {
		const graceEndDate = sub?.metadata?.graceEndDate || null;
		const formattedDate = graceEndDate ? new Date(graceEndDate).toISOString() : null;
		return {
			type: 'grace' as const,
			message: `Grace period active until ${formattedDate || 'soon'}. Renew to avoid lock.`,
			graceEndDate: formattedDate,
		};
	}

	return null;
};

export const markProviderSubscriptionPaymentFailed = async (providerId: string, paymentId?: string) => {
	return withProviderSubscriptionLock(providerId, async (current) => {
		if (!current) {
			throw new AppError('No active subscription found', 404);
		}

		const graceEndDate = calculateGraceEndDate().toISOString();
		const currentMetadata = current?.metadata && typeof current.metadata === 'object'
			? current.metadata
			: {};

		const next = await db.providerSubscription.update({
			where: { providerId },
			data: {
				status: 'grace',
				metadata: {
					...currentMetadata,
					graceEndDate,
				},
			},
		});

		await recordProviderSubscriptionHistory({
			providerId,
			subscriptionRefId: String(next.id),
			oldPlan: String(current?.plan || ''),
			newPlan: String(next.plan || ''),
			oldStatus: String(current?.status || ''),
			newStatus: String(next.status || ''),
			oldPrice: Number(current?.price || 0),
			newPrice: Number(next.price || 0),
			paymentId,
			transactionId: paymentId,
			reason: 'OTHER',
			metadata: { event: 'PAYMENT_FAILED', graceEndDate },
		});

		return next;
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
