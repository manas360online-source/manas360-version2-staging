import { mkdir, writeFile, readFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { chromium } from 'playwright';
import QRCode from 'qrcode';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { triggerZohoFlow } from './zohoDesk.service';
import { renderInvoiceHtml, type InvoiceRenderData } from './invoice.renderer';
import { sendInvoiceEmail } from './invoice.mailer';
import { initiatePhonePeRefund } from './phonepe.service';
import { triggerSwipeInvoiceGeneration } from './zoho-flow.service';

export type GeneratedInvoice = {
	id: string;
	paymentId: string | null;
	userId: string;
	tenantId: string | null;
	customerName: string;
	customerEmail: string | null;
	invoiceNumber: string;
	invoiceYear: number;
	sequenceNumber: number;
	amountMinor: number;
	status: string;
	lifecycleStatus: 'DRAFT' | 'ISSUED' | 'PAID' | 'FAILED' | 'REFUNDED';
	issuedAt: string | null;
	paidAt: string | null;
	refundedAt: string | null;
	createdAt: string;
	updatedAt: string;
	version: number;
	metadata: Record<string, unknown> | null;
	pdfPath: string | null;
	htmlPath: string | null;
	emailedTo: string | null;
};

export type InvoiceDetail = {
	invoice: GeneratedInvoice;
	events: Array<{
		id: string;
		eventType: string;
		actorUserId: string | null;
		idempotencyKey: string | null;
		createdAt: string;
	}>;
	payment: {
		id: string;
		status: string;
		amountMinor: number;
		currency: string;
		merchantTransactionId: string;
	} | null;
	auditLogs: Array<{
		id: string;
		action: string;
		resource: string;
		createdAt: string;
		userId: string;
	}>;
};

type InvoiceLifecycleStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'FAILED' | 'REFUNDED';

const allowedTransitions: Record<InvoiceLifecycleStatus, InvoiceLifecycleStatus[]> = {
	DRAFT: ['ISSUED'],
	ISSUED: ['PAID', 'FAILED', 'REFUNDED'],
	PAID: ['REFUNDED'],
	FAILED: [],
	REFUNDED: [],
};

const INVOICE_ROOT_DIR = path.resolve(process.cwd(), 'invoices');
const DEFAULT_GST_RATE = 18;

const parseJsonEnv = (value: string | undefined): Record<string, unknown> | null => {
	const raw = String(value || '').trim();
	if (!raw) {
		return null;
	}

	try {
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
	} catch {
		return null;
	}
};

const formatInvoiceNumber = (year: number, sequenceNumber: number): string =>
	`INV-${year}-${String(sequenceNumber).padStart(6, '0')}`;

const hashRequestPayload = (payload: unknown): string =>
	crypto.createHash('sha256').update(JSON.stringify(payload ?? {})).digest('hex');

const buildUpiMetadata = async (input: {
	invoiceId: string;
	invoiceNumber: string;
	totalMinor: number;
}): Promise<{ upiString: string; qrDataUrl: string } | null> => {
	const amountInRupees = Math.max(0, Number(input.totalMinor || 0) / 100);
	if (!input.invoiceId || amountInRupees <= 0) return null;

	const upiString = `upi://pay?pa=manas360mentalwellnesspvtltd@kotak&pn=MANAS360&am=${amountInRupees.toFixed(2)}&cu=INR&tn=Invoice-${input.invoiceId}`;
	try {
		const qrDataUrl = await QRCode.toDataURL(upiString, { width: 120, margin: 0 });
		return { upiString, qrDataUrl };
	} catch {
		return null;
	}
};

const toMinor = (value: unknown): number => Number(value || 0);

const resolveInvoiceCustomerId = (payment: any): string => {
	const paymentMetadata = (payment.metadata as Record<string, unknown> | null) || {};
	const paymentType = String(paymentMetadata.type || payment.paymentType || '').toLowerCase();
	const merchantTransactionId = String(payment.merchantTransactionId || '');
	const looksLikeProviderPayment = paymentType.includes('provider') || merchantTransactionId.startsWith('PROV_');

	if (looksLikeProviderPayment && String(payment.providerId || '').trim()) {
		return String(payment.providerId).trim();
	}

	if (String(payment.patientId || '').trim()) {
		return String(payment.patientId).trim();
	}

	if (String(payment.providerId || '').trim()) {
		return String(payment.providerId).trim();
	}

	return '';
};

const ensureInvoiceDirectory = async (invoiceYear: number): Promise<string> => {
	const directory = path.join(INVOICE_ROOT_DIR, String(invoiceYear));
	await mkdir(directory, { recursive: true });
	return directory;
};

const computeTaxBreakdown = (totalMinor: number, gstRate: number) => {
	const normalizedTotal = Math.max(0, Math.round(Number(totalMinor) || 0));
	const taxableMinor = Math.round((normalizedTotal * 100) / (100 + gstRate));
	const gstAmountMinor = Math.max(0, normalizedTotal - taxableMinor);
	const cgstMinor = Math.floor(gstAmountMinor / 2);
	const sgstMinor = gstAmountMinor - cgstMinor;

	return {
		subtotalMinor: taxableMinor,
		cgstMinor,
		sgstMinor,
		gstAmountMinor,
		totalMinor: normalizedTotal,
	};
};

const buildInvoiceItems = (
	description: string,
	subtotalMinor: number,
	totalMinor: number,
	cgstMinor: number,
	sgstMinor: number,
) => ([
	{
		description,
		quantity: 1,
		unitPriceMinor: subtotalMinor,
		taxableMinor: subtotalMinor,
		cgstMinor,
		sgstMinor,
		totalMinor,
	},
]);

const buildInvoiceText = (invoiceNumber: string, customerName: string, totalMinor: number): string => [
	`Hello ${customerName},`,
	'',
	`Your MANAS360 invoice ${invoiceNumber} has been generated.`,
	`Amount paid: ₹${(totalMinor / 100).toFixed(2)}`,
	'',
	'The invoice PDF is attached to this email.',
].join('\n');

const buildPdfBuffer = async (html: string): Promise<Buffer> => {
	const browser = await chromium.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
	});

	try {
		const page = await browser.newPage({ viewport: { width: 1440, height: 2200 } });
		await page.setContent(html, { waitUntil: 'networkidle' });
		const pdf = await page.pdf({
			format: 'A4',
			printBackground: true,
			margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
		});
		await page.close();
		return Buffer.from(pdf);
	} finally {
		await browser.close();
	}
};

