import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { buildPaginationMeta, normalizePagination } from '../utils/pagination';
import { randomUUID } from 'crypto';

const db = prisma as any;

interface TherapistLeadsQuery {
	status?: 'available' | 'purchased';
	page: number;
	limit: number;
}

const assertTherapistUser = async (userId: string): Promise<void> => {
	const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });

	if (!user) {
		throw new AppError('User not found', 404);
	}

	if (String(user.role) !== 'THERAPIST') {
		throw new AppError('Therapist role required', 403);
	}
};

export const getMyTherapistLeads = async (userId: string, query: TherapistLeadsQuery) => {
	await assertTherapistUser(userId);
	const now = new Date();

	const pagination = normalizePagination(
		{ page: query.page, limit: query.limit },
		{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
	);

	// Do not return unassigned leads (providerId: null) to avoid exposing newly-registered
	// patients to all therapists. Therapists will only see leads reserved for them
	// (paymentStatus: 'INITIATED') or leads they have purchased.
	const availableWhere = {
		status: 'AVAILABLE',
		providerId: userId,
		OR: [
			{ channel: 'CONSUMER' },
			{ channel: 'B2B_INSTITUTIONAL', visibleAt: { lte: now } },
		],
		AND: [
			{
				OR: [
					{ channel: 'B2B_INSTITUTIONAL' },
					{ channel: 'CONSUMER', paymentStatus: 'INITIATED' },
				],
			},
		],
	};

	const purchasedWhere = { status: 'PURCHASED', providerId: userId };

	const where = query.status
		? query.status === 'available'
			? availableWhere
			: purchasedWhere
		: {
			OR: [availableWhere, purchasedWhere],
		};

	const [total, leads] = await Promise.all([
		db.lead.count({ where }),
		db.lead.findMany({
			where,
			orderBy: [{ createdAt: 'desc' }],
			skip: pagination.skip,
			take: pagination.limit,
			select: {
				id: true,
				status: true,
				channel: true,
				tier: true,
				visibleAt: true,
				paymentStatus: true,
				merchantTransactionId: true,
				matchScore: true,
				amountMinor: true,
				currency: true,
				previewData: true,
				patientAcceptanceUntil: true,
				providerContactedAt: true,
				purchasedAt: true,
				createdAt: true,
				patientId: true,
				providerId: true,
			},
		}),
	]);

	return {
		items: leads,
		meta: buildPaginationMeta(total, pagination),
	};
};

export const initiateMyTherapistLeadPurchase = async (userId: string, leadId: string) => {
	await assertTherapistUser(userId);

	const now = new Date();

	const reservedLead = await db.$transaction(async (tx: any) => {
		const lead = await tx.lead.findUnique({
			where: { id: leadId },
			select: {
				id: true,
				status: true,
				providerId: true,
				amountMinor: true,
				currency: true,
				expiresAt: true,
				patientAcceptanceUntil: true,
				paymentStatus: true,
				merchantTransactionId: true,
			},
		});

		if (!lead) {
			throw new AppError('Lead not found', 404, { leadId });
		}

		if (lead.status === 'PURCHASED' && lead.providerId === userId) {
			return lead;
		}

		if (lead.status !== 'AVAILABLE') {
			throw new AppError('Lead is no longer available', 409, { leadId, status: lead.status });
		}

		if (lead.patientAcceptanceUntil && lead.patientAcceptanceUntil < now) {
			throw new AppError('Lead acceptance window has expired', 409, { leadId });
		}

		if (lead.expiresAt && lead.expiresAt < now) {
			throw new AppError('Lead has expired', 409, { leadId });
		}

		if (lead.providerId && lead.providerId !== userId) {
			throw new AppError('Lead is reserved by another therapist', 409, { leadId });
		}

		const reserve = await tx.lead.updateMany({
			where: {
				id: leadId,
				status: 'AVAILABLE',
				OR: [{ providerId: null }, { providerId: userId }],
			},
			data: {
				providerId: userId,
				paymentStatus: 'INITIATED',
				idempotencyKey: randomUUID(),
			},
		});

		if (reserve.count !== 1) {
			throw new AppError('Lead is no longer available', 409, { leadId });
		}

		return tx.lead.findUnique({
			where: { id: leadId },
			select: {
				id: true,
				amountMinor: true,
				currency: true,
				providerId: true,
				status: true,
				paymentStatus: true,
					merchantTransactionId: true,
			},
		});
	});

	if (!reservedLead) {
		throw new AppError('Unable to reserve lead for payment', 409, { leadId });
	}

	// Note: Order creation removed (was Razorpay)

	await db.lead.updateMany({
		where: {
			id: leadId,
			providerId: userId,
			status: 'AVAILABLE',
			paymentStatus: 'INITIATED',
		},
		data: {
			merchantTransactionId: `LEAD_${Date.now()}_${leadId.slice(0, 8)}`,
		},
	});

	return {
		leadId,
		paymentRequired: true,
		amountMinor: Number(reservedLead.amountMinor),
		currency: String(reservedLead.currency ?? 'INR'),
		merchantTransactionId: `LEAD_${Date.now()}_${leadId.slice(0, 8)}`,
	};
};

export const confirmMyTherapistLeadPurchase = async (
	userId: string,
	leadId: string,
	input: { merchantTransactionId: string; transactionId: string; signature: string },
) => {
	await assertTherapistUser(userId);

	// Note: PhonePe uses webhook for verification, signature check removed

	const now = new Date();

	const result = await db.$transaction(async (tx: any) => {
		const lead = await tx.lead.findUnique({
			where: { id: leadId },
			select: {
				id: true,
				status: true,
				providerId: true,
				amountMinor: true,
				currency: true,
				paymentStatus: true,
				merchantTransactionId: true,
				razorpayPaymentId: true,
			},
		});

		if (!lead) {
			throw new AppError('Lead not found', 404, { leadId });
		}

		if (lead.providerId !== userId) {
			throw new AppError('Lead is reserved by another therapist', 403, { leadId });
		}

		if (lead.merchantTransactionId !== input.merchantTransactionId) {
			throw new AppError('Order id does not match reserved lead', 409, { leadId });
		}

		if (lead.status === 'PURCHASED' && lead.paymentStatus === 'CAPTURED') {
			return {
				id: lead.id,
				status: lead.status,
				paymentStatus: lead.paymentStatus,
				providerId: lead.providerId,
				amountMinor: lead.amountMinor,
				currency: lead.currency,
				merchantTransactionId: lead.merchantTransactionId,
				razorpayPaymentId: lead.razorpayPaymentId,
			};
		}

		const update = await tx.lead.updateMany({
			where: {
				id: leadId,
				providerId: userId,
				status: 'AVAILABLE',
				paymentStatus: 'INITIATED',
				merchantTransactionId: input.merchantTransactionId,
			},
			data: {
				status: 'PURCHASED',
				paymentStatus: 'CAPTURED',
				razorpayPaymentId: input.transactionId,
				paymentCapturedAt: now,
				purchasedAt: now,
			},
		});

		if (update.count !== 1) {
			throw new AppError('Lead payment confirmation conflict', 409, { leadId });
		}

		await tx.revenueLedger.create({
			data: {
				type: 'CONTENT',
				grossAmountMinor: lead.amountMinor,
				platformCommissionMinor: lead.amountMinor,
				providerShareMinor: 0,
				paymentType: 'PLATFORM_FEE',
				taxAmountMinor: 0,
				currency: lead.currency,
				referenceId: `lead:${lead.id}`,
			},
		});

		return tx.lead.findUnique({
			where: { id: leadId },
			select: {
				id: true,
				status: true,
				paymentStatus: true,
				providerId: true,
				purchasedAt: true,
				amountMinor: true,
				currency: true,
				merchantTransactionId: true,
				razorpayPaymentId: true,
			},
		});
	});

	return {
		lead: result,
	};
};

export const purchaseMyTherapistLead = async (userId: string, leadId: string) => {
	await assertTherapistUser(userId);

	const now = new Date();

	const purchasedLead = await db.$transaction(async (tx: any) => {
		const lead = await tx.lead.findUnique({
			where: { id: leadId },
			select: {
				id: true,
				status: true,
				providerId: true,
				expiresAt: true,
				patientAcceptanceUntil: true,
			},
		});

		if (!lead) {
			throw new AppError('Lead not found', 404, { leadId });
		}

		if (lead.status !== 'AVAILABLE') {
			throw new AppError('Lead is no longer available', 409, { leadId, status: lead.status });
		}

		if (lead.patientAcceptanceUntil && lead.patientAcceptanceUntil < now) {
			throw new AppError('Lead acceptance window has expired', 409, { leadId });
		}

		if (lead.expiresAt && lead.expiresAt < now) {
			throw new AppError('Lead has expired', 409, { leadId });
		}

		const updateResult = await tx.lead.updateMany({
			where: {
				id: leadId,
				status: 'AVAILABLE',
				providerId: null,
			},
			data: {
				providerId: userId,
				status: 'PURCHASED',
				purchasedAt: now,
			},
		});

		if (updateResult.count !== 1) {
			throw new AppError('Lead is no longer available', 409, { leadId });
		}

		return tx.lead.findUnique({
			where: { id: leadId },
			select: {
				id: true,
				status: true,
				providerId: true,
				purchasedAt: true,
				amountMinor: true,
				currency: true,
				patientId: true,
			},
		});
	});

	return {
		lead: purchasedLead,
	};
};
