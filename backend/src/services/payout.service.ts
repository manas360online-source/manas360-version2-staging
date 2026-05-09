import crypto from 'crypto';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { POLICY_VERSION } from '../middleware/rbac.middleware';

const MAX_PAYOUT_BATCH_SIZE = 100;

/**
 * Hash request body for idempotency key generation
 */
const hashPayload = (payload: unknown): string =>
	crypto.createHash('sha256').update(JSON.stringify(payload || {})).digest('hex');

/**
 * Check if idempotency key exists; if so, validate request hash and return cached response
 * Enforces 7-day TTL: expired keys are treated as non-existent
 */
const findIdempotencyResponse = async (
	endpoint: string,
	actorId: string,
	idempotencyKey: string | undefined,
	requestHash: string | undefined,
	tx?: any,
) => {
	if (!idempotencyKey) return null;

	const db = tx || prisma;
	try {
		const record = await db.idempotencyKey.findUnique({
			where: {
				endpoint_actorId_requestHash: {
					endpoint,
					actorId,
					requestHash: requestHash || '',
				},
			},
		});
		if (!record) return null;

		// Check TTL: if expired (> 7 days old), treat as non-existent
		const ageMs = Date.now() - new Date(record.expiresAt).getTime();
		if (ageMs > 0) {
			// Silently expired; could optionally delete here
			return null;
		}

		// Validate that request hash matches (prevent different payload with same key)
		if (requestHash && record.requestHash && record.requestHash !== requestHash) {
			throw new AppError('Idempotency key used with different request payload', 409);
		}

		return record?.response || null;
	} catch (error: any) {
		if (error instanceof AppError) throw error;
		return null;
	}
};

/**
 * Save successful response for idempotency replay
 * Sets expiresAt to 7 days from now for automatic cleanup
 */
const saveIdempotencyResponse = async (
	endpoint: string,
	actorId: string,
	idempotencyKey: string | undefined,
	requestHash: string | undefined,
	response: unknown,
	tx?: any,
) => {
	if (!idempotencyKey) return;

	const db = tx || prisma;
	try {
		const now = new Date();
		const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
		await db.idempotencyKey.create({
			data: {
				id: idempotencyKey,
				endpoint,
				actorId,
				requestHash: requestHash || '',
				response: response as any,
				expiresAt,
			},
		});
	} catch (error) {
		// Silently fail on idempotency save (don't block operation)
		console.warn('[Payout] Idempotency save failed', error);
	}
};

/**
 * Validate invoice eligibility for payout
 */
const validateInvoiceEligibility = (invoice: any): { valid: boolean; reason?: string } => {
	if (invoice.lifecycleStatus !== 'PAID') {
		return { valid: false, reason: `Invoice ${invoice.id} not in PAID status` };
	}
	if (invoice.isPaidOut === true) {
		return { valid: false, reason: `Invoice ${invoice.id} already paid out` };
	}
	if (invoice.refundedAt !== null) {
		return { valid: false, reason: `Invoice ${invoice.id} was refunded` };
	}
	return { valid: true };
};

/**
 * Create a new payout for a provider with selected invoices
 *
 * Non-negotiables:
 * - Transactional (all-or-nothing)
 * - Idempotency support
 * - Double-payout prevention via UNIQUE(invoiceId)
 * - Eligibility validation
 * - Audit logging
 */
