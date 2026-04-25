import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { PROVIDER_PLANS, LEAD_MARKETPLACE_PRICES, getDiscountedLeadPrice, type ProviderPlanKey } from '../config/providerPlans';
import { logger } from '../utils/logger';
import { isSubscriptionValidForMatching } from './subscription.helper';

const db = prisma;
const ACTIVE_PROVIDER_STATUSES = ['active', 'trial', 'grace', 'ACTIVE', 'TRIAL', 'GRACE'];

const isProviderLeadEligible = (sub: { status?: string | null; plan?: string | null; expiryDate?: Date | null; metadata?: any } | null): boolean => {
	if (!sub) return false;
	return isSubscriptionValidForMatching(sub);
};

/**
 * Shuffle an array in-place (Fisher-Yates) for fairness within tiers.
 * Fix 5: Prevents first-registered providers from always getting the best leads.
 */
const shuffle = <T>(arr: T[]): T[] => {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
};

/**
 * Distribute weekly leads to all active providers based on their plan tier.
 * Called by CRON every Monday at 00:00.
 *
 * Fix 2: Uses $transaction + findFirst with providerId:null to prevent race conditions.
 * Fix 5: Shuffles providers within each tier for fairness.
 * Fix 6: Enforces lead type priority per plan tier:
 *   - Premium → Hot first, then Warm, then Cold
 *   - Standard → Warm + Hot + Cold
 *   - Basic → Mostly Cold + Warm
 *   - Free → 0 leads
 */
export const distributeWeeklyLeads = async () => {
	const activeProviders = await db.providerSubscription.findMany({
		where: {
			status: { in: ACTIVE_PROVIDER_STATUSES as any },
			plan: { notIn: ['free', 'FREE'] as any },
			expiryDate: { gte: new Date() },
		},
	});

	if (activeProviders.length === 0) return { distributed: 0, providers: 0 };

	// Group by tier and shuffle within each tier for fairness (Fix 5)
	const premium = shuffle(activeProviders.filter((p) => p.plan === 'premium'));
	const standard = shuffle(activeProviders.filter((p) => p.plan === 'standard'));
	const basic = shuffle(activeProviders.filter((p) => p.plan === 'basic'));

	// Process in priority order: Premium → Standard → Basic
	const orderedProviders = [...premium, ...standard, ...basic] as typeof activeProviders;

	let totalDistributed = 0;

	for (const provider of orderedProviders) {
		const plan = PROVIDER_PLANS[provider.plan as ProviderPlanKey];
		if (!plan || plan.leadsPerWeek === 0) continue;

		const claimWindowHours = plan.claimWindowHours || 48;
		const expiresAt = new Date();
		expiresAt.setHours(expiresAt.getHours() + claimWindowHours);

		let assigned = 0;

		// Build type priority order based on plan tier (Fix 6)
		let typeOrder: (string | null)[];
		if (provider.plan === 'premium') {
			typeOrder = ['hot', 'warm', 'cold', null];
		} else if (provider.plan === 'standard') {
			typeOrder = ['warm', 'hot', 'cold', null];
		} else {
			typeOrder = ['cold', 'warm', null];
		}

		for (const leadType of typeOrder) {
			if (assigned >= plan.leadsPerWeek) break;

			const remaining = plan.leadsPerWeek - assigned;

			// Fix 2: Use transaction to atomically claim unassigned leads
			// Each lead is individually claimed with a WHERE providerId IS NULL guard
			for (let i = 0; i < remaining; i++) {
				try {
					await db.$transaction(async (tx) => {
						const lead = await tx.lead.findFirst({
							where: {
								status: 'AVAILABLE',
								providerId: null,
								...(leadType ? { leadType } : {}),
							},
							orderBy: { createdAt: 'desc' },
						});

						if (!lead) return;

						// Atomic update only if still unassigned (race guard)
						await tx.lead.update({
							where: {
								id: lead.id,
								providerId: null, // Critical: prevents double assignment
							},
							data: {
								providerId: provider.providerId,
								status: 'PURCHASED',
								expiresAt,
							},
						});

						assigned++;
					});
				} catch {
					// Lead was grabbed by another provider (race condition handled gracefully)
					continue;
				}
			}
		}

		totalDistributed += assigned;
	}

	logger.info(`[LeadDistribution] Weekly distribution cycle complete`, { distributed: totalDistributed, activeProviders: orderedProviders.length });
	return { distributed: totalDistributed, providers: orderedProviders.length };
};

