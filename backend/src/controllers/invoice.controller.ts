import type { Request, Response } from 'express';
import path from 'path';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { invoiceService } from '../services/invoice.service';

const isAdminUser = async (userId: string): Promise<boolean> => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { role: true, isCompanyAdmin: true },
	});
	return Boolean(user && (user.isCompanyAdmin || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'));
};

const resolvePaymentOwnerId = (payment: { patientId?: string | null; providerId?: string | null; merchantTransactionId?: string | null; metadata?: unknown; paymentType?: string | null }): string => {
	const metadata = (payment.metadata && typeof payment.metadata === 'object' ? payment.metadata : {}) as Record<string, unknown>;
	const paymentType = String(metadata.type || payment.paymentType || '').toLowerCase();
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

const assertInvoiceAccess = async (invoiceId: string, userId: string): Promise<void> => {
	const invoice = await prisma.invoice.findUnique({
		where: { id: invoiceId },
		select: { userId: true },
	});
	if (!invoice) {
		throw new AppError('Invoice not found', 404);
	}

	if (invoice.userId === userId) {
		return;
	}

	if (await isAdminUser(userId)) {
		return;
	}

	throw new AppError('Forbidden', 403);
};

const assertPaymentInvoiceAccess = async (paymentId: string, userId: string): Promise<void> => {
	const payment = await prisma.financialPayment.findUnique({
		where: { id: paymentId },
		select: { patientId: true, providerId: true, merchantTransactionId: true, metadata: true, paymentType: true },
	});
	if (!payment) {
		throw new AppError('Payment not found', 404);
	}

	if (resolvePaymentOwnerId(payment) === userId) {
		return;
	}

	if (await isAdminUser(userId)) {
		return;
	}

	const invoice = await prisma.invoice.findUnique({
		where: { paymentId },
		select: { userId: true },
	});
	if (!invoice) {
		throw new AppError('Forbidden', 403);
	}

	if (invoice.userId === userId) {
		return;
	}

	throw new AppError('Forbidden', 403);
};

export const generateInvoiceController = async (req: Request, res: Response): Promise<void> => {
	const paymentId = String(req.params.paymentId || '').trim();
	const userId = String((req as Request & { auth?: { userId?: string } }).auth?.userId || '').trim();
	if (!userId) {
		throw new AppError('Authentication required', 401);
	}
	await assertPaymentInvoiceAccess(paymentId, userId);
	const invoice = await invoiceService.ensureInvoiceForPayment(paymentId);
	res.status(201).json({ success: true, data: invoice });
};

export const resendInvoiceController = async (req: Request, res: Response): Promise<void> => {
	const paymentId = String(req.params.paymentId || '').trim();
	const userId = String((req as Request & { auth?: { userId?: string } }).auth?.userId || '').trim();
	if (!userId) {
		throw new AppError('Authentication required', 401);
	}
	await assertPaymentInvoiceAccess(paymentId, userId);
	const invoice = await invoiceService.resendInvoice(paymentId);
	res.status(200).json({ success: true, data: invoice });
};

export const getInvoiceController = async (req: Request, res: Response): Promise<void> => {
	const invoiceId = String(req.params.invoiceId || '').trim();
	const userId = String((req as Request & { auth?: { userId?: string } }).auth?.userId || '').trim();

	if (!userId) {
		throw new AppError('Authentication required', 401);
	}

	await assertInvoiceAccess(invoiceId, userId);
	const invoice = await invoiceService.getInvoiceById(invoiceId);
	res.status(200).json({ success: true, data: invoice });
};

export const downloadInvoicePdfController = async (req: Request, res: Response): Promise<void> => {
	const invoiceId = String(req.params.invoiceId || '').trim();
	const userId = String((req as Request & { auth?: { userId?: string } }).auth?.userId || '').trim();

	if (!userId) {
		throw new AppError('Authentication required', 401);
	}

	await assertInvoiceAccess(invoiceId, userId);
	const invoice = await invoiceService.getInvoiceById(invoiceId);
	const fullInvoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
	if (!fullInvoice?.pdfPath) {
		const rebuilt = await invoiceService.rebuildInvoiceArtifacts(invoiceId);
		const rebuiltRow = await prisma.invoice.findUnique({ where: { id: rebuilt.id } });
		if (!rebuiltRow?.pdfPath) {
			throw new AppError('Invoice PDF unavailable', 404);
		}
		res.download(path.resolve(rebuiltRow.pdfPath), `${rebuilt.invoiceNumber}.pdf`);
		return;
	}

	res.download(path.resolve(fullInvoice.pdfPath), `${invoice.invoiceNumber}.pdf`);
};

export const getInvoiceByPaymentController = async (req: Request, res: Response): Promise<void> => {
	const paymentId = String(req.params.paymentId || '').trim();
	const userId = String((req as Request & { auth?: { userId?: string } }).auth?.userId || '').trim();
	if (!userId) {
		throw new AppError('Authentication required', 401);
	}
	await assertPaymentInvoiceAccess(paymentId, userId);
	const invoice = await invoiceService.getInvoiceByPaymentId(paymentId);
	if (!invoice) {
		throw new AppError('Invoice not found', 404);
	}
	res.status(200).json({ success: true, data: invoice });
};