export const createPayout = async (input: {
	providerId: string;
	invoiceIds: string[];
	method: 'BANK' | 'UPI';
	idempotencyKey?: string;
	actorId: string;
}): Promise<{ id: string; amountMinor: string; invoiceCount: number }> => {
	const { providerId, invoiceIds: rawInvoiceIds, method, idempotencyKey, actorId } = input;

	// Validation
	if (!providerId) throw new AppError('Provider ID required', 400);
	if (!rawInvoiceIds || rawInvoiceIds.length === 0) throw new AppError('At least one invoice required', 400);
	if (rawInvoiceIds.length > MAX_PAYOUT_BATCH_SIZE)
		throw new AppError(`Max ${MAX_PAYOUT_BATCH_SIZE} invoices per payout`, 400);

	// Deduplicate and sort invoices for consistent hash
	const invoiceIds = Array.from(new Set(rawInvoiceIds)).sort();

	// Calculate request hash for idempotency
	const requestHash = hashPayload({ providerId, invoiceIds, method });

	// Check idempotency (with hash validation)
	const replay = await findIdempotencyResponse('payout.create', actorId, idempotencyKey, requestHash);
	if (replay) {
		return replay as any;
	}

	// Transactional create
	try {
		const result = await prisma.$transaction(async (tx) => {
			// ATOMIC LOCK + VALIDATE: update invoices to mark as paid out
			// This ensures eligibility validation and locking happen atomically
			const locked = await tx.invoice.updateMany({
				where: {
					id: { in: invoiceIds },
					userId: providerId,
					lifecycleStatus: 'PAID',
					isPaidOut: false,
					refundedAt: null, // Must not be refunded
				},
				data: { isPaidOut: true },
			});

			// Verify all requested invoices were locked
			if (locked.count !== invoiceIds.length) {
				// Some invoices were ineligible; fetch to provide detailed error
				const found = await tx.invoice.findMany({
					where: { id: { in: invoiceIds } },
					select: { id: true, lifecycleStatus: true, isPaidOut: true, refundedAt: true },
				});

				const ineligible = invoiceIds.filter((id) => {
					const inv = found.find((f) => f.id === id);
					if (!inv) return true; // Not found
					if (inv.lifecycleStatus !== 'PAID') return true;
					if (inv.isPaidOut === true) return true;
					if (inv.refundedAt !== null) return true;
					return false;
				});

				throw new AppError(
					`${ineligible.length} invoices are ineligible for payout: ${ineligible.join(', ')}`,
					400,
				);
			}

			// Fetch locked invoices to calculate total
			const invoices = await tx.invoice.findMany({
				where: { id: { in: invoiceIds } },
				select: { id: true, amountMinor: true },
			});

			const totalMinor = invoices.reduce((sum, i) => sum + (i.amountMinor || 0n), 0n);
			if (totalMinor <= 0n) throw new AppError('Payout amount must be positive', 400);

			// Create payout
			const payout = await tx.payout.create({
				data: {
					providerId,
					amountMinor: totalMinor,
					currency: 'INR',
					status: 'PENDING',
					method,
					version: 1n,
				},
			});

			// Create payout items (links invoices to payout)
			// UNIQUE(invoiceId) constraint prevents double-payout
			await tx.payoutItem.createMany({
				data: invoices.map((inv) => ({
					payoutId: payout.id,
					invoiceId: inv.id,
					amountMinor: inv.amountMinor || 0n,
				})),
			});

			// SANITY CHECK: Verify invariant
			// SUM(payout_items.amountMinor) === payout.amountMinor
			const itemsVerify = await tx.payoutItem.findMany({
				where: { payoutId: payout.id },
				select: { amountMinor: true },
			});
			const itemsSum = itemsVerify.reduce((sum, item) => sum + (item.amountMinor || 0n), 0n);
			if (itemsSum !== totalMinor) {
				throw new AppError(
					`Payout amount invariant violated: payout=${totalMinor}, items_sum=${itemsSum}`,
					500,
				);
			}

			// Audit log
			await tx.auditLog.create({
				data: {
					userId: actorId,
					action: 'PAYOUT_CREATED',
					resource: 'Payout',
					details: {
						payoutId: payout.id,
						providerId,
						invoiceCount: invoices.length,
						amountMinor: totalMinor.toString(),
						method,
						policy: 'payouts.manage',
						policyVersion: POLICY_VERSION,
					} as any,
				},
			});

			const response = {
				id: payout.id,
				amountMinor: totalMinor.toString(), // String to prevent overflow
				invoiceCount: invoices.length,
			};

			// Save idempotency response with hash
			await saveIdempotencyResponse('payout.create', actorId, idempotencyKey, requestHash, response, tx);

			return response;
		});

		return result;
	} catch (error: any) {
		// If it's already an AppError, re-throw
		if (error instanceof AppError) throw error;

		// Handle unique constraint violation (double payout)
		if (error.code === 'P2002' && error.meta?.target?.includes('invoiceId')) {
			throw new AppError('One or more invoices already included in another payout', 409);
		}

		throw new AppError(`Payout creation failed: ${error.message}`, 500);
	}
};