/**
 * Expire unclaimed leads past their claim window.
 * Fix 4: Returns expired leads to the pool by clearing providerId and setting status back.
 */
export const expireUnclaimedLeads = async () => {
	const now = new Date();

	const result = await db.lead.updateMany({
		where: {
			status: 'PURCHASED',
			expiresAt: { lt: now },
			acceptedAt: null, // Only expire unclaimed leads
		},
		data: {
			status: 'AVAILABLE',
			providerId: null, // Return to pool
			expiresAt: null,
		},
	});

	if (result.count > 0) {
		logger.info(`[LeadDistribution] Expired unclaimed leads`, { count: result.count });
	}
	return { expired: result.count };
};

/** Get leads assigned to a provider */
export const getProviderLeads = async (providerId: string) => {
	return db.lead.findMany({
		where: { providerId },
		orderBy: { createdAt: 'desc' },
		take: 50,
	});
};

/**
 * Get available leads for marketplace purchase.
 * Fix 10: Enforces free plan cannot access marketplace.
 */
export const getMarketplaceLeads = async (providerId: string) => {
	const sub = await db.providerSubscription.findUnique({ 
		where: { providerId },
		select: { status: true, plan: true, expiryDate: true, metadata: true }
	});

	// Fix 10: Free plan and no-subscription blocked
	if (!isProviderLeadEligible(sub as any)) {
		throw new AppError('Marketplace access requires an active paid subscription', 403);
	}

	const planKey = sub.plan as ProviderPlanKey;

	const leads = await db.lead.findMany({
		where: {
			status: 'AVAILABLE',
			providerId: null,
		},
		orderBy: { createdAt: 'desc' },
		take: 50,
	});

	return leads.map((lead) => {
		const type = lead.leadType || 'cold';
		const basePrice = LEAD_MARKETPLACE_PRICES[type] || 150;
		const finalPrice = getDiscountedLeadPrice(type, planKey);
		return {
			id: lead.id,
			leadType: type,
			matchScore: lead.matchScore,
			previewData: lead.previewData,
			basePrice,
			discount: PROVIDER_PLANS[planKey]?.discount || 0,
			finalPrice,
			createdAt: lead.createdAt,
		};
	});
};

/**
 * Purchase a lead from the marketplace.
 * Fix 2: Uses $transaction with providerId:null guard to prevent double assignment.
 * Fix 3: Creates purchase record atomically with lead assignment (payment-before-assign).
 * Fix 9: @@unique([providerId, leadId]) in schema prevents duplicate purchases.
 * Fix 10: Free plan cannot purchase.
 */
