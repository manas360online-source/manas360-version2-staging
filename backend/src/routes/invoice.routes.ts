import { Router } from 'express';
import { getUniversalInvoiceController } from '../controllers/payment.controller';
import {
	getPatientInvoicesController,
	downloadPatientInvoiceController,
} from '../controllers/patient-v1.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/validate.middleware';

const router = Router();

router.get('/universal/:orderId', requireAuth, asyncHandler(getUniversalInvoiceController));
router.get('/patient', requireAuth, asyncHandler(getPatientInvoicesController));
router.get('/patient/:id/download', requireAuth, asyncHandler(downloadPatientInvoiceController));

export default router;