/**
 * Process a pending payout (move to PROCESSING → COMPLETED or FAILED)
 *
 * Handles:
 * - Optimistic locking via version
 * - Retry safety
 * - Gateway integration (simulated for now)
 * - Rollback on failure (reset isPaidOut flags)
 * - Audit logging
 */
export const processPayout = async (input: {
	payoutId: string;
	actorId: string;
}): Promise<{ id: string; status: string }> => {
	const { payoutId, actorId } = input;

	if (!payoutId) throw new AppError('Payout ID required', 400);

	try {
		const result = await prisma.$transaction(async (tx) => {
			// Fetch current state
			const payout = await tx.payout.findUnique({
				where: { id: payoutId },
				include: { items: { select: { invoiceId: true } } },
			});

			if (!payout) throw new AppError('Payout not found', 404);

			// Idempotent: if already completed, return success
			if (payout.status === 'COMPLETED') {
				return { id: payoutId, status: 'COMPLETED' };
			}

			// Idempotent: if already processing, return in-progress
			if (payout.status === 'PROCESSING') {
				return { id: payoutId, status: 'PROCESSING' };
			}

			// Only allow processing from PENDING
			if (payout.status !== 'PENDING') throw new AppError(`Cannot process payout in ${payout.status} status`, 400);

			// Optimistic lock: try to move PENDING → PROCESSING
			const updated = await tx.payout.updateMany({
				where: { id: payoutId, version: payout.version, status: 'PENDING' },
				data: { status: 'PROCESSING', version: { increment: 1n } },
			});

			if (updated.count === 0) {
				throw new AppError('Payout state changed; retry or conflict detected', 409);
			}

			// Simulate gateway call (TODO: integrate real payment gateway)
			const gatewaySuccess = true; // Mock: replace with actual gateway integration
			const failureReason = gatewaySuccess ? null : 'Simulated gateway failure';

			if (gatewaySuccess) {
				// SUCCESS → COMPLETED
				await tx.payout.update({
					where: { id: payoutId },
					data: {
						status: 'COMPLETED',
						processedAt: new Date(),
						version: { increment: 1n },
					},
				});

				// Audit: success
				await tx.auditLog.create({
					data: {
						userId: actorId,
						action: 'PAYOUT_PROCESSED',
						resource: 'Payout',
						details: {
							payoutId,
							result: 'COMPLETED',
							policy: 'payouts.manage',
							policyVersion: POLICY_VERSION,
						} as any,
					},
				});
			} else {
				// FAILURE → FAILED, rollback invoice flags
				await tx.payout.update({
					where: { id: payoutId },
					data: {
						status: 'FAILED',
						failureReason,
						version: { increment: 1n },
					},
				});

				// Reset invoice flags (unlocks invoices)
				const invoiceIds = payout.items.map((item) => item.invoiceId);
				if (invoiceIds.length > 0) {
					await tx.invoice.updateMany({
						where: { id: { in: invoiceIds } },
						data: { isPaidOut: false },
					});
				}

				// Audit: failure
				await tx.auditLog.create({
					data: {
						userId: actorId,
						action: 'PAYOUT_FAILED',
						resource: 'Payout',
						details: {
							payoutId,
							result: 'FAILED',
							failureReason,
							invoicesRolledBack: invoiceIds.length,
							policy: 'payouts.manage',
							policyVersion: POLICY_VERSION,
						} as any,
					},
				});
			}

			return {
				id: payoutId,
				status: gatewaySuccess ? 'COMPLETED' : 'FAILED',
			};
		});

		return result;
	} catch (error: any) {
		if (error instanceof AppError) throw error;
		throw new AppError(`Payout processing failed: ${error.message}`, 500);
	}
};

