import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import {
  createInstitutionalAgreementController,
  getInstitutionalAgreementStatusController,
  listAgreementTemplatesController,
  listInstitutionalAgreementsController,
  sendInstitutionalAgreementController,
} from '../controllers/institutional-agreement.controller';

const router = Router();

router.get('/templates', asyncHandler(listAgreementTemplatesController));
router.post('/create', requireAuth, asyncHandler(createInstitutionalAgreementController));
router.post('/:id/send', requireAuth, asyncHandler(sendInstitutionalAgreementController));
router.get('/:id/status', requireAuth, asyncHandler(getInstitutionalAgreementStatusController));
router.get('/', asyncHandler(listInstitutionalAgreementsController));

export default router;