const writeInvoiceFiles = async (invoiceYear: number, invoiceNumber: string, html: string, pdfBuffer: Buffer) => {
	const directory = await ensureInvoiceDirectory(invoiceYear);
	const htmlPath = path.join(directory, `${invoiceNumber}.html`);
	const pdfPath = path.join(directory, `${invoiceNumber}.pdf`);

	await writeFile(htmlPath, html, 'utf8');
	await writeFile(pdfPath, pdfBuffer);

	return { htmlPath, pdfPath };
};

const mapInvoice = (invoice: any): GeneratedInvoice => ({
	id: String(invoice.id),
	paymentId: invoice.paymentId ? String(invoice.paymentId) : null,
	userId: String(invoice.userId),
	tenantId: invoice.tenantId ? String(invoice.tenantId) : null,
	customerName: String(invoice.customerName || ''),
	customerEmail: invoice.customerEmail ? String(invoice.customerEmail) : null,
	invoiceNumber: String(invoice.invoiceNumber),
	invoiceYear: Number(invoice.invoiceYear),
	sequenceNumber: Number(invoice.sequenceNumber),
	amountMinor: Number(invoice.amountMinor ?? invoice.totalMinor ?? 0),
	status: String(invoice.status),
	lifecycleStatus: String(invoice.lifecycleStatus || 'DRAFT') as GeneratedInvoice['lifecycleStatus'],
	issuedAt: invoice.issuedAt ? new Date(invoice.issuedAt).toISOString() : null,
	paidAt: invoice.paidAt ? new Date(invoice.paidAt).toISOString() : null,
	refundedAt: invoice.refundedAt ? new Date(invoice.refundedAt).toISOString() : null,
	createdAt: new Date(invoice.createdAt).toISOString(),
	updatedAt: new Date(invoice.updatedAt).toISOString(),
	version: Number(invoice.version || 1),
	metadata: (invoice.metadata as Record<string, unknown> | null) || null,
	pdfPath: invoice.pdfPath ? String(invoice.pdfPath) : null,
	htmlPath: invoice.htmlPath ? String(invoice.htmlPath) : null,
	emailedTo: invoice.emailedTo ? String(invoice.emailedTo) : null,
});

export class InvoiceService {
	private async assertValidTransition(current: InvoiceLifecycleStatus, next: InvoiceLifecycleStatus): Promise<void> {
		if (current === next) return;
		if (!allowedTransitions[current].includes(next)) {
			throw new AppError(`Invalid invoice state transition: ${current} -> ${next}`, 409);
		}
	}

