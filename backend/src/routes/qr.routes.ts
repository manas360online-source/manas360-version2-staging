import { Router } from 'express';
import { asyncHandler } from '../middleware/validate.middleware';
import { connectedQrCodeController, redirectQrCodeController } from '../controllers/qr.controller';

const router = Router();

router.get('/:code', asyncHandler(redirectQrCodeController));
router.post('/:code/connected', asyncHandler(connectedQrCodeController));

export default router;
