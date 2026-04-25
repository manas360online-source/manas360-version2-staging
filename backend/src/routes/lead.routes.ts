import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole, requireTherapistRole } from '../middleware/rbac.middleware';
import { requireProviderSubscription } from '../middleware/subscription.middleware';
import {
	asyncHandler,
	validateSessionIdParam,
	validateTherapistLeadsQuery,
} from '../middleware/validate.middleware';
import {
	confirmMyTherapistLeadPurchaseController,
	dispatchPriorityTierLeadNotificationsController,
	getMyTherapistLeadsController,
	initiateMyTherapistLeadPurchaseController,
	publishInstitutionalEngagementLeadsController,
	purchaseMyTherapistLeadController,
} from '../controllers/lead.controller';

const router = Router();

router.get('/me', requireAuth, requireTherapistRole, requireProviderSubscription, ...validateTherapistLeadsQuery, asyncHandler(getMyTherapistLeadsController));
router.post('/:id/purchase/initiate', requireAuth, requireTherapistRole, requireProviderSubscription, ...validateSessionIdParam, asyncHandler(initiateMyTherapistLeadPurchaseController));
router.post('/:id/purchase/confirm', requireAuth, requireTherapistRole, requireProviderSubscription, ...validateSessionIdParam, asyncHandler(confirmMyTherapistLeadPurchaseController));
router.post('/:id/purchase', requireAuth, requireTherapistRole, requireProviderSubscription, ...validateSessionIdParam, asyncHandler(purchaseMyTherapistLeadController));
router.post('/b2b/publish', requireAuth, requireRole(['admin', 'superadmin']), asyncHandler(publishInstitutionalEngagementLeadsController));
router.post('/b2b/dispatch-priority-notifications', requireAuth, requireRole(['admin', 'superadmin']), asyncHandler(dispatchPriorityTierLeadNotificationsController));

export default router;