	private async recordInvoiceEvent(input: {
		invoiceId: string;
		eventType: string;
		beforeState?: unknown;
		afterState?: unknown;
		actorUserId?: string;
		idempotencyKey?: string;
	}): Promise<void> {
		await prisma.invoiceEvent.create({
			data: {
				invoiceId: input.invoiceId,
				eventType: input.eventType,
				beforeState: input.beforeState as any,
				afterState: input.afterState as any,
				actorUserId: input.actorUserId || null,
				idempotencyKey: input.idempotencyKey || null,
			},
		});
	}

	async generateInvoice(input: {
		paymentId: string;
		actorUserId?: string;
		idempotencyKey?: string;
	}): Promise<GeneratedInvoice> {
		const normalizedPaymentId = String(input.paymentId || '').trim();
		if (!normalizedPaymentId) {
			throw new AppError('paymentId is required', 400);
		}

		const endpoint = 'invoice.generate';
		const scopedActorId = input.actorUserId || 'system';
		const requestHash = hashRequestPayload({ paymentId: normalizedPaymentId });
		if (input.idempotencyKey) {
			const idem = await prisma.idempotencyKey.findFirst({
				where: { id: input.idempotencyKey, endpoint, actorId: scopedActorId },
			});
			if (idem?.response && typeof idem.response === 'object') {
				const invoiceId = String((idem.response as any).invoiceId || '').trim();
				if (invoiceId) {
					const existing = await prisma.invoice.findUnique({ where: { id: invoiceId } });
					if (existing) return mapInvoice(existing);
				}
			}
		}

		const payment = await prisma.financialPayment.findUnique({ where: { id: normalizedPaymentId } });
		if (!payment) throw new AppError('Payment not found', 404);
		if (String(payment.status) !== 'CAPTURED') throw new AppError('Invoice can only be generated for captured payments', 409);

		const existingInvoice = await prisma.invoice.findUnique({ where: { paymentId: normalizedPaymentId } });
		if (existingInvoice) return mapInvoice(existingInvoice);

		const userId = resolveInvoiceCustomerId(payment);
		if (!userId) throw new AppError('Unable to resolve invoice customer for payment', 422);

		const customer = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, name: true, firstName: true, lastName: true, email: true, phone: true },
		});
		if (!customer) throw new AppError('Invoice customer not found', 404);

		const totalMinor = toMinor(payment.amountMinor);
		const gstRate = DEFAULT_GST_RATE;
		const tax = computeTaxBreakdown(totalMinor, gstRate);
		const invoiceYear = new Date(payment.capturedAt || payment.createdAt || new Date()).getFullYear();
		const paymentMetadata = (payment.metadata as Record<string, unknown> | null) || {};
		const invoiceText = String(paymentMetadata.plan || paymentMetadata.type || payment.paymentType || 'MANAS360 service charges');
		const invoiceDescription = invoiceText.charAt(0).toUpperCase() + invoiceText.slice(1);
		const customerName = String(customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer');

		const created = await prisma.$transaction(async (tx) => {
			const sequenceRow = await tx.invoiceSequence.upsert({
				where: { year: invoiceYear },
				create: { year: invoiceYear, lastSequence: 1 },
				update: { lastSequence: { increment: 1 } },
			});
			const sequenceNumber = Number(sequenceRow.lastSequence || 1);
			const invoiceNumber = formatInvoiceNumber(invoiceYear, sequenceNumber);
			const invoiceItems = buildInvoiceItems(
				invoiceDescription,
				tax.subtotalMinor,
				tax.totalMinor,
				tax.cgstMinor,
				tax.sgstMinor,
			);
			const invoiceId = crypto.randomUUID();
			const upiMeta = await buildUpiMetadata({
				invoiceId,
				invoiceNumber,
				totalMinor: tax.totalMinor,
			});

			const invoice = await tx.invoice.create({
				data: {
					id: invoiceId,
					paymentId: normalizedPaymentId,
					paymentTransactionId: String(payment.merchantTransactionId),
					userId,
					invoiceNumber,
					invoiceYear,
					sequenceNumber,
					companyName: 'MANAS360',
					companyGstin: process.env.COMPANY_GSTIN || null,
					companyAddress: parseJsonEnv(process.env.COMPANY_ADDRESS_JSON),
					customerName,
					customerEmail: customer.email || null,
					customerPhone: customer.phone || null,
					currency: String(payment.currency || 'INR'),
					items: invoiceItems as any,
					subtotalMinor: BigInt(tax.subtotalMinor),
					gstRate,
					cgstMinor: BigInt(tax.cgstMinor),
					sgstMinor: BigInt(tax.sgstMinor),
					gstAmountMinor: BigInt(tax.gstAmountMinor),
					totalMinor: BigInt(tax.totalMinor),
					amountMinor: BigInt(tax.totalMinor),
					status: 'ISSUED',
					lifecycleStatus: 'ISSUED',
					invoiceMethod: 'SWIPE',
					issuedAt: new Date(),
					metadata: {
						source: 'payment-success',
						merchantTransactionId: payment.merchantTransactionId,
						paymentType: payment.paymentType,
						invoiceId,
						upiString: upiMeta?.upiString || null,
						upiQrDataUrl: upiMeta?.qrDataUrl || null,
					},
				},
			});

			await tx.invoiceEvent.create({
				data: {
					invoiceId: invoice.id,
					eventType: 'ISSUED',
					invoiceMethod: 'SWIPE',
					afterState: { lifecycleStatus: 'ISSUED' } as any,
					actorUserId: input.actorUserId || null,
					idempotencyKey: input.idempotencyKey || null,
				},
			});

			if (input.actorUserId) {
				await tx.auditLog.create({
					data: {
						userId: input.actorUserId,
						action: 'INVOICE_ISSUED',
						resource: 'Invoice',
						details: { invoiceId: invoice.id, paymentId: normalizedPaymentId, invoiceNumber },
					},
				});
			}

			if (input.idempotencyKey) {
				await tx.idempotencyKey.deleteMany({
					where: {
						id: input.idempotencyKey,
						endpoint,
						actorId: scopedActorId,
					},
				});

				await tx.idempotencyKey.create({
					data: {
						id: input.idempotencyKey,
						endpoint,
						actorId: scopedActorId,
						requestHash,
						response: { invoiceId: invoice.id } as any,
					},
				});
			}

			return invoice;
		});

		// Handle Swipe generation or PDF generation based on flag
		const enableSwipeOnly = process.env.ENABLE_SWIPE_ONLY === 'true';
		if (enableSwipeOnly) {
			// Trigger Swipe invoice generation via Zoho Flow
			logger.info('[Invoice] Triggering Swipe invoice generation', {
				invoiceId: created.id,
				invoiceNumber: created.invoiceNumber,
			});

			const swipeResult = await triggerSwipeInvoiceGeneration({
				invoiceId: created.id,
				customerName: customerName,
				customerPhone: customer.phone || null,
				customerEmail: customer.email || null,
				invoiceNumber: created.invoiceNumber,
				amountMinor: Number(created.amountMinor),
				merchantTransactionId: created.paymentTransactionId,
				timestamp: new Date(),
				actorUserId: input.actorUserId,
			});

			if (!swipeResult.success) {
				logger.error('[Invoice] Swipe generation failed, updating invoice status', {
					invoiceId: created.id,
					error: swipeResult.error,
				});

				await prisma.invoice.update({
					where: { id: created.id },
					data: {
						status: 'ZOHO_FLOW_ERROR',
						metadata: {
							...(created.metadata as Record<string, unknown>),
							swipeError: swipeResult.error,
							swipeFailedAt: new Date(),
						},
					},
				});
			}
		} else {
			// Run traditional PDF generation (existing behavior)
			try {
				// PDF generation would happen here if we're not using Swipe
				// For now, we'll skip it since ENABLE_SWIPE_ONLY is false by default (keeping existing behavior)
				logger.info('[Invoice] PDF generation would occur here (currently using Swipe prep only)', {
					invoiceId: created.id,
				});
			} catch (error) {
				logger.error('[Invoice] PDF generation preparation failed', {
					invoiceId: created.id,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		return mapInvoice(created);
	}

	async transitionInvoiceLifecycleByPaymentId(input: {
		paymentId: string;
		nextStatus: InvoiceLifecycleStatus;
		eventType: string;
		actorUserId?: string;
		idempotencyKey?: string;
	}): Promise<GeneratedInvoice | null> {
		const normalizedPaymentId = String(input.paymentId || '').trim();
		if (!normalizedPaymentId) return null;

		const invoice = await prisma.invoice.findUnique({ where: { paymentId: normalizedPaymentId } });
		if (!invoice) return null;

		const current = String(invoice.lifecycleStatus || 'DRAFT') as InvoiceLifecycleStatus;
		await this.assertValidTransition(current, input.nextStatus);

		const updated = await prisma.$transaction(async (tx) => {
			const before = { lifecycleStatus: current, status: invoice.status, paidAt: invoice.paidAt, refundedAt: invoice.refundedAt, version: invoice.version };

			const currentInTx = await tx.invoice.findUnique({ where: { id: invoice.id } });
			if (!currentInTx) {
				throw new AppError('Invoice not found', 404);
			}

			const currentLifecycle = String(currentInTx.lifecycleStatus || 'DRAFT') as InvoiceLifecycleStatus;
			await this.assertValidTransition(currentLifecycle, input.nextStatus);

			const updatedResult = await tx.invoice.updateMany({
				where: {
					id: invoice.id,
					version: Number(currentInTx.version || 1),
				},
				data: {
					lifecycleStatus: input.nextStatus,
					status: input.nextStatus,
					paidAt: input.nextStatus === 'PAID' ? new Date() : currentInTx.paidAt,
					refundedAt: input.nextStatus === 'REFUNDED' ? new Date() : currentInTx.refundedAt,
					version: { increment: 1 },
				},
			});

			if (updatedResult.count !== 1) {
				throw new AppError('Invoice transition conflict detected. Please retry.', 409);
			}

			const updatedInvoice = await tx.invoice.findUnique({ where: { id: invoice.id } });
			if (!updatedInvoice) {
				throw new AppError('Invoice not found after transition', 404);
			}

			await tx.invoiceEvent.create({
				data: {
					invoiceId: invoice.id,
					eventType: input.eventType,
					beforeState: before as any,
					afterState: {
						lifecycleStatus: updatedInvoice.lifecycleStatus,
						paidAt: updatedInvoice.paidAt,
						refundedAt: updatedInvoice.refundedAt,
					} as any,
					actorUserId: input.actorUserId || null,
					idempotencyKey: input.idempotencyKey || null,
				},
			});

			return updatedInvoice;
		});

		return mapInvoice(updated);
	}

	async getInvoiceDetail(invoiceId: string): Promise<InvoiceDetail> {
		const normalizedInvoiceId = String(invoiceId || '').trim();
		if (!normalizedInvoiceId) throw new AppError('invoiceId is required', 400);

		const invoice = await prisma.invoice.findUnique({
			where: { id: normalizedInvoiceId },
			include: {
				events: { orderBy: { createdAt: 'asc' } },
				payment: {
					select: {
						id: true,
						status: true,
						amountMinor: true,
						currency: true,
						merchantTransactionId: true,
					},
				},
			},
		});
		if (!invoice) throw new AppError('Invoice not found', 404);

		const auditLogs = await prisma.auditLog.findMany({
			where: {
				resource: 'Invoice',
				OR: [
					{ details: { path: ['invoiceId'], equals: invoice.id } as any },
					{ details: { path: ['paymentId'], equals: invoice.paymentId } as any },
				],
			},
			orderBy: { createdAt: 'desc' },
			take: 50,
		});

		return {
			invoice: mapInvoice(invoice),
			events: invoice.events.map((event) => ({
				id: String(event.id),
				eventType: String(event.eventType),
				actorUserId: event.actorUserId ? String(event.actorUserId) : null,
				idempotencyKey: event.idempotencyKey ? String(event.idempotencyKey) : null,
				createdAt: event.createdAt.toISOString(),
			})),
			payment: invoice.payment
				? {
						id: String(invoice.payment.id),
						status: String(invoice.payment.status),
						amountMinor: Number(invoice.payment.amountMinor || 0),
						currency: String(invoice.payment.currency || 'INR'),
						merchantTransactionId: String(invoice.payment.merchantTransactionId || ''),
					}
				: null,
			auditLogs: auditLogs.map((log) => ({
				id: String(log.id),
				action: String(log.action),
				resource: String(log.resource),
				createdAt: log.createdAt.toISOString(),
				userId: String(log.userId),
			})),
		};
	}

	async listInvoices(input: {
		page?: number;
		limit?: number;
		q?: string;
		sortBy?: 'createdAt' | 'issuedAt' | 'invoiceNumber' | 'amountMinor';
		sortOrder?: 'asc' | 'desc';
		status?: InvoiceLifecycleStatus;
	}): Promise<{ data: GeneratedInvoice[]; meta: { page: number; limit: number; totalItems: number; totalPages: number } }> {
		const page = Math.max(1, Number(input.page || 1));
		const limit = Math.min(100, Math.max(1, Number(input.limit || 20)));
		const skip = (page - 1) * limit;
		const allowedSortBy = new Set(['createdAt', 'issuedAt', 'invoiceNumber', 'amountMinor']);
		const sortBy = allowedSortBy.has(String(input.sortBy || '')) ? String(input.sortBy) : 'createdAt';
		const sortOrder = input.sortOrder || 'desc';
		const query = String(input.q || '').trim();

		const where: any = {
			...(input.status ? { lifecycleStatus: input.status } : {}),
			...(query
				? {
					OR: [
						{ invoiceNumber: { contains: query, mode: 'insensitive' } },
						{ customerEmail: { contains: query, mode: 'insensitive' } },
					],
				}
				: {}),
		};

		const [rows, totalItems] = await Promise.all([
			prisma.invoice.findMany({ where, skip, take: limit, orderBy: { [sortBy]: sortOrder } as any }),
			prisma.invoice.count({ where }),
		]);

		return {
			data: rows.map(mapInvoice),
			meta: {
				page,
				limit,
				totalItems,
				totalPages: Math.max(1, Math.ceil(totalItems / limit)),
			},
		};
	}

	async requestInvoiceRefund(input: {
		invoiceId: string;
		actorUserId: string;
		reason?: string;
		amountMinor?: number;
		idempotencyKey?: string;
	}): Promise<{ invoiceId: string; refundId: string; merchantRefundId: string; status: string }> {
		const endpoint = 'invoice.refund.request';
		const scopedActorId = input.actorUserId || 'system';
		if (input.idempotencyKey) {
			const idem = await prisma.idempotencyKey.findFirst({
				where: {
					id: input.idempotencyKey,
					endpoint,
					actorId: scopedActorId,
				},
			});
			if (idem?.response && typeof idem.response === 'object') {
				const cached = idem.response as any;
				if (cached?.invoiceId && cached?.refundId) {
					return {
						invoiceId: String(cached.invoiceId),
						refundId: String(cached.refundId),
						merchantRefundId: String(cached.merchantRefundId || ''),
						status: String(cached.status || 'PENDING'),
					};
				}
			}
		}

		const invoice = await prisma.invoice.findUnique({ where: { id: String(input.invoiceId || '').trim() } });
		if (!invoice) throw new AppError('Invoice not found', 404);
		if (!invoice.paymentId) throw new AppError('Invoice is not linked to a payment', 409);

		const lifecycle = String(invoice.lifecycleStatus || 'DRAFT') as InvoiceLifecycleStatus;
		if (lifecycle !== 'PAID') {
			throw new AppError('Only paid invoices can be refunded', 409);
		}

		const payment = await prisma.financialPayment.findUnique({ where: { id: invoice.paymentId } });
		if (!payment) throw new AppError('Payment not found for invoice', 404);
		if (String(payment.status) !== 'CAPTURED') {
			throw new AppError('Refund blocked: payment is not captured', 409);
		}

		const requestedAmount = input.amountMinor === undefined ? Number(payment.amountMinor || 0) : Math.round(Number(input.amountMinor));
		if (!Number.isFinite(requestedAmount) || requestedAmount < 1) {
			throw new AppError('Refund amount must be at least 1 paise', 422);
		}
		const amountMinor = Math.round(requestedAmount);
		if (amountMinor > Number(payment.amountMinor || 0)) {
			throw new AppError('Refund amount exceeds captured payment amount', 422);
		}
		const merchantRefundId = `RF_${Date.now()}_${String(payment.id).slice(0, 8)}`;

		const refundResult = await initiatePhonePeRefund({
			merchantRefundId,
			originalMerchantOrderId: payment.merchantTransactionId,
			amountInPaise: amountMinor,
		});

		const refundRecord = await prisma.financialRefund.create({
			data: {
				paymentId: payment.id,
				merchantRefundId,
				originalMerchantOrderId: payment.merchantTransactionId,
				phonePeRefundId: refundResult.refundId || null,
				amountMinor,
				currency: payment.currency || 'INR',
				status: refundResult.state === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
				reason: input.reason || null,
				responseData: refundResult.responseData as any,
			},
		});

		await this.recordInvoiceEvent({
			invoiceId: invoice.id,
			eventType: 'REFUND_REQUESTED',
			beforeState: { lifecycleStatus: lifecycle },
			afterState: { lifecycleStatus: lifecycle, refundState: refundRecord.status },
			actorUserId: input.actorUserId,
			idempotencyKey: input.idempotencyKey,
		});

		await prisma.auditLog.create({
			data: {
				userId: input.actorUserId,
				action: 'INVOICE_REFUND_REQUESTED',
				resource: 'Invoice',
				details: {
					invoiceId: invoice.id,
					paymentId: invoice.paymentId,
					refundId: refundRecord.id,
					reason: input.reason || null,
					amountMinor,
				},
			},
		});

		const response = {
			invoiceId: invoice.id,
			refundId: refundRecord.id,
			merchantRefundId,
			status: String(refundRecord.status),
		};

		if (input.idempotencyKey) {
			await prisma.idempotencyKey.deleteMany({
				where: {
					id: input.idempotencyKey,
					endpoint,
					actorId: scopedActorId,
				},
			});
			await prisma.idempotencyKey.create({
				data: {
					id: input.idempotencyKey,
					endpoint,
					actorId: scopedActorId,
					requestHash: hashRequestPayload({ invoiceId: invoice.id, amountMinor, reason: input.reason || null }),
					response: response as any,
				},
			});
		};

		return response;
	}

	async ensureInvoiceForPayment(paymentId: string): Promise<GeneratedInvoice> {
		const normalizedPaymentId = String(paymentId || '').trim();
		if (!normalizedPaymentId) {
			throw new AppError('paymentId is required', 400);
		}

		const generated = await this.generateInvoice({ paymentId: normalizedPaymentId });
		if (!generated.pdfPath || !generated.htmlPath) {
			return await this.rebuildInvoiceArtifacts(generated.id);
		}
		return generated;
	}

	async getInvoiceById(invoiceId: string): Promise<GeneratedInvoice> {
		const invoice = await prisma.invoice.findUnique({ where: { id: String(invoiceId || '').trim() } });
		if (!invoice) {
			throw new AppError('Invoice not found', 404);
		}
		return mapInvoice(invoice);
	}

	async getInvoiceByPaymentId(paymentId: string): Promise<GeneratedInvoice | null> {
		const invoice = await prisma.invoice.findUnique({ where: { paymentId: String(paymentId || '').trim() } });
		return invoice ? mapInvoice(invoice) : null;
	}

	async rebuildInvoiceArtifacts(invoiceId: string): Promise<GeneratedInvoice> {
		const invoice = await prisma.invoice.findUnique({ where: { id: String(invoiceId || '').trim() } });
		if (!invoice) {
			throw new AppError('Invoice not found', 404);
		}
		if (!invoice.paymentId) {
			throw new AppError('Invoice is not linked to a payment', 409);
		}

		const payment = await prisma.financialPayment.findUnique({ where: { id: invoice.paymentId } });
		if (!payment) {
			throw new AppError('Payment not found for invoice', 404);
		}

		const customer = await prisma.user.findUnique({
			where: { id: invoice.userId },
			select: { name: true, firstName: true, lastName: true, email: true, phone: true },
		});
		if (!customer) {
			throw new AppError('Invoice customer not found', 404);
		}

		const issuedAt = invoice.issuedAt || invoice.createdAt || new Date();
		const metadata = ((invoice.metadata as Record<string, unknown> | null) || {}) as Record<string, unknown>;
		let resolvedMetadata = { ...metadata } as Record<string, unknown>;

		if (!resolvedMetadata.upiQrDataUrl || !resolvedMetadata.upiString) {
			const upiMeta = await buildUpiMetadata({
				invoiceId: invoice.id,
				invoiceNumber: invoice.invoiceNumber,
				totalMinor: Number(invoice.totalMinor),
			});
			if (upiMeta) {
				resolvedMetadata = {
					...resolvedMetadata,
					invoiceId: invoice.id,
					upiString: upiMeta.upiString,
					upiQrDataUrl: upiMeta.qrDataUrl,
				};

				await prisma.invoice.update({
					where: { id: invoice.id },
					data: { metadata: resolvedMetadata as any },
				});
			}
		}
		const renderData: InvoiceRenderData = {
			invoiceId: invoice.id,
			invoiceNumber: invoice.invoiceNumber,
			invoiceYear: invoice.invoiceYear,
			sequenceNumber: invoice.sequenceNumber,
			issuedAt,
			companyName: invoice.companyName,
			companyGstin: invoice.companyGstin || null,
			companyAddress: (invoice.companyAddress as Record<string, unknown> | null) || null,
			customerName: invoice.customerName,
			customerEmail: invoice.customerEmail || null,
			customerPhone: invoice.customerPhone || null,
			customerGstin: invoice.customerGstin || null,
			billingAddress: (invoice.billingAddress as Record<string, unknown> | null) || null,
			currency: invoice.currency,
			items: Array.isArray(invoice.items) ? (invoice.items as any) : [],
			subtotalMinor: Number(invoice.subtotalMinor),
			gstRate: invoice.gstRate,
			cgstMinor: Number(invoice.cgstMinor),
			sgstMinor: Number(invoice.sgstMinor),
			gstAmountMinor: Number(invoice.gstAmountMinor),
			totalMinor: Number(invoice.totalMinor),
			paymentReference: invoice.paymentTransactionId,
			paymentStatus: invoice.status,
			metadata: {
				...resolvedMetadata,
				invoiceId: invoice.id,
			},
		};
		const html = renderInvoiceHtml(renderData);
		const pdfBuffer = await buildPdfBuffer(html);
		const paths = await writeInvoiceFiles(invoice.invoiceYear, invoice.invoiceNumber, html, pdfBuffer);

		const updatedInvoice = await prisma.invoice.update({
			where: { id: invoice.id },
			data: { htmlPath: paths.htmlPath, pdfPath: paths.pdfPath },
		});

		return mapInvoice(updatedInvoice);
	}

	async resendInvoice(paymentId: string): Promise<GeneratedInvoice> {
		const invoice = await this.ensureInvoiceForPayment(paymentId);
		const fullInvoice = await prisma.invoice.findUnique({ where: { paymentId: String(paymentId).trim() } });
		if (!fullInvoice || !fullInvoice.customerEmail || !fullInvoice.pdfPath) {
			return invoice;
		}

		const pdfBuffer = await readFile(fullInvoice.pdfPath);
		const metadata = ((fullInvoice.metadata as Record<string, unknown> | null) || {}) as Record<string, unknown>;
		const html = fullInvoice.htmlPath ? await readFile(fullInvoice.htmlPath, 'utf8') : renderInvoiceHtml({
			invoiceId: fullInvoice.id,
			invoiceNumber: fullInvoice.invoiceNumber,
			invoiceYear: fullInvoice.invoiceYear,
			sequenceNumber: fullInvoice.sequenceNumber,
			issuedAt: fullInvoice.issuedAt || fullInvoice.createdAt,
			companyName: fullInvoice.companyName,
			companyGstin: fullInvoice.companyGstin || null,
			companyAddress: (fullInvoice.companyAddress as Record<string, unknown> | null) || null,
			customerName: fullInvoice.customerName,
			customerEmail: fullInvoice.customerEmail || null,
			customerPhone: fullInvoice.customerPhone || null,
			customerGstin: fullInvoice.customerGstin || null,
			billingAddress: (fullInvoice.billingAddress as Record<string, unknown> | null) || null,
			currency: fullInvoice.currency,
			items: Array.isArray(fullInvoice.items) ? (fullInvoice.items as any) : [],
			subtotalMinor: Number(fullInvoice.subtotalMinor),
			gstRate: fullInvoice.gstRate,
			cgstMinor: Number(fullInvoice.cgstMinor),
			sgstMinor: Number(fullInvoice.sgstMinor),
			gstAmountMinor: Number(fullInvoice.gstAmountMinor),
			totalMinor: Number(fullInvoice.totalMinor),
			paymentReference: fullInvoice.paymentTransactionId,
			paymentStatus: fullInvoice.status,
			metadata: {
				...metadata,
				invoiceId: fullInvoice.id,
			},
		});

		await sendInvoiceEmail({
			to: fullInvoice.customerEmail,
			subject: `MANAS360 Invoice ${fullInvoice.invoiceNumber}`,
			html,
			text: buildInvoiceText(fullInvoice.invoiceNumber, fullInvoice.customerName, Number(fullInvoice.totalMinor)),
			attachments: [{
				filename: `${fullInvoice.invoiceNumber}.pdf`,
				content: pdfBuffer,
				contentType: 'application/pdf',
			}],
		});

		const updatedInvoice = await prisma.invoice.update({
			where: { id: fullInvoice.id },
			data: {
				status: fullInvoice.lifecycleStatus,
				emailedTo: fullInvoice.customerEmail,
				emailedAt: new Date(),
				sentAt: new Date(),
				deliveryError: null,
			},
		});

		await this.recordInvoiceEvent({
			invoiceId: fullInvoice.id,
			eventType: 'RESENT',
			afterState: {
				status: 'SENT',
				lifecycleStatus: String(updatedInvoice.lifecycleStatus || 'DRAFT'),
			},
		});

		return mapInvoice(updatedInvoice);
	}
}

export const invoiceService = new InvoiceService();
