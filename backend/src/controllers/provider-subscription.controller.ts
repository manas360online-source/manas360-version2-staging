import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import {
	getProviderSubscription,
	activateProviderSubscription,
	cancelProviderSubscription,
	getProviderLeadStats,
} from '../services/provider-subscription.service';
import { activatePlatformAccess } from '../services/platform-access.service';
import { initiateProviderSubscriptionPayment, initiateProviderPlatformPayment } from '../services/provider-subscription-payment.service';
import { applyCreditsForPayment } from '../services/wallet.service';
import { createPendingSubscriptionComponents } from '../services/provider-subscription.pending.service';
import {
	getProviderLeads,
	getMarketplaceLeads,
	purchaseMarketplaceLead,
} from '../services/lead-distribution.service';
import { LEAD_MARKETPLACE_PRICES, PROVIDER_PLANS, type ProviderPlanKey } from '../config/providerPlans';

const authUserId = (req: Request): string => {
	const id = (req as any).auth?.userId;
	if (!id) throw new AppError('Unauthorized', 401);
	return id;
};

const normalizeProviderPlanKey = (raw: string): ProviderPlanKey => {
	const key = String(raw || '').trim().toLowerCase();
	if (key === 'starter') return 'basic';
	if (key === 'growth') return 'standard';
	if (key === 'scale') return 'premium';
	if (key === 'free' || key === 'basic' || key === 'standard' || key === 'premium') return key;
	throw new AppError('Invalid plan key', 422);
};

const normalizeCycle = (raw: unknown): 'monthly' | 'quarterly' => {
	const cycle = String(raw || 'monthly').trim().toLowerCase();
	if (cycle === 'monthly' || cycle === 'quarterly') return cycle;
	throw new AppError('Invalid billing cycle', 422);
};

const toInt = (value: unknown): number => {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return 0;
	return Math.max(0, Math.round(parsed));
};

/** GET /provider/subscription */
export const getProviderSubscriptionController = async (req: Request, res: Response): Promise<void> => {
	const data = await getProviderSubscription(authUserId(req));
	sendSuccess(res, data, 'Provider subscription fetched');
};

/** PATCH /provider/subscription/upgrade */
export const upgradeProviderSubscriptionController = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	const normalizedPlanKey = normalizeProviderPlanKey(String(req.body.planKey ?? req.body.tier ?? ''));
	const plan = PROVIDER_PLANS[normalizedPlanKey];

	// Free plan: activate immediately
	if (plan.price === 0) {
		const data = await activateProviderSubscription(providerId, normalizedPlanKey);
		sendSuccess(res, data, 'Free plan activated');
		return;
	}

	// Paid plan: initiate payment
	const data = await initiateProviderSubscriptionPayment(providerId, normalizedPlanKey);
	sendSuccess(res, data, 'Payment initiated');
};

