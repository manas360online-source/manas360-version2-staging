import crypto from 'crypto';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { POLICY_VERSION } from '../middleware/rbac.middleware';

type ReliabilityStatusFilter = 'FAILED' | 'PENDING' | 'SUCCESS';
type ReliabilityRiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';
type ReliabilitySortBy = 'createdAt' | 'amountMinor' | 'retryCount';
type SortOrder = 'asc' | 'desc';

const MAX_MANUAL_RETRY_LIMIT = 5;
const RETRY_COOLDOWN_MS = 60_000;

const hashPayload = (payload: unknown): string =>
	crypto.createHash('sha256').update(JSON.stringify(payload || {})).digest('hex');

const riskFromRetryCount = (retryCount: number): ReliabilityRiskLevel => {
	if (retryCount > 3) return 'HIGH';
	if (retryCount > 1) return 'MEDIUM';
	return 'LOW';
};

const externalStatusFromDb = (status: string): ReliabilityStatusFilter => {
	if (status === 'CAPTURED') return 'SUCCESS';
	if (status === 'FAILED' || status === 'EXPIRED') return 'FAILED';
	return 'PENDING';
};

const dbStatusesFromFilter = (status?: ReliabilityStatusFilter): string[] | undefined => {
	if (!status) return undefined;
	if (status === 'SUCCESS') return ['CAPTURED'];
	if (status === 'FAILED') return ['FAILED', 'EXPIRED'];
	return ['INITIATED', 'PENDING_CAPTURE'];
};

const normalizeDate = (value?: string, endOfDay = false): Date | undefined => {
	const raw = String(value || '').trim();
	if (!raw) return undefined;
	const date = new Date(raw);
	if (Number.isNaN(date.getTime())) return undefined;
	if (endOfDay) {
		date.setHours(23, 59, 59, 999);
	}
	return date;
};

const asNumber = (value: unknown): number => {
	if (typeof value === 'number') return value;
	if (typeof value === 'bigint') return Number(value);
	const converted = Number(value);
	return Number.isFinite(converted) ? converted : 0;
};

const extractGatewayResponse = (metadata: unknown): unknown => {
	if (!metadata || typeof metadata !== 'object') return null;
	const data = metadata as Record<string, unknown>;
	return data.gatewayResponse || data.phonepeStatusResponse || data.phonepeVerifyResponse || data.lastGatewayResponse || null;
};

const extractFailureReason = (payment: { failureReason?: string | null; metadata?: unknown }): string | null => {
	if (payment.failureReason) return String(payment.failureReason);
	if (!payment.metadata || typeof payment.metadata !== 'object') return null;
	const metadata = payment.metadata as Record<string, unknown>;
	const reason = metadata.declineReason || metadata.failedReason || metadata.reason;
	return reason ? String(reason) : null;
};

const buildWhere = (input: {
	status?: ReliabilityStatusFilter;
	provider?: string;
	from?: string;
	to?: string;
	riskLevel?: ReliabilityRiskLevel;
}) => {
	const statuses = dbStatusesFromFilter(input.status);
	const from = normalizeDate(input.from);
	const to = normalizeDate(input.to, true);

	const where: Record<string, unknown> = {
		...(statuses ? { status: { in: statuses } } : {}),
		...(input.provider ? { providerGateway: String(input.provider).trim().toUpperCase() } : {}),
		...((from || to)
			? {
				createdAt: {
					...(from ? { gte: from } : {}),
					...(to ? { lte: to } : {}),
				},
			}
			: {}),
	};

	return where;
};