export const purchaseMarketplaceLead = async (providerId: string, leadId: string) => {
	const sub = await db.providerSubscription.findUnique({ 
		where: { providerId },
		select: { status: true, plan: true, expiryDate: true, metadata: true }
	});

	// Fix 10: Block free plan and inactive subscriptions
	if (!isProviderLeadEligible(sub as any)) {
		throw new AppError('Marketplace access requires an active paid subscription', 403);
	}

	const planKey = sub.plan as ProviderPlanKey;
	const type = (await db.lead.findUnique({ where: { id: leadId }, select: { leadType: true } }))?.leadType || 'cold';
	const basePrice = LEAD_MARKETPLACE_PRICES[type] || 150;
	const discount = PROVIDER_PLANS[planKey]?.discount || 0;
	const finalPrice = getDiscountedLeadPrice(type, planKey);

	// Fix 2 + Fix 3: Atomic transaction — assign lead ONLY if still available
	const result = await db.$transaction(async (tx) => {
		// Verify lead is still available (race guard)
		const lead = await tx.lead.findUnique({ where: { id: leadId } });
		if (!lead) throw new AppError('Lead not found', 404);
		
		// Check 2: Lead Ownership Lock (Strict Guard)
		if (lead.providerId && lead.providerId !== providerId) {
			throw new AppError('Lead already taken', 409);
		}
		if (lead.status !== 'AVAILABLE' && lead.providerId !== providerId) {
			throw new AppError('Lead is no longer available', 409);
		}

		// Fix 9: Create purchase (unique constraint prevents duplicates)
		const purchase = await tx.leadPurchase.create({
			data: {
				providerId,
				leadId,
				price: basePrice,
				discount,
				finalPrice,
				status: 'success',
			},
		});

		// Assign lead atomically with providerId:null check
		await tx.lead.update({
			where: {
				id: leadId,
				providerId: null, // Critical: race condition guard
			},
			data: {
				providerId,
				status: 'PURCHASED',
				purchasedAt: new Date(),
			},
		});

		return purchase;
	});

	logger.info(`[LeadDistribution] Provider purchased marketplace lead`, { providerId, leadId, purchaseId: result.id, finalPrice });

	return {
		purchaseId: result.id,
		leadId,
		basePrice,
		discount,
		finalPrice,
		status: 'success',
	};
};

/**
 * Audit and fix inconsistencies between Payments and Lead Ownership.
 * Check 4: Payment <-> Lead Consistency Check
 */
export const auditLeadConsistency = async () => {
	// Find purchases that say 'success' but the lead belongs to someone else or is null
	const orphanPurchases = await db.leadPurchase.findMany({
		where: { status: 'success' },
		include: { lead: true },
	});

	let fixedCount = 0;
	
	for (const purchase of orphanPurchases) {
		if (purchase.lead.providerId !== purchase.providerId) {
			// Invariant violated: Purchase was successful, but lead is lost/stolen
			// We MUST restore consistency by assigning to the rightful buyer
			await db.lead.update({
				where: { id: purchase.leadId },
				data: { 
					providerId: purchase.providerId,
					status: 'PURCHASED',
					purchasedAt: new Date(),
				},
			});
			fixedCount++;
		}
	}

	if (fixedCount > 0) {
		logger.warn(`[LeadDistribution] Consistency Audit resolved stolen/orphaned purchases`, { totalAudited: orphanPurchases.length, fixedCount });
	}

	return { audited: orphanPurchases.length, fixed: fixedCount };
};

/**
 * Reset weekly lead counters for active/trial/grace providers.
 * Runs before weekly distribution so quota accounting starts clean each week.
 */
export const resetWeeklyLeadCounters = async () => {
	const now = new Date();
	const weekStart = new Date(now);
	const day = weekStart.getDay();
	const diff = day === 0 ? -6 : 1 - day;
	weekStart.setDate(weekStart.getDate() + diff);
	weekStart.setHours(0, 0, 0, 0);

	const updated = await db.providerSubscription.updateMany({
		where: {
			status: { in: ACTIVE_PROVIDER_STATUSES as any },
			plan: { notIn: ['free', 'FREE'] as any },
			OR: [
				{ weekStartsAt: { lt: weekStart } },
				{ leadsUsedThisWeek: { gt: 0 } },
			],
		},
		data: {
			leadsUsedThisWeek: 0,
			weekStartsAt: weekStart,
		},
	});

	logger.info('[LeadDistribution] Weekly lead counters reset', {
		updatedProviders: updated.count,
		weekStart,
	});

	return { reset: updated.count, weekStart };
};