/**
 * List payouts with filters, sorting, pagination
 */
export const listPayouts = async (input: {
	providerId?: string;
	status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
	from?: string;
	to?: string;
	sortBy?: 'createdAt' | 'amountMinor';
	sortOrder?: 'asc' | 'desc';
	page?: number;
	limit?: number;
}): Promise<{ items: any[]; page: number; limit: number; total: number }> => {
	const {
		providerId,
		status,
		from,
		to,
		sortBy = 'createdAt',
		sortOrder = 'desc',
		page = 1,
		limit = 20,
	} = input;

	// Validation
	if (page < 1) throw new AppError('Page must be >= 1', 400);
	if (limit < 1 || limit > 100) throw new AppError('Limit must be 1-100', 400);

	// Build where clause
	const where: any = {};
	if (providerId) where.providerId = providerId;
	if (status) where.status = status;

	if (from || to) {
		where.createdAt = {};
		if (from) {
			const fromDate = new Date(from);
			if (Number.isNaN(fromDate.getTime())) throw new AppError('Invalid `from` date', 400);
			where.createdAt.gte = fromDate;
		}
		if (to) {
			const toDate = new Date(to);
			if (Number.isNaN(toDate.getTime())) throw new AppError('Invalid `to` date', 400);
			toDate.setHours(23, 59, 59, 999);
			where.createdAt.lte = toDate;
		}
	}

	const skip = (page - 1) * limit;

	try {
		const [items, total] = await Promise.all([
			prisma.payout.findMany({
				where,
				include: {
					provider: { select: { id: true, firstName: true, lastName: true, email: true } },
					items: { select: { invoiceId: true, amountMinor: true } },
				},
				orderBy: { [sortBy]: sortOrder },
				skip,
				take: limit,
			}),
			prisma.payout.count({ where }),
		]);

		return {
			items: items.map((p) => ({
				id: p.id,
				providerId: p.providerId,
				provider: p.provider,
				amountMinor: p.amountMinor.toString(), // String to prevent overflow
				currency: p.currency,
				status: p.status,
				method: p.method,
				invoiceCount: p.items.length,
				createdAt: p.createdAt,
				processedAt: p.processedAt,
			})),
			page,
			limit,
			total,
		};
	} catch (error: any) {
		throw new AppError(`List payouts failed: ${error.message}`, 500);
	}
};

/**
 * Get detailed payout info including items, linked invoices, audit trail
 */
export const getPayoutDetail = async (payoutId: string): Promise<any> => {
	if (!payoutId) throw new AppError('Payout ID required', 400);

	try {
		const payout = await prisma.payout.findUnique({
			where: { id: payoutId },
			include: {
				provider: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true,
						phone: true,
					},
				},
				items: {
					include: {
						invoice: {
							select: {
								id: true,
								invoiceNumber: true,
								amountMinor: true,
								totalMinor: true,
								lifecycleStatus: true,
								issuedAt: true,
								paidAt: true,
							},
						},
					},
				},
			},
		});

		if (!payout) throw new AppError('Payout not found', 404);

		// Fetch audit logs for this payout
		const auditLogs = await prisma.auditLog.findMany({
			where: {
				resource: 'Payout',
				details: { path: ['payoutId'], equals: payoutId },
			},
			include: {
				user: { select: { id: true, firstName: true, lastName: true, email: true } },
			},
			orderBy: { createdAt: 'desc' },
			take: 50,
		});

		return {
			id: payout.id,
			providerId: payout.providerId,
			provider: payout.provider,
			amountMinor: payout.amountMinor.toString(), // String to prevent overflow
			currency: payout.currency,
			status: payout.status,
			method: payout.method,
			referenceId: payout.referenceId,
			failureReason: payout.failureReason,
			version: Number(payout.version),
			createdAt: payout.createdAt,
			processedAt: payout.processedAt,
			items: payout.items.map((item) => ({
				id: item.id,
				invoiceId: item.invoiceId,
				amountMinor: item.amountMinor.toString(), // String to prevent overflow
				invoice: {
					...item.invoice,
					amountMinor: item.invoice.amountMinor.toString(),
					totalMinor: item.invoice.totalMinor.toString(),
				},
			})),
			auditTrail: auditLogs.map((log) => ({
				id: log.id,
				action: log.action,
				actor: log.user,
				details: log.details,
				createdAt: log.createdAt,
			})),
		};
	} catch (error: any) {
		if (error instanceof AppError) throw error;
		throw new AppError(`Get payout detail failed: ${error.message}`, 500);
	}
};

