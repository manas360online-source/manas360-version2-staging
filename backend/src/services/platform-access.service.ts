import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/db';
import { initiateProviderPlatformPayment } from './provider-subscription-payment.service';

const db = prisma as any;

const PLATFORM_ACCESS_PRICES: Record<string, number> = {
	monthly: 9900,    // ₹99 in paise
	quarterly: 27900, // ₹279 in paise
};

const getDurationDays = (billingCycle: string): number =>
	billingCycle === 'quarterly' ? 90 : 30;

/** Get platform access status for a provider */
export const getPlatformAccessStatus = async (providerId: string) => {
	const record = await db.platformAccess.findUnique({
		where: { providerId },
	});

	if (!record) {
		return {
			isActive: false,
			status: 'none',
			expiryDate: null,
			billingCycle: null,
			autoRenew: false,
			amountMinor: null,
		};
	}

	const now = new Date();
	const isActive = record.status === 'active' && new Date(record.expiryDate) > now;

	return {
		isActive,
		status: isActive ? 'active' : record.status,
		expiryDate: record.expiryDate,
		billingCycle: record.billingCycle,
		autoRenew: record.autoRenew,
		amountMinor: record.amountMinor,
		startDate: record.startDate,
	};
};

/** Check if provider's platform access is currently active */
export const isPlatformAccessActive = async (providerId: string): Promise<boolean> => {
	const status = await getPlatformAccessStatus(providerId);
	return status.isActive;
};

/** Initiate PhonePe payment for platform access */
export const initiatePlatformAccessPayment = async (
	providerId: string,
	billingCycle: 'monthly' | 'quarterly',
) => {
	if (!PLATFORM_ACCESS_PRICES[billingCycle]) {
		throw new AppError('Invalid billing cycle', 422);
	}

	const amountMinor = PLATFORM_ACCESS_PRICES[billingCycle];

	// Use existing payment service, passing platform access metadata
	return initiateProviderPlatformPayment(providerId, billingCycle, amountMinor);
};

/** Activate / renew platform access after successful payment */
export const activatePlatformAccess = async (
	providerId: string,
	billingCycle: string,
	paymentId: string,
) => {
	const amountMinor = PLATFORM_ACCESS_PRICES[billingCycle] || 9900;
	const durationDays = getDurationDays(billingCycle);
	const startDate = new Date();
	const expiryDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

	const record = await db.platformAccess.upsert({
		where: { providerId },
		create: {
			providerId,
			billingCycle,
			amountMinor,
			status: 'active',
			autoRenew: true,
			startDate,
			expiryDate,
			paymentId,
		},
		update: {
			billingCycle,
			amountMinor,
			status: 'active',
			autoRenew: true,
			startDate,
			expiryDate,
			paymentId,
		},
	});

	return record;
};

/** Cancel platform access */
export const cancelPlatformAccess = async (providerId: string) => {
	const record = await db.platformAccess.findUnique({ where: { providerId } });
	if (!record) throw new AppError('No platform access record found', 404);

	return db.platformAccess.update({
		where: { providerId },
		data: { status: 'cancelled', autoRenew: false },
	});
};
