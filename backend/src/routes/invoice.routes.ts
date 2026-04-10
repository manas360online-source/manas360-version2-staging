import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAdminPolicy, requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import {
	bulkResendInvoicesController,
	downloadInvoicePdfController,
	exportInvoicesController,
	generateInvoiceController,
	getInvoiceByPaymentController,
	getInvoiceController,
	listInvoicesController,
	requestInvoiceRefundController,
	resendInvoiceController,
} from '../controllers/invoice.controller';
import {
	listSwipeItemsController,
	syncSwipeItemsController,
	getInvoiceGenerationStatsController,
	getSwipeErrorsController,
} from '../controllers/admin/swipe-items.controller';

const router = Router();

router.get('/', requireAuth, requireRole('admin'), requireAdminPolicy('invoices.view'), asyncHandler(listInvoicesController));
router.post('/export', requireAuth, requireRole('admin'), requireAdminPolicy('invoices.view'), asyncHandler(exportInvoicesController));
router.post('/resend-bulk', requireAuth, requireRole('admin'), requireAdminPolicy('invoices.manage'), asyncHandler(bulkResendInvoicesController));

// Swipe configuration endpoints (admin only)
router.get('/admin/swipe-items', requireAuth, requireRole('admin'), requireAdminPolicy('invoices.manage'), asyncHandler(listSwipeItemsController));
router.post('/admin/swipe-items/sync', requireAuth, requireRole('admin'), requireAdminPolicy('invoices.manage'), asyncHandler(syncSwipeItemsController));
router.get('/admin/generation-stats', requireAuth, requireRole('admin'), requireAdminPolicy('invoices.view'), asyncHandler(getInvoiceGenerationStatsController));
router.get('/admin/swipe-errors', requireAuth, requireRole('admin'), requireAdminPolicy('invoices.view'), asyncHandler(getSwipeErrorsController));

// Invoice generation and retrieval
router.post('/payments/:paymentId/generate', requireAuth, asyncHandler(generateInvoiceController));
router.post('/payments/:paymentId/resend', requireAuth, asyncHandler(resendInvoiceController));
router.get('/payments/:paymentId', requireAuth, asyncHandler(getInvoiceByPaymentController));
router.get('/:invoiceId', requireAuth, asyncHandler(getInvoiceController));
router.get('/:invoiceId/pdf', requireAuth, asyncHandler(downloadInvoicePdfController));
router.post('/:invoiceId/refund', requireAuth, requireRole('admin'), requireAdminPolicy('invoices.refund'), asyncHandler(requestInvoiceRefundController));

export default router;
