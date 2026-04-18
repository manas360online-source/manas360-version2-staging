import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import { prisma } from '../config/db';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

/**
 * SHARED CONTROLLERS
 * ===================
 * Endpoints shared across multiple features
 * Plans, pricing, public data, etc.
 */

const PLAN_CACHE_TTL_SECONDS = 300;
const singlePlanCacheKey = (type: string, planId: string) => `plans:${type}:${planId}`;
const allPlansCacheKey = (type: string) => `plans:${type}:all`;

const readJsonCache = async <T>(key: string): Promise<T | null> => {
	try {
		const cached = await redis.get(key);
		if (!cached) return null;
		return JSON.parse(cached) as T;
	} catch {
		return null;
	}
};

const writeJsonCache = async (key: string, payload: unknown): Promise<void> => {
	try {
		await redis.set(key, JSON.stringify(payload), PLAN_CACHE_TTL_SECONDS);
	} catch {
		// Best-effort cache write.
	}
};

export const getPlanController = async (req: Request, res: Response): Promise<void> => {
	const type = String(req.params.type ?? '').trim().toLowerCase();
	const planId = String(req.params.planId ?? '').trim();

	if (!['provider', 'patient'].includes(type)) {
		throw new AppError('Invalid type. Must be "provider" or "patient"', 422);
	}

	if (!planId) {
		throw new AppError('planId is required', 422);
	}

	const planCacheKey = singlePlanCacheKey(type, planId);
	const cachedPlan = await readJsonCache<any>(planCacheKey);
	if (cachedPlan) {
		sendSuccess(res, { plan: cachedPlan }, 'Plan details retrieved', 200);
		return;
	}

	try {
		let plan: any;

		if (type === 'provider') {
			// Fetch provider/lead plan
			plan = await getProviderPlan(planId);
		} else if (type === 'patient') {
			// Fetch patient subscription plan
			plan = await getPatientPlan(planId);
		}

		if (!plan) {
			throw new AppError('Plan not found', 404);
		}

		await writeJsonCache(planCacheKey, plan);

		sendSuccess(res, { plan }, 'Plan details retrieved', 200);
	} catch (error: any) {
		if (error instanceof AppError) throw error;
		logger.error('[Shared.GetPlan] Error', { type, planId, error: error?.message });
		throw new AppError('Failed to fetch plan: ' + error?.message, 500);
	}
};

/**
 * Get provider lead plan details
 */
async function getProviderPlan(planId: string) {
	// Fetch from ProviderPlanConfig (JSON 'data' field)
	const config = await prisma.providerPlanConfig.findFirst({
		orderBy: { createdAt: 'desc' }
	});

	if (config && typeof config.data === 'object' && config.data !== null) {
		const plans = config.data as Record<string, any>;
		return plans[planId] || null;
	}

	// Fallback to minimal mock if DB is empty
	const fallbackPlans: Record<string, any> = {
		'lead-free': { id: 'lead-free', name: 'Free Plan', baseAmount: 0, gstPercentage: 18 },
		'lead-basic': { id: 'lead-basic', name: 'Basic Plan', baseAmount: 99, gstPercentage: 18 },
	};
	return fallbackPlans[planId] || null;
}

/**
 * Get patient subscription plan details
 */
async function getPatientPlan(planId: string) {
	// Fetch from PatientPlanConfig
	const plan = await prisma.patientPlanConfig.findUnique({
		where: { key: planId }
	});

	if (plan) {
		return {
			id: plan.key,
			name: plan.name,
			baseAmount: plan.price,
			gstPercentage: 18,
			active: plan.active
		};
	}

	return null;
}

/**
 * Get all plans for a type
 */
export const getAllPlansController = async (req: Request, res: Response): Promise<void> => {
	const type = String(req.params.type ?? '').trim().toLowerCase();

	if (!['provider', 'patient'].includes(type)) {
		throw new AppError('Invalid type. Must be "provider" or "patient"', 422);
	}

	const plansCacheKey = allPlansCacheKey(type);
	const cachedPlans = await readJsonCache<any[]>(plansCacheKey);
	if (cachedPlans) {
		sendSuccess(res, { plans: cachedPlans }, 'Plans retrieved', 200);
		return;
	}

	try {
		let plans: any[];

		if (type === 'provider') {
			plans = await getAllProviderPlans();
		} else if (type === 'patient') {
			plans = await getAllPatientPlans();
		} else {
			plans = [];
		}

		await writeJsonCache(plansCacheKey, plans);
		sendSuccess(res, { plans }, 'Plans retrieved', 200);
	} catch (error: any) {
		if (error instanceof AppError) throw error;
		logger.error('[Shared.GetAllPlans] Error', { type, error: error?.message });
		throw new AppError('Failed to fetch plans: ' + error?.message, 500);
	}
};

async function getAllProviderPlans() {
	const config = await prisma.providerPlanConfig.findFirst({
		orderBy: { createdAt: 'desc' }
	});

	if (config && typeof config.data === 'object' && config.data !== null) {
		const plans = config.data as Record<string, any>;
		return Object.entries(plans).map(([id, details]) => ({ id, ...details }));
	}

	return [];
}

async function getAllPatientPlans() {
	const configs = await prisma.patientPlanConfig.findMany({
		where: { active: true },
		orderBy: { price: 'asc' }
	});

	return configs.map(c => ({
		id: c.key,
		name: c.name,
		baseAmount: c.price,
		gstPercentage: 18
	}));
}
