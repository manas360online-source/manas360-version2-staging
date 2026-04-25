import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import {
    listAllProviderExtraQuestionsAdminController,
    createScreeningTemplateAdminController,
    listTemplateQuestionsAdminController,
    createTemplateQuestionAdminController,
} from '../controllers/free-screening-admin.controller';

const router = Router();

router.get('/screening/provider-questions', requireAuth, requireRole('admin'), asyncHandler(listAllProviderExtraQuestionsAdminController));
router.post('/screening/templates', requireAuth, requireRole('admin'), asyncHandler(createScreeningTemplateAdminController));
router.get('/screening/templates/:templateId/questions', requireAuth, requireRole('admin'), asyncHandler(listTemplateQuestionsAdminController));
router.post('/screening/templates/:templateId/questions', requireAuth, requireRole('admin'), asyncHandler(createTemplateQuestionAdminController));

export default router;
