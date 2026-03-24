import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import {
	getProviderSubscription,
	activateProviderSubscription,
	cancelProviderSubscription,
	getProviderLeadStats,
} from '../services/provider-subscription.service';
import { initiateProviderSubscriptionPayment } from '../services/provider-subscription-payment.service';
import {
	getProviderLeads,
	getMarketplaceLeads,
	purchaseMarketplaceLead,
} from '../services/lead-distribution.service';
import { PROVIDER_PLANS, type ProviderPlanKey } from '../config/providerPlans';

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
