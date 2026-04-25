import { Request, Response } from 'express';
import {
	createPayout,
	processPayout,
	listPayouts,
	getPayoutDetail,
	retryFailedPayout,
} from '../services/payout.service';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/db';

const ALLOWED_SORT_FIELDS = ['createdAt', 'amountMinor'];

/**
 * POST /v1/admin/payouts
 * Create a new payout for a provider
 */
export const createPayoutController = async (req: Request, res: Response) => {
	try {
		const { providerId, invoiceIds, method } = req.body;
		const idempotencyKey = String(req.headers['idempotency-key'] || '').trim();

		// Validate idempotency key (required)
		if (!idempotencyKey) {
			return res.status(400).json({
				success: false,
				message: 'Idempotency-Key header required',
			});
		}

		// Validate request body
		if (!providerId || typeof providerId !== 'string') {
			return res.status(400).json({
				success: false,
				message: 'Valid providerId required',
			});
		}
		if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
			return res.status(400).json({
				success: false,
				message: 'invoiceIds must be non-empty array',
			});
		}
		if (!['BANK', 'UPI'].includes(method)) {
			return res.status(400).json({
				success: false,
				message: 'method must be BANK or UPI',
			});
		}

		const result = await createPayout({
			providerId,
			invoiceIds,
			method,
			idempotencyKey,
			actorId: String(req.auth?.userId || ''),
		});

		res.status(201).json({
			success: true,
			data: result,
		});
	} catch (error: any) {
		if (error instanceof AppError) {
			res.status(error.statusCode).json({
				success: false,
				message: error.message,
			});
		} else {
			res.status(500).json({
				success: false,
				message: 'Payout creation failed',
				error: error?.message,
			});
		}
	}
};

/**
 * POST /v1/admin/payouts/:id/process
 * Process a pending payout
 */
export const processPayoutController = async (req: Request, res: Response) => {
	try {
		const payoutId = String(req.params.id || '').trim();

		if (!payoutId) {
			return res.status(400).json({
				success: false,
				message: 'Payout ID required',
			});
		}

		const result = await processPayout({
			payoutId,
			actorId: String(req.auth?.userId || ''),
		});

		res.json({
			success: true,
			data: result,
		});
	} catch (error: any) {
		if (error instanceof AppError) {
			res.status(error.statusCode).json({
				success: false,
				message: error.message,
			});
		} else {
			res.status(500).json({
				success: false,
				message: 'Payout processing failed',
				error: error?.message,
			});
		}
	}
};

/**
 * POST /v1/admin/payouts/:id/retry
 * Retry a failed payout
 */
export const retryPayoutController = async (req: Request, res: Response) => {
	try {
		const payoutId = String(req.params.id || '').trim();

		if (!payoutId) {
			return res.status(400).json({
				success: false,
				message: 'Payout ID required',
			});
		}

		const result = await retryFailedPayout({
			payoutId,
			actorId: String(req.auth?.userId || ''),
		});

		res.json({
			success: true,
			data: result,
		});
	} catch (error: any) {
		if (error instanceof AppError) {
			res.status(error.statusCode).json({
				success: false,
				message: error.message,
			});
		} else {
			res.status(500).json({
				success: false,
				message: 'Payout retry failed',
				error: error?.message,
			});
		}
	}
};

/**
 * GET /v1/admin/payouts
 * List payouts with filtering, sorting, pagination
 */
export const listPayoutsController = async (req: Request, res: Response) => {
	try {
		const providerId = String(req.query.providerId || '').trim() || undefined;
		const status = String(req.query.status || '').trim() as
			| 'PENDING'
			| 'PROCESSING'
			| 'COMPLETED'
			| 'FAILED'
			| undefined;
		const from = String(req.query.from || '').trim() || undefined;
		const to = String(req.query.to || '').trim() || undefined;

		let sortBy = String(req.query.sortBy || 'createdAt').trim() as 'createdAt' | 'amountMinor';
		let sortOrder = (String(req.query.sortOrder || 'desc').trim() as 'asc' | 'desc') || 'desc';

		// Validate sort field (allowlist)
		if (!ALLOWED_SORT_FIELDS.includes(sortBy)) {
			return res.status(400).json({
				success: false,
				message: `sortBy must be one of: ${ALLOWED_SORT_FIELDS.join(', ')}`,
			});
		}

		// Validate sort order
		if (!['asc', 'desc'].includes(sortOrder)) {
			sortOrder = 'desc';
		}

		// Pagination
		let page = Math.max(1, Number(req.query.page || 1));
		let limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));

		const result = await listPayouts({
			providerId,
			status,
			from,
			to,
			sortBy,
			sortOrder,
			page,
			limit,
		});

		res.json({
			success: true,
			data: result,
		});
	} catch (error: any) {
		if (error instanceof AppError) {
			res.status(error.statusCode).json({
				success: false,
				message: error.message,
			});
		} else {
			res.status(500).json({
				success: false,
				message: 'List payouts failed',
				error: error?.message,
			});
		}
	}
};

/**
 * GET /v1/admin/payouts/:id
 * Get detailed payout info with items, invoices, audit trail
 */
export const getPayoutDetailController = async (req: Request, res: Response) => {
	try {
		const payoutId = String(req.params.id || '').trim();

		if (!payoutId) {
			return res.status(400).json({
				success: false,
				message: 'Payout ID required',
			});
		}

		const detail = await getPayoutDetail(payoutId);

		res.json({
			success: true,
			data: detail,
		});
	} catch (error: any) {
		if (error instanceof AppError) {
			res.status(error.statusCode).json({
				success: false,
				message: error.message,
			});
		} else {
			res.status(500).json({
				success: false,
				message: 'Get payout detail failed',
				error: error?.message,
			});
		}
	}
};

/**
 * GET /v1/admin/payouts/metrics
 * Get payout metrics: pending amount, completed, failed, volume
 */
export const getPayoutMetricsController = async (req: Request, res: Response) => {
	try {
		const [pendingStats, completedStats, failedStats] = await Promise.all([
			prisma.payout.aggregate({
				where: { status: 'PENDING' },
				_count: true,
				_sum: { amountMinor: true },
			}),
			prisma.payout.aggregate({
				where: { status: 'COMPLETED' },
				_count: true,
				_sum: { amountMinor: true },
			}),
			prisma.payout.aggregate({
				where: { status: 'FAILED' },
				_count: true,
				_sum: { amountMinor: true },
			}),
		]);

		const metrics = {
			pending: {
				count: pendingStats._count || 0,
				totalAmountMinor: (pendingStats._sum?.amountMinor || 0n).toString(),
			},
			completed: {
				count: completedStats._count || 0,
				totalAmountMinor: (completedStats._sum?.amountMinor || 0n).toString(),
			},
			failed: {
				count: failedStats._count || 0,
				totalAmountMinor: (failedStats._sum?.amountMinor || 0n).toString(),
			},
			totalVolume: (
				(pendingStats._sum?.amountMinor || 0n) +
				(completedStats._sum?.amountMinor || 0n) +
				(failedStats._sum?.amountMinor || 0n)
			).toString(),
		};

		res.json({
			success: true,
			data: metrics,
		});
	} catch (error: any) {
		res.status(500).json({
			success: false,
			message: 'Metrics retrieval failed',
			error: error?.message,
		});
	}
};
