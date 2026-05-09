import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import {
	getPaymentReliabilityDetail,
	getPaymentReliabilityMetrics,
	listPaymentReliability,
	retryPaymentFromReliability,
} from '../services/payment-reliability.service';

const asEnum = <T extends string>(value: unknown, allowed: T[]): T | undefined => {
	const text = String(value || '').trim().toUpperCase();
	if (!text) return undefined;
	return allowed.includes(text as T) ? (text as T) : undefined;
};

export const listPaymentReliabilityController = async (req: Request, res: Response): Promise<void> => {
	const result = await listPaymentReliability({
		page: Number(req.query.page || 1),
		limit: Number(req.query.limit || 20),
		status: asEnum(req.query.status, ['FAILED', 'PENDING', 'SUCCESS']),
		riskLevel: asEnum(req.query.riskLevel, ['HIGH', 'MEDIUM', 'LOW']),
		provider: asEnum(req.query.provider, ['PHONEPE']) as 'PHONEPE' | undefined,
		from: String(req.query.from || '').trim() || undefined,
		to: String(req.query.to || '').trim() || undefined,
		sortBy: asEnum(req.query.sortBy, ['CREATEDAT', 'AMOUNTMINOR', 'RETRYCOUNT'])
			? ({ CREATEDAT: 'createdAt', AMOUNTMINOR: 'amountMinor', RETRYCOUNT: 'retryCount' } as const)[String(req.query.sortBy || '').trim().toUpperCase() as 'CREATEDAT' | 'AMOUNTMINOR' | 'RETRYCOUNT']
			: undefined,
		sortOrder: asEnum(req.query.sortOrder, ['ASC', 'DESC'])
			? String(req.query.sortOrder).trim().toLowerCase() as 'asc' | 'desc'
			: undefined,
	});

	sendSuccess(res, result, 'Payment reliability list fetched successfully');
};

export const getPaymentReliabilityMetricsController = async (req: Request, res: Response): Promise<void> => {
	const result = await getPaymentReliabilityMetrics({
		provider: asEnum(req.query.provider, ['PHONEPE']) as 'PHONEPE' | undefined,
		from: String(req.query.from || '').trim() || undefined,
		to: String(req.query.to || '').trim() || undefined,
	});
	sendSuccess(res, result, 'Payment reliability metrics fetched successfully');
};

export const getPaymentReliabilityDetailController = async (req: Request, res: Response): Promise<void> => {
	const paymentId = String(req.params.id || '').trim();
	if (!paymentId) throw new AppError('payment id is required', 400);
	const result = await getPaymentReliabilityDetail(paymentId);
	sendSuccess(res, result, 'Payment reliability detail fetched successfully');
};

export const retryPaymentReliabilityController = async (req: Request, res: Response): Promise<void> => {
	const paymentId = String(req.params.paymentId || '').trim();
	if (!paymentId) throw new AppError('paymentId is required', 400);
	const actorUserId = String(req.auth?.userId || '').trim();
	if (!actorUserId) throw new AppError('Authentication required', 401);

	const idempotencyKey = String(req.headers['idempotency-key'] || '').trim() || undefined;
	const result = await retryPaymentFromReliability({
		paymentId,
		actorUserId,
		actorRole: req.auth?.role,
		idempotencyKey,
		reason: String(req.body?.reason || '').trim() || undefined,
	});

	sendSuccess(res, result, 'Payment retry scheduled successfully');
};
