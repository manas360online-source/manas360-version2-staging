import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import { sendSuccess } from '../utils/response';
import {
  confirmPrivateInvitePaymentController,
  confirmPublicJoinController,
  createGroupTherapyRequestController,
  createPrivateInviteController,
  createPrivateInvitePaymentIntentController,
  createPublicJoinPaymentIntentController,
  getAdminGroupTherapyRequestsController,
  getMyGroupTherapyRequestsController,
  listMyPrivateInvitesController,
  listProviderPatientsForInviteController,
  listPublicPublishedGroupTherapySessionsController,
  publishGroupTherapySessionController,
  respondPrivateInviteController,
  reviewGroupTherapyRequestController,
} from '../controllers/group-therapy.controller';

const router = Router();

const providerRoles = ['therapist', 'psychologist', 'psychiatrist', 'coach'] as const;

// Test endpoint to verify public routes work
router.get('/public/health', (_req, res) => {
  res.status(200).json({ status: 'ok', message: 'Public group-therapy endpoint is accessible' });
});

// Public discovery + guest join payment flow (NO AUTH REQUIRED)
router.get('/public/sessions', asyncHandler(listPublicPublishedGroupTherapySessionsController));
router.post('/public/sessions/:sessionId/join/payment-intent', asyncHandler(createPublicJoinPaymentIntentController));
router.post('/public/sessions/:sessionId/join/confirm', asyncHandler(confirmPublicJoinController));

// Therapist/Admin creation and approval workflow
router.post('/requests', requireAuth, requireRole(['admin', 'superadmin', ...providerRoles]), asyncHandler(createGroupTherapyRequestController));
router.get('/requests/mine', requireAuth, requireRole(['admin', 'superadmin', ...providerRoles]), asyncHandler(getMyGroupTherapyRequestsController));
router.get('/admin/requests', requireAuth, requireRole(['admin', 'superadmin']), asyncHandler(getAdminGroupTherapyRequestsController));
router.patch('/admin/requests/:id/review', requireAuth, requireRole(['admin', 'superadmin']), asyncHandler(reviewGroupTherapyRequestController));
router.patch('/admin/requests/:id/publish', requireAuth, requireRole(['admin', 'superadmin']), asyncHandler(publishGroupTherapySessionController));

// Private invite lifecycle (therapist -> patient -> payment)
router.get('/private/patients', requireAuth, requireRole(providerRoles as any), asyncHandler(listProviderPatientsForInviteController));
router.post('/private/invites', requireAuth, requireRole(providerRoles as any), asyncHandler(createPrivateInviteController));
router.get('/private/invites/mine', requireAuth, requireRole('patient'), asyncHandler(listMyPrivateInvitesController));
router.patch('/private/invites/:inviteId/respond', requireAuth, requireRole('patient'), asyncHandler(respondPrivateInviteController));
router.post('/private/invites/:inviteId/payment-intent', requireAuth, requireRole('patient'), asyncHandler(createPrivateInvitePaymentIntentController));
router.post('/private/invites/:inviteId/payment-confirm', requireAuth, requireRole('patient'), asyncHandler(confirmPrivateInvitePaymentController));

export default router;
