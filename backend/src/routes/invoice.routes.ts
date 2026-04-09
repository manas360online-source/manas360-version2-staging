import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import {
	downloadInvoicePdfController,
	generateInvoiceController,
	getInvoiceByPaymentController,
	getInvoiceController,
	resendInvoiceController,
} from '../controllers/invoice.controller';

const router = Router();

router.post('/payments/:paymentId/generate', requireAuth, asyncHandler(generateInvoiceController));
router.post('/payments/:paymentId/resend', requireAuth, asyncHandler(resendInvoiceController));
router.get('/payments/:paymentId', requireAuth, asyncHandler(getInvoiceByPaymentController));
router.get('/:invoiceId', requireAuth, asyncHandler(getInvoiceController));
router.get('/:invoiceId/pdf', requireAuth, asyncHandler(downloadInvoicePdfController));

export default router;
