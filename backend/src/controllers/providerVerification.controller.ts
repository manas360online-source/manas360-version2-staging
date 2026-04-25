import type { Request, Response } from 'express';
import { prisma as db } from '../config/db';
import { logger } from '../utils/logger';
import { triggerZohoFlow } from '../services/zohoDesk.service';

/**
 * POST /api/v1/admin/verify-provider
 * Webhook callback from Zoho Desk/Flow when manual verification completes.
 * Body: { userId, status: 'verified'|'rejected', reviewedBy?, notes? }
 */
export const verifyProviderWebhookController = async (req: Request, res: Response) => {
  const configuredSecret = String(process.env.ZOHO_FLOW_WEBHOOK_SECRET || '').trim();
  const incomingSecret = String(req.headers['x-zoho-flow-secret'] || '').trim();
  if (configuredSecret && configuredSecret !== incomingSecret) {
    logger.warn('[ProviderVerification] webhook secret mismatch');
    return res.status(401).json({ success: false, message: 'Invalid webhook secret' });
  }

  const { userId, status, reviewedBy, notes } = req.body || {};
  if (!userId || !status) return res.status(422).json({ success: false, message: 'userId and status are required' });

  try {
    await db.providerVerification.upsert({
      where: { userId: String(userId) },
      create: {
        userId: String(userId),
        license: '',
        licenseType: '',
        status: String(status),
        checks: null,
        flagReasons: null,
        verifiedAt: status === 'verified' ? new Date() : null,
        reviewedBy: reviewedBy || null,
        notes: notes || null,
      },
      update: {
        status: String(status),
        verifiedAt: status === 'verified' ? new Date() : null,
        reviewedBy: reviewedBy || null,
        notes: notes || null,
      }
    });

    if (status === 'verified') {
      await db.user.update({ where: { id: String(userId) }, data: { isTherapistVerified: true, therapistVerifiedAt: new Date(), therapistVerifiedByUserId: reviewedBy || null } });
      // Trigger downstream flows (notifications, training enrolment)
      await triggerZohoFlow('PROVIDER_VERIFIED', { userId: String(userId) });
    } else if (status === 'rejected') {
      await db.user.update({ where: { id: String(userId) }, data: { isTherapistVerified: false, therapistVerifiedAt: null, therapistVerifiedByUserId: reviewedBy || null } });
      await triggerZohoFlow('PROVIDER_REJECTED', { userId: String(userId), reason: notes || null });
    }

    return res.json({ success: true });
  } catch (err: any) {
    logger.error('[ProviderVerification] webhook handler failed', { error: err?.message });
    return res.status(500).json({ success: false, message: err?.message || 'internal error' });
  }
};

export const rejectProviderWebhookController = async (req: Request, res: Response) => {
  // Reuse verify handler semantics for rejection
  const body = req.body || {};
  body.status = 'rejected';
  return verifyProviderWebhookController(req, res);
};