/**
 * Retry a failed payout (reset to PENDING, unlock invoices)
 * Includes cooldown: prevents retries within 60 seconds of last failure
 */
export const retryFailedPayout = async (input: {
	payoutId: string;
	actorId: string;
}): Promise<{ id: string; status: string }> => {
	const { payoutId, actorId } = input;

	if (!payoutId) throw new AppError('Payout ID required', 400);

	try {
		const result = await prisma.$transaction(async (tx) => {
			const payout = await tx.payout.findUnique({
				where: { id: payoutId },
				include: { items: { select: { invoiceId: true } } },
			});

			if (!payout) throw new AppError('Payout not found', 404);
			if (payout.status !== 'FAILED') throw new AppError(`Cannot retry payout in ${payout.status} status`, 400);

			// COOLDOWN CHECK: prevent retries within 60 seconds
			const lastFailureLogs = await tx.auditLog.findFirst({
				where: {
					resource: 'Payout',
					action: 'PAYOUT_FAILED',
					details: { path: ['payoutId'], equals: payoutId },
				},
				orderBy: { createdAt: 'desc' },
				take: 1,
			});

			if (lastFailureLogs) {
				const timeSinceLastFailure = Date.now() - new Date(lastFailureLogs.createdAt).getTime();
				const RETRY_COOLDOWN_MS = 60_000; // 60 seconds
				if (timeSinceLastFailure < RETRY_COOLDOWN_MS) {
					const waitSeconds = Math.ceil((RETRY_COOLDOWN_MS - timeSinceLastFailure) / 1000);
					throw new AppError(
						`Please wait ${waitSeconds} seconds before retrying this payout`,
						429,
					);
				}
			}

			// Reset to PENDING
			await tx.payout.update({
				where: { id: payoutId },
				data: {
					status: 'PENDING',
					failureReason: null,
					version: { increment: 1n },
				},
			});

			// Re-lock invoices
			const invoiceIds = payout.items.map((item) => item.invoiceId);
			if (invoiceIds.length > 0) {
				const relocked = await tx.invoice.updateMany({
					where: {
						id: { in: invoiceIds },
						lifecycleStatus: 'PAID',
						isPaidOut: false,
						refundedAt: null,
					},
					data: { isPaidOut: true },
				});

				if (relocked.count !== invoiceIds.length) {
					throw new AppError(
						`Cannot retry payout: ${invoiceIds.length - relocked.count} linked invoices are no longer eligible`,
						409,
					);
				}
			}

			// Audit
			await tx.auditLog.create({
				data: {
					userId: actorId,
					action: 'PAYOUT_RETRY',
					resource: 'Payout',
					details: {
						payoutId,
						previousStatus: 'FAILED',
						newStatus: 'PENDING',
						policy: 'payouts.manage',
						policyVersion: POLICY_VERSION,
					} as any,
				},
			});

			return { id: payoutId, status: 'PENDING' };
		});

		return result;
	} catch (error: any) {
		if (error instanceof AppError) throw error;
		throw new AppError(`Retry payout failed: ${error.message}`, 500);
	}
};
