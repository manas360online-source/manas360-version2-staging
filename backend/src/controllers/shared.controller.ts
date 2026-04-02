import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import { prisma } from '../config/db';
import { logger } from '../utils/logger';

/**
 * SHARED CONTROLLERS
 * ===================
 * Endpoints shared across multiple features
 * Plans, pricing, public data, etc.
 */

export const getPlanController = async (req: Request, res: Response): Promise<void> => {
	const type = String(req.params.type ?? '').trim().toLowerCase();
	const planId = String(req.params.planId ?? '').trim();

	if (!['provider', 'patient'].includes(type)) {
		throw new AppError('Invalid type. Must be "provider" or "patient"', 422);
	}

	if (!planId) {
		throw new AppError('planId is required', 422);
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
	// TODO: Replace with actual database query to ProviderSubscriptionPlan or similar table
	// For now, return mock data structure

	const plans: Record<string, any> = {
		'lead-basic': {
			id: 'lead-basic',
			name: 'Basic Plan',
			description: 'Get started with lead distribution',
			baseAmount: 99,
			gstPercentage: 18,
			features: [
				'Up to 10 leads per month',
				'Email support',
				'Basic analytics',
			],
			validityDays: 30,
		},
		'lead-standard': {
			id: 'lead-standard',
			name: 'Standard Plan',
			description: 'Scale your business',
			baseAmount: 299,
			gstPercentage: 18,
			features: [
				'Up to 50 leads per month',
				'Priority email support',
				'Advanced analytics',
				'Lead filtering',
			],
			validityDays: 30,
		},
		'lead-premium': {
			id: 'lead-premium',
			name: 'Premium Plan',
			description: 'Maximize your reach',
			baseAmount: 599,
			gstPercentage: 18,
			features: [
				'Unlimited leads',
				'24/7 phone support',
				'Real-time analytics',
				'Lead filtering',
				'Priority placement',
			],
			validityDays: 30,
		},
	};

	return plans[planId] || null;
}

/**
 * Get patient subscription plan details
 */
async function getPatientPlan(planId: string) {
	// TODO: Replace with actual database query to PatientSubscriptionPlan or similar table
	// For now, return mock data structure

	const plans: Record<string, any> = {
		'patient-free': {
			id: 'patient-free',
			name: 'Free Plan',
			description: 'Start your wellness journey',
			baseAmount: 0,
			gstPercentage: 18,
			features: [
				'Basic mood tracking',
				'Community access',
				'Limited resources',
			],
			validityDays: null, // No expiry
		},
		'patient-1month': {
			id: 'patient-1month',
			name: '1 Month Plan',
			description: 'Premium access for 1 month',
			baseAmount: 99,
			gstPercentage: 18,
			features: [
				'Unlimited mood tracking',
				'Personalized coaching',
				'Premium resources',
				'Session bookings',
			],
			validityDays: 30,
		},
		'patient-3month': {
			id: 'patient-3month',
			name: '3 Month Plan',
			description: 'Premium access for 3 months',
			baseAmount: 249,
			gstPercentage: 18,
			features: [
				'Unlimited mood tracking',
				'Personalized coaching',
				'Premium resources',
				'Session bookings',
				'Priority support',
			],
			validityDays: 90,
		},
		'patient-1year': {
			id: 'patient-1year',
			name: '1 Year Plan',
			description: 'Best value annual plan',
			baseAmount: 799,
			gstPercentage: 18,
			features: [
				'Unlimited mood tracking',
				'Personalized coaching',
				'Premium resources',
				'Unlimited sessions',
				'24/7 priority support',
				'Exclusive events access',
			],
			validityDays: 365,
		},
	};

	return plans[planId] || null;
}

/**
 * Get all plans for a type
 */
export const getAllPlansController = async (req: Request, res: Response): Promise<void> => {
	const type = String(req.params.type ?? '').trim().toLowerCase();

	if (!['provider', 'patient'].includes(type)) {
		throw new AppError('Invalid type. Must be "provider" or "patient"', 422);
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

		sendSuccess(res, { plans }, 'Plans retrieved', 200);
	} catch (error: any) {
		if (error instanceof AppError) throw error;
		logger.error('[Shared.GetAllPlans] Error', { type, error: error?.message });
		throw new AppError('Failed to fetch plans: ' + error?.message, 500);
	}
};

async function getAllProviderPlans() {
	const plans: Record<string, any> = {
		'lead-basic': {
			id: 'lead-basic',
			name: 'Basic Plan',
			description: 'Get started with lead distribution',
			baseAmount: 99,
			gstPercentage: 18,
			features: ['Up to 10 leads per month', 'Email support', 'Basic analytics'],
			validityDays: 30,
		},
		'lead-standard': {
			id: 'lead-standard',
			name: 'Standard Plan',
			description: 'Scale your business',
			baseAmount: 299,
			gstPercentage: 18,
			features: ['Up to 50 leads per month', 'Priority email support', 'Advanced analytics', 'Lead filtering'],
			validityDays: 30,
		},
		'lead-premium': {
			id: 'lead-premium',
			name: 'Premium Plan',
			description: 'Maximize your reach',
			baseAmount: 599,
			gstPercentage: 18,
			features: ['Unlimited leads', '24/7 phone support', 'Real-time analytics', 'Lead filtering', 'Priority placement'],
			validityDays: 30,
		},
	};

	return Object.values(plans);
}

async function getAllPatientPlans() {
	const plans: Record<string, any> = {
		'patient-free': {
			id: 'patient-free',
			name: 'Free Plan',
			description: 'Start your wellness journey',
			baseAmount: 0,
			gstPercentage: 18,
			features: ['Basic mood tracking', 'Community access', 'Limited resources'],
			validityDays: null,
		},
		'patient-1month': {
			id: 'patient-1month',
			name: '1 Month Plan',
			description: 'Premium access for 1 month',
			baseAmount: 99,
			gstPercentage: 18,
			features: ['Unlimited mood tracking', 'Personalized coaching', 'Premium resources', 'Session bookings'],
			validityDays: 30,
		},
		'patient-3month': {
			id: 'patient-3month',
			name: '3 Month Plan',
			description: 'Premium access for 3 months',
			baseAmount: 249,
			gstPercentage: 18,
			features: ['Unlimited mood tracking', 'Personalized coaching', 'Premium resources', 'Session bookings', 'Priority support'],
			validityDays: 90,
		},
		'patient-1year': {
			id: 'patient-1year',
			name: '1 Year Plan',
			baseAmount: 799,
			gstPercentage: 18,
			features: [
				'Unlimited mood tracking',
				'Personalized coaching',
				'Premium resources',
				'Unlimited sessions',
				'24/7 priority support',
				'Exclusive events access',
			],
			validityDays: 365,
		},
	};

	return Object.values(plans);
}
