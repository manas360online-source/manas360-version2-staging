import { Router } from 'express';
import { asyncHandler } from '../middleware/validate.middleware';
import { connectedQrCodeController, redirectQrCodeController, redirectUniversalQrCodeController } from '../controllers/qr.controller';

const router = Router();

router.get('/:qr_type/:unique_id', asyncHandler(redirectUniversalQrCodeController));
router.get('/:code', asyncHandler(redirectQrCodeController));
router.post('/:code/connected', asyncHandler(connectedQrCodeController));

export default router;