export const listPaymentReliability = async (input: {
	page?: number;
	limit?: number;
	status?: ReliabilityStatusFilter;
	riskLevel?: ReliabilityRiskLevel;
	provider?: 'PHONEPE';
	from?: string;
	to?: string;
	sortBy?: ReliabilitySortBy;
	sortOrder?: SortOrder;
}) => {
	const page = Math.max(1, Number(input.page || 1));
	const limit = Math.min(100, Math.max(1, Number(input.limit || 20)));
	const skip = (page - 1) * limit;
	const sortBy = (['createdAt', 'amountMinor', 'retryCount'] as const).includes((input.sortBy || 'createdAt') as ReliabilitySortBy)
		? (input.sortBy || 'createdAt')
		: 'createdAt';
	const sortOrder: SortOrder = input.sortOrder === 'asc' ? 'asc' : 'desc';
	const where = buildWhere(input);

	const [rows, totalItems] = await Promise.all([
		prisma.financialPayment.findMany({
			where: where as any,
			skip,
			take: limit,
			orderBy: { [sortBy]: sortOrder } as any,
			select: {
				id: true,
				merchantTransactionId: true,
				providerGateway: true,
				status: true,
				amountMinor: true,
				currency: true,
				retryCount: true,
				nextRetryAt: true,
				failureReason: true,
				createdAt: true,
				updatedAt: true,
				capturedAt: true,
				failedAt: true,
				patientId: true,
				providerId: true,
				metadata: true,
			},
		}),
		prisma.financialPayment.count({ where: where as any }),
	]);

	const userIds = Array.from(new Set(rows.map((row) => String(row.patientId || '')).filter(Boolean)));
	const users: Array<{ id: string; email: string | null; name: string | null; firstName: string | null; lastName: string | null }> = userIds.length > 0
		? await prisma.user.findMany({
			where: { id: { in: userIds } },
			select: { id: true, email: true, name: true, firstName: true, lastName: true },
		})
		: [];
	const userById = new Map(users.map((user) => [user.id, user]));

	const mapped = rows
		.map((row) => {
			const retryCount = Number(row.retryCount || 0);
			const riskLevel = riskFromRetryCount(retryCount);
			if (input.riskLevel && input.riskLevel !== riskLevel) {
				return null;
			}
			const customer = row.patientId ? userById.get(String(row.patientId)) : undefined;

			return {
				id: String(row.id),
				merchantTransactionId: String(row.merchantTransactionId || ''),
				provider: String(row.providerGateway || 'PHONEPE'),
				status: externalStatusFromDb(String(row.status)),
				dbStatus: String(row.status),
				amountMinor: asNumber(row.amountMinor),
				currency: String(row.currency || 'INR'),
				retryCount,
				riskLevel,
				failureReason: extractFailureReason({ failureReason: row.failureReason, metadata: row.metadata }),
				nextRetryAt: row.nextRetryAt ? row.nextRetryAt.toISOString() : null,
				createdAt: row.createdAt.toISOString(),
				updatedAt: row.updatedAt.toISOString(),
				capturedAt: row.capturedAt ? row.capturedAt.toISOString() : null,
				failedAt: row.failedAt ? row.failedAt.toISOString() : null,
				user: {
					id: row.patientId ? String(row.patientId) : null,
					email: customer?.email ? String(customer.email) : null,
					name: String(customer?.name || `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || '' || 'Unknown'),
				},
			};
		})
		.filter(Boolean);

	return {
		data: mapped,
		meta: {
			page,
			limit,
			totalItems,
			totalPages: Math.max(1, Math.ceil(totalItems / limit)),
		},
	};
};

export const getPaymentReliabilityMetrics = async (input?: {
	provider?: 'PHONEPE';
	from?: string;
	to?: string;
}) => {
	const where = buildWhere({ provider: input?.provider, from: input?.from, to: input?.to });

	const [
		totalPayments,
		successCount,
		failedCount,
		pendingCount,
		retriedPayments,
		retriedSuccessCount,
		recoveredRevenue,
	] = await Promise.all([
		prisma.financialPayment.count({ where: where as any }),
		prisma.financialPayment.count({ where: { ...(where as any), status: 'CAPTURED' } }),
		prisma.financialPayment.count({ where: { ...(where as any), status: { in: ['FAILED', 'EXPIRED'] } } }),
		prisma.financialPayment.count({ where: { ...(where as any), status: { in: ['INITIATED', 'PENDING_CAPTURE'] } } }),
		prisma.financialPayment.count({ where: { ...(where as any), retryCount: { gt: 0 } } }),
		prisma.financialPayment.count({ where: { ...(where as any), retryCount: { gt: 0 }, status: 'CAPTURED' } }),
		prisma.financialPayment.aggregate({ where: { ...(where as any), retryCount: { gt: 0 }, status: 'CAPTURED' }, _sum: { amountMinor: true } }),
	]);

	const successRate = totalPayments > 0 ? Number(((successCount / totalPayments) * 100).toFixed(2)) : 0;
	const failureRate = totalPayments > 0 ? Number(((failedCount / totalPayments) * 100).toFixed(2)) : 0;
	const retrySuccessRate = retriedPayments > 0 ? Number(((retriedSuccessCount / retriedPayments) * 100).toFixed(2)) : 0;

	return {
		totalPayments,
		successRate,
		failureRate,
		retrySuccessRate,
		failedCount,
		pendingCount,
		recoveredRevenueMinor: asNumber(recoveredRevenue._sum.amountMinor),
	};
};

export const getPaymentReliabilityDetail = async (paymentId: string) => {
	const id = String(paymentId || '').trim();
	if (!id) throw new AppError('paymentId is required', 400);

	const payment = await prisma.financialPayment.findUnique({
		where: { id },
		select: {
			id: true,
			merchantTransactionId: true,
			providerGateway: true,
			status: true,
			amountMinor: true,
			currency: true,
			retryCount: true,
			nextRetryAt: true,
			failureReason: true,
			createdAt: true,
			updatedAt: true,
			capturedAt: true,
			failedAt: true,
			patientId: true,
			providerId: true,
			metadata: true,
			invoice: {
				select: {
					id: true,
					invoiceNumber: true,
					lifecycleStatus: true,
					status: true,
					amountMinor: true,
					pdfPath: true,
					issuedAt: true,
					paidAt: true,
				},
			},
		},
	});

	if (!payment) {
		throw new AppError('Payment not found', 404);
	}

	const [financialAudits, genericAudits] = await Promise.all([
		prisma.financialAuditLog.findMany({
			where: { entityType: 'FinancialPayment', entityId: id },
			orderBy: { createdAt: 'desc' },
			take: 100,
			select: {
				id: true,
				action: true,
				reason: true,
				actorType: true,
				actorId: true,
				beforeJson: true,
				afterJson: true,
				createdAt: true,
			},
		}),
		prisma.auditLog.findMany({
			where: {
				OR: [
					{ resource: 'Payment' },
					{ details: { path: ['paymentId'], equals: id } as any },
				],
			},
			orderBy: { createdAt: 'desc' },
			take: 100,
			select: {
				id: true,
				action: true,
				resource: true,
				userId: true,
				details: true,
				createdAt: true,
			},
		}),
	]);

	const retries = financialAudits
		.filter((row) => row.action === 'PAYMENT_RETRY')
		.map((row) => ({
			id: String(row.id),
			actorType: String(row.actorType),
			actorId: row.actorId ? String(row.actorId) : null,
			reason: row.reason ? String(row.reason) : null,
			retryCount: asNumber((row.afterJson as any)?.retryCount),
			createdAt: row.createdAt.toISOString(),
			before: row.beforeJson,
			after: row.afterJson,
		}));

	return {
		payment: {
			id: String(payment.id),
			merchantTransactionId: String(payment.merchantTransactionId || ''),
			provider: String(payment.providerGateway || 'PHONEPE'),
			status: externalStatusFromDb(String(payment.status)),
			dbStatus: String(payment.status),
			amountMinor: asNumber(payment.amountMinor),
			currency: String(payment.currency || 'INR'),
			retryCount: Number(payment.retryCount || 0),
			riskLevel: riskFromRetryCount(Number(payment.retryCount || 0)),
			nextRetryAt: payment.nextRetryAt ? payment.nextRetryAt.toISOString() : null,
			createdAt: payment.createdAt.toISOString(),
			updatedAt: payment.updatedAt.toISOString(),
			capturedAt: payment.capturedAt ? payment.capturedAt.toISOString() : null,
			failedAt: payment.failedAt ? payment.failedAt.toISOString() : null,
			patientId: payment.patientId ? String(payment.patientId) : null,
			providerId: payment.providerId ? String(payment.providerId) : null,
		},
		invoice: payment.invoice
			? {
				id: String(payment.invoice.id),
				invoiceNumber: String(payment.invoice.invoiceNumber),
				lifecycleStatus: String(payment.invoice.lifecycleStatus),
				status: String(payment.invoice.status),
				amountMinor: asNumber(payment.invoice.amountMinor),
				pdfPath: payment.invoice.pdfPath ? String(payment.invoice.pdfPath) : null,
				issuedAt: payment.invoice.issuedAt ? payment.invoice.issuedAt.toISOString() : null,
				paidAt: payment.invoice.paidAt ? payment.invoice.paidAt.toISOString() : null,
			}
			: null,
		retries,
		failureReason: extractFailureReason(payment),
		gatewayResponse: extractGatewayResponse(payment.metadata),
		auditLogs: [
			...financialAudits.map((row) => ({
				id: `fin_${String(row.id)}`,
				action: String(row.action),
				resource: 'FinancialPayment',
				actorId: row.actorId ? String(row.actorId) : null,
				createdAt: row.createdAt.toISOString(),
				details: {
					reason: row.reason,
					actorType: row.actorType,
					before: row.beforeJson,
					after: row.afterJson,
				},
			})),
			...genericAudits.map((row) => ({
				id: `audit_${String(row.id)}`,
				action: String(row.action),
				resource: String(row.resource),
				actorId: String(row.userId),
				createdAt: row.createdAt.toISOString(),
				details: row.details,
			})),
		].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1)),
	};
};

export const retryPaymentFromReliability = async (input: {
	paymentId: string;
	actorUserId: string;
	actorRole?: string;
	idempotencyKey?: string;
	reason?: string;
}) => {
	const paymentId = String(input.paymentId || '').trim();
	if (!paymentId) throw new AppError('paymentId is required', 400);
	const actorUserId = String(input.actorUserId || '').trim();
	if (!actorUserId) throw new AppError('Authentication required', 401);

	const endpoint = 'admin.payment.retry';
	const requestHash = hashPayload({ paymentId, actorUserId });
	const idempotencyKey = String(input.idempotencyKey || `retry:${paymentId}:${actorUserId}`).trim();

	const existing = await prisma.idempotencyKey.findFirst({
		where: {
			id: idempotencyKey,
			endpoint,
			actorId: actorUserId,
		},
	});
	if (existing?.response && typeof existing.response === 'object') {
		return existing.response as Record<string, unknown>;
	}

	const retryResult = await prisma.$transaction(async (tx) => {
		const payment = await tx.financialPayment.findUnique({
			where: { id: paymentId },
			select: {
				id: true,
				status: true,
				retryCount: true,
				nextRetryAt: true,
				failureReason: true,
				metadata: true,
				merchantTransactionId: true,
			},
		});

		if (!payment) throw new AppError('Payment not found', 404);

		const currentStatus = String(payment.status);
		const retryCount = Number(payment.retryCount || 0);
		const allowed = ['FAILED', 'INITIATED', 'PENDING_CAPTURE'];
		if (!allowed.includes(currentStatus)) {
			throw new AppError('Retry not allowed for current payment status', 409);
		}
		if (retryCount >= MAX_MANUAL_RETRY_LIMIT) {
			throw new AppError(`Retry limit exceeded (${MAX_MANUAL_RETRY_LIMIT})`, 409);
		}

		const metadata = (payment.metadata && typeof payment.metadata === 'object') ? (payment.metadata as Record<string, unknown>) : {};
		const lastRetryAtRaw = String(metadata.lastRetryAt || '').trim();
		if (lastRetryAtRaw) {
			const lastRetryAt = new Date(lastRetryAtRaw);
			if (!Number.isNaN(lastRetryAt.getTime())) {
				const elapsedMs = Date.now() - lastRetryAt.getTime();
				if (elapsedMs < RETRY_COOLDOWN_MS) {
					const remainingSec = Math.max(1, Math.ceil((RETRY_COOLDOWN_MS - elapsedMs) / 1000));
					throw new AppError(`Retry cooldown active. Try again in ${remainingSec}s`, 409);
				}
			}
		}

		const updated = await tx.financialPayment.updateMany({
			where: {
				id: paymentId,
				status: currentStatus as any,
				retryCount,
			},
			data: {
				status: currentStatus === 'FAILED' ? 'FAILED' : 'INITIATED',
				retryCount: retryCount + 1,
				nextRetryAt: new Date(),
				metadata: {
					...metadata,
					lastRetryAt: new Date().toISOString(),
					lastRetryBy: actorUserId,
					lastRetryReason: String(input.reason || '').trim() || null,
					lastRetryPreviousStatus: currentStatus,
				},
			},
		});

		if (updated.count === 0) {
			throw new AppError('Payment retry conflict detected. Please retry.', 409);
		}

		const latest = await tx.financialPayment.findUnique({
			where: { id: paymentId },
			select: {
				id: true,
				status: true,
				retryCount: true,
				nextRetryAt: true,
				merchantTransactionId: true,
			},
		});

		await tx.financialAuditLog.create({
			data: {
				actorType: 'ADMIN',
				actorId: actorUserId,
				action: 'PAYMENT_RETRY',
				entityType: 'FinancialPayment',
				entityId: paymentId,
				reason: String(input.reason || '').trim() || null,
				beforeJson: {
					policy: 'payments.retry',
					policyVersion: POLICY_VERSION,
					actorRole: input.actorRole || null,
					status: currentStatus,
					retryCount,
					nextRetryAt: payment.nextRetryAt ? payment.nextRetryAt.toISOString() : null,
				},
				afterJson: {
					policy: 'payments.retry',
					policyVersion: POLICY_VERSION,
					actorRole: input.actorRole || null,
					status: latest?.status || currentStatus,
					retryCount: Number(latest?.retryCount || retryCount + 1),
					nextRetryAt: latest?.nextRetryAt ? latest.nextRetryAt.toISOString() : null,
				},
			},
		});

		await tx.auditLog.create({
			data: {
				userId: actorUserId,
				action: 'PAYMENT_RETRY',
				resource: 'Payment',
				details: {
					policy: 'payments.retry',
					policyVersion: POLICY_VERSION,
					actorRole: input.actorRole || null,
					paymentId,
					merchantTransactionId: payment.merchantTransactionId,
					previousStatus: currentStatus,
					retryCount: Number(latest?.retryCount || retryCount + 1),
					reason: String(input.reason || '').trim() || null,
				},
			},
		});

		return {
			success: true,
			message: 'Payment retry scheduled for immediate processing',
			data: {
				paymentId,
				status: String(latest?.status || currentStatus),
				retryCount: Number(latest?.retryCount || retryCount + 1),
				nextRetryAt: latest?.nextRetryAt ? latest.nextRetryAt.toISOString() : null,
				riskLevel: riskFromRetryCount(Number(latest?.retryCount || retryCount + 1)),
			},
		};
	});

	await prisma.idempotencyKey.deleteMany({
		where: {
			id: idempotencyKey,
			endpoint,
			actorId: actorUserId,
		},
	});
	await prisma.idempotencyKey.create({
		data: {
			id: idempotencyKey,
			endpoint,
			actorId: actorUserId,
			requestHash,
			response: retryResult as any,
		},
	});

	return retryResult;
};