/** POST /provider/subscription/checkout */
export const checkoutProviderSubscriptionController = async (req: Request, res: Response): Promise<void> => {
	const providerId = authUserId(req);
	const leadPlanKey = normalizeProviderPlanKey(String(req.body.leadPlanKey ?? req.body.planKey ?? 'free'));
	const platformCycle = normalizeCycle(req.body.platformCycle);
	const acceptedTerms = Boolean(req.body.acceptedTerms);
	if (!acceptedTerms) throw new AppError('Please accept provider terms and revenue split policy', 422);

	const addonInput = req.body.addons || {};
	const hotQty = Math.max(0, Math.min(99, toInt(addonInput.hot)));
	const warmQty = Math.max(0, Math.min(99, toInt(addonInput.warm)));
	const coldQty = Math.max(0, Math.min(99, toInt(addonInput.cold)));

	const platformMinor = platformCycle === 'quarterly' ? 27900 : 9900;
	const plan = PROVIDER_PLANS[leadPlanKey];
	const leadPlanMinor = Math.round(((platformCycle === 'quarterly' ? plan.quarterlyPrice : plan.price) || 0) * 100);
	const addonsMinor = (hotQty * LEAD_MARKETPLACE_PRICES.hot + warmQty * LEAD_MARKETPLACE_PRICES.warm + coldQty * LEAD_MARKETPLACE_PRICES.cold) * 100;
	const expectedSubtotalMinor = platformMinor + leadPlanMinor + addonsMinor;
	const requestedTotalMinor = toInt(req.body.totalMinor);
	const requestedSubtotalMinor = toInt(req.body.subtotalMinor);
	const requestedGstMinor = toInt(req.body.gstMinor);
	const expectedGstMinor = Math.round(expectedSubtotalMinor * 0.18);
	const expectedTotalMinor = expectedSubtotalMinor + expectedGstMinor;

	if (requestedSubtotalMinor > 0 && Math.abs(requestedSubtotalMinor - expectedSubtotalMinor) > 1) {
		throw new AppError('Subtotal mismatch. Please refresh checkout and retry.', 409);
	}

	if (requestedGstMinor > 0 && Math.abs(requestedGstMinor - expectedGstMinor) > 1) {
		throw new AppError('GST mismatch. Please refresh checkout and retry.', 409);
	}

	if (requestedTotalMinor > 0 && Math.abs(requestedTotalMinor - expectedTotalMinor) > 1) {
		throw new AppError('Total mismatch. Please refresh checkout and retry.', 409);
	}

	const idempotencyKey = String(req.body.idempotencyKey || '').trim() || undefined;
	const promoCode = String(req.body.promoCode || '').trim() || undefined;

	let finalAmountMinor = expectedTotalMinor;
	let walletUsedMinor = 0;

	// Auto-apply wallet credits
	const walletResult = await applyCreditsForPayment({
		userId: providerId,
		referenceId: idempotencyKey || `prov_checkout_${Date.now()}`,
		referenceType: 'provider_subscription',
		amountMinor: expectedTotalMinor,
	});

	if (walletResult.amountUsed > 0) {
		walletUsedMinor = walletResult.amountUsed;
		finalAmountMinor = walletResult.finalAmount;
	}

	if (finalAmountMinor <= 0) {
		const activationRef = idempotencyKey || `prov_checkout_${providerId}_${Date.now()}`;
		const activated = await activateProviderSubscription(providerId, leadPlanKey, activationRef);
		await activatePlatformAccess(providerId, platformCycle, activationRef);
		await createPendingSubscriptionComponents({
			providerId,
			leadPlanKey,
			platformCycle,
			addons: { hot: hotQty, warm: warmQty, cold: coldQty },
			merchantTransactionId: activationRef,
			metadata: {
				flow: 'provider_checkout_v2',
				idempotencyKey,
				promoCode,
			},
		});

		sendSuccess(res, {
			planDetails: activated,
			redirectUrl: null,
			breakdown: {
				platformMinor,
				leadPlanMinor,
				addonsMinor,
				expectedSubtotalMinor,
				expectedGstMinor,
				expectedTotalMinor,
				walletUsedMinor,
				finalAmountMinor,
			},
		}, 'Provider subscription activated without external payment');
		return;
	}

	if (leadPlanKey === 'free') {
		const activationRef = idempotencyKey || `prov_checkout_${providerId}_${Date.now()}`;
		const payment = await initiateProviderPlatformPayment(providerId, platformCycle, finalAmountMinor, {
			redirectUrlOverride: `${process.env.FRONTEND_URL || ''}/#/provider/confirmation?mode=activated`,
			idempotencyKey: activationRef,
			requireGateway: true,
		});

		await createPendingSubscriptionComponents({
			providerId,
			leadPlanKey,
			platformCycle,
			addons: { hot: hotQty, warm: warmQty, cold: coldQty },
			merchantTransactionId: payment.transactionId,
			metadata: {
				flow: 'provider_checkout_v2_platform_only',
				idempotencyKey,
				promoCode,
				walletUsedMinor,
			},
		});

		sendSuccess(res, {
			...payment,
			breakdown: {
				platformMinor,
				leadPlanMinor,
				addonsMinor,
				expectedSubtotalMinor,
				expectedGstMinor,
				expectedTotalMinor,
				walletUsedMinor,
				finalAmountMinor,
			},
		}, 'Payment initiated. Redirecting to PhonePe...', 201);
		return;
	}

	// Step 1: Initiate payment
	const payment = await initiateProviderSubscriptionPayment(providerId, leadPlanKey, {
		amountMinorOverride: finalAmountMinor,
		idempotencyKey,
		metadata: {
			flow: 'provider_checkout_v2',
			platformCycle,
			platformMinor,
			leadPlanMinor,
			addons: { hot: hotQty, warm: warmQty, cold: coldQty },
			expectedSubtotalMinor,
			expectedGstMinor,
			expectedTotalMinor,
			promoCode,
		},
	});

	// Step 2: Create pending subscription components (Phase 2)
	// These records enable atomic activation on webhook success
	const pending = await createPendingSubscriptionComponents({
		providerId,
		leadPlanKey,
		platformCycle,
		addons: { hot: hotQty, warm: warmQty, cold: coldQty },
		merchantTransactionId: payment.transactionId,
		metadata: {
			flow: 'provider_checkout_v2',
			idempotencyKey,
			promoCode,
		},
	});

	sendSuccess(res, {
		...payment,
		pending: {
			createdCount: pending.createdCount,
			components: {
				platformAccess: Boolean(pending.platformPending),
				leadPlan: Boolean(pending.leadPlanPending),
				marketplaceLeads: Boolean(pending.marketplacePending),
			},
		},
		breakdown: {
			platformMinor,
			leadPlanMinor,
			addonsMinor,
			expectedSubtotalMinor,
			expectedGstMinor,
			expectedTotalMinor,
			walletUsedMinor,
			finalAmountMinor,
		},
	}, 'Provider checkout initiated (with pending components)');
};

/** PATCH /provider/subscription/cancel */
export const cancelProviderSubscriptionController = async (req: Request, res: Response): Promise<void> => {
	const data = await cancelProviderSubscription(authUserId(req));
	sendSuccess(res, data, 'Subscription cancelled');
};

/** GET /provider/leads */
export const getProviderLeadsController = async (req: Request, res: Response): Promise<void> => {
	const data = await getProviderLeads(authUserId(req));
	sendSuccess(res, data, 'Provider leads fetched');
};

/** GET /provider/lead-stats */
export const getProviderLeadStatsController = async (req: Request, res: Response): Promise<void> => {
	const data = await getProviderLeadStats(authUserId(req));
	sendSuccess(res, data, 'Lead stats fetched');
};

/** GET /provider/marketplace */
export const getProviderMarketplaceController = async (req: Request, res: Response): Promise<void> => {
	const data = await getMarketplaceLeads(authUserId(req));
	sendSuccess(res, data, 'Marketplace leads fetched');
};

/** POST /provider/marketplace/purchase */
export const purchaseMarketplaceLeadController = async (req: Request, res: Response): Promise<void> => {
	const { leadId } = req.body;
	if (!leadId) throw new AppError('leadId is required', 422);

	const data = await purchaseMarketplaceLead(authUserId(req), leadId);
	sendSuccess(res, data, 'Lead purchased successfully');
};

/** GET /provider/plans — public plan list */
export const getProviderPlansController = async (_req: Request, res: Response): Promise<void> => {
	const plans = Object.entries(PROVIDER_PLANS).map(([key, plan]) => ({
		key,
		...plan,
	}));
	sendSuccess(res, plans, 'Provider plans fetched');
};
