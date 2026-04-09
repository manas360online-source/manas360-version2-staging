import { mkdir, writeFile, readFile } from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { triggerZohoFlow } from './zohoDesk.service';
import { renderInvoiceHtml, type InvoiceRenderData } from './invoice.renderer';
import { sendInvoiceEmail } from './invoice.mailer';

export type GeneratedInvoice = {
	id: string;
	paymentId: string;
	invoiceNumber: string;
	invoiceYear: number;
	sequenceNumber: number;
	status: string;
	pdfPath: string | null;
	htmlPath: string | null;
	emailedTo: string | null;
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
	`INV-${year}-${String(sequenceNumber).padStart(4, '0')}`;

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

const buildInvoiceItems = (description: string, subtotalMinor: number, totalMinor: number) => ([
	{
		description,
		quantity: 1,
		unitPriceMinor: subtotalMinor,
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
	paymentId: String(invoice.paymentId),
	invoiceNumber: String(invoice.invoiceNumber),
	invoiceYear: Number(invoice.invoiceYear),
	sequenceNumber: Number(invoice.sequenceNumber),
	status: String(invoice.status),
	pdfPath: invoice.pdfPath ? String(invoice.pdfPath) : null,
	htmlPath: invoice.htmlPath ? String(invoice.htmlPath) : null,
	emailedTo: invoice.emailedTo ? String(invoice.emailedTo) : null,
});

export class InvoiceService {
	async ensureInvoiceForPayment(paymentId: string): Promise<GeneratedInvoice> {
		const normalizedPaymentId = String(paymentId || '').trim();
		if (!normalizedPaymentId) {
			throw new AppError('paymentId is required', 400);
		}

		const existingInvoice = await prisma.invoice.findUnique({
			where: { paymentId: normalizedPaymentId },
		});
		if (existingInvoice) {
			if (!existingInvoice.pdfPath || !existingInvoice.htmlPath) {
				return await this.rebuildInvoiceArtifacts(existingInvoice.id);
			}
			return mapInvoice(existingInvoice);
		}

		const payment = await prisma.financialPayment.findUnique({
			where: { id: normalizedPaymentId },
		});
		if (!payment) {
			throw new AppError('Payment not found', 404);
		}

		if (String(payment.status) !== 'CAPTURED') {
			throw new AppError('Invoice can only be generated for captured payments', 409);
		}

		const userId = resolveInvoiceCustomerId(payment);
		if (!userId) {
			throw new AppError('Unable to resolve invoice customer for payment', 422);
		}

		const customer = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, name: true, firstName: true, lastName: true, email: true, phone: true, companyKey: true },
		});
		if (!customer) {
			throw new AppError('Invoice customer not found', 404);
		}

		const totalMinor = toMinor(payment.amountMinor);
		const gstRate = DEFAULT_GST_RATE;
		const tax = computeTaxBreakdown(totalMinor, gstRate);
		const invoiceYear = new Date(payment.capturedAt || payment.createdAt || new Date()).getFullYear();
		const paymentMetadata = (payment.metadata as Record<string, unknown> | null) || {};
		const invoiceText = String(paymentMetadata.plan || paymentMetadata.type || payment.paymentType || 'MANAS360 service charges');
		const invoiceDescription = invoiceText.charAt(0).toUpperCase() + invoiceText.slice(1);
		const customerName = String(customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer');
		const sequenceRow = await prisma.invoiceSequence.upsert({
			where: { year: invoiceYear },
			create: { year: invoiceYear, lastSequence: 1 },
			update: { lastSequence: { increment: 1 } },
		});
		const sequenceNumber = Number(sequenceRow.lastSequence || 1);
		const invoiceNumber = formatInvoiceNumber(invoiceYear, sequenceNumber);
		const invoiceItems = buildInvoiceItems(invoiceDescription, tax.subtotalMinor, tax.totalMinor);

		let createdInvoice: any;
		try {
			createdInvoice = await prisma.invoice.create({
				data: {
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
					status: 'GENERATED',
					metadata: {
						source: 'payment-success',
						merchantTransactionId: payment.merchantTransactionId,
						paymentType: payment.paymentType,
					},
				},
			});
		} catch (error: any) {
			const duplicate = await prisma.invoice.findUnique({ where: { paymentId: normalizedPaymentId } });
			if (duplicate) {
				return await this.rebuildInvoiceArtifacts(duplicate.id);
			}
			throw error;
		}

		const renderData: InvoiceRenderData = {
			invoiceNumber,
			invoiceYear,
			sequenceNumber,
			issuedAt: new Date(),
			companyName: 'MANAS360',
			companyGstin: process.env.COMPANY_GSTIN || null,
			companyAddress: parseJsonEnv(process.env.COMPANY_ADDRESS_JSON),
			customerName,
			customerEmail: customer.email || null,
			customerPhone: customer.phone || null,
			billingAddress: null,
			currency: String(payment.currency || 'INR'),
			items: invoiceItems,
			subtotalMinor: tax.subtotalMinor,
			gstRate,
			cgstMinor: tax.cgstMinor,
			sgstMinor: tax.sgstMinor,
			gstAmountMinor: tax.gstAmountMinor,
			totalMinor: tax.totalMinor,
			paymentReference: String(payment.merchantTransactionId),
			paymentStatus: String(payment.status),
			metadata: {
				source: 'payment-success',
				paymentId: payment.id,
				merchantTransactionId: payment.merchantTransactionId,
			},
		};
		const html = renderInvoiceHtml(renderData);
		const pdfBuffer = await buildPdfBuffer(html);
		const paths = await writeInvoiceFiles(invoiceYear, invoiceNumber, html, pdfBuffer);

		const updatedInvoice = await prisma.invoice.update({
			where: { id: createdInvoice.id },
			data: {
				htmlPath: paths.htmlPath,
				pdfPath: paths.pdfPath,
				status: 'GENERATED',
			},
		});

		if (customer.email) {
			try {
				await sendInvoiceEmail({
					to: customer.email,
					subject: `MANAS360 Invoice ${invoiceNumber}`,
					html,
					text: buildInvoiceText(invoiceNumber, customerName, tax.totalMinor),
					attachments: [{
						filename: `${invoiceNumber}.pdf`,
						content: pdfBuffer,
						contentType: 'application/pdf',
					}],
				});

				await prisma.invoice.update({
					where: { id: updatedInvoice.id },
					data: {
						status: 'SENT',
						emailedTo: customer.email,
						emailedAt: new Date(),
						sentAt: new Date(),
					},
				});
			} catch (error: any) {
				logger.error('[InvoiceService] Invoice email failed', { invoiceNumber, error: error?.message || error });
				await prisma.invoice.update({
					where: { id: updatedInvoice.id },
					data: {
						status: 'GENERATED',
						deliveryError: String(error?.message || error),
						failedAt: new Date(),
					},
				});
			}
		}

		await triggerZohoFlow('invoice_generated', {
			invoiceId: updatedInvoice.id,
			invoiceNumber,
			paymentId: normalizedPaymentId,
			merchantTransactionId: payment.merchantTransactionId,
			userId,
			customerEmail: customer.email || null,
			totalMinor: tax.totalMinor,
		});

		return mapInvoice({ ...updatedInvoice, pdfPath: paths.pdfPath, htmlPath: paths.htmlPath, emailedTo: customer.email || null });
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
		const renderData: InvoiceRenderData = {
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
			metadata: (invoice.metadata as Record<string, unknown> | null) || null,
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
		const html = fullInvoice.htmlPath ? await readFile(fullInvoice.htmlPath, 'utf8') : renderInvoiceHtml({
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
			metadata: (fullInvoice.metadata as Record<string, unknown> | null) || null,
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

		await prisma.invoice.update({
			where: { id: fullInvoice.id },
			data: {
				status: 'SENT',
				emailedTo: fullInvoice.customerEmail,
				emailedAt: new Date(),
				sentAt: new Date(),
				deliveryError: null,
			},
		});

		return mapInvoice(fullInvoice);
	}
}

export const invoiceService = new InvoiceService();
