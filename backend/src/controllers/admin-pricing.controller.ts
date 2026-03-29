import { Request, Response } from 'express';
import { prisma as db } from '../config/db';
import { io } from '../socket';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';

/**
 * POST /api/v1/admin/pricing/free-toggle
 * Toggle global free sign-up period for new users.
 */
export const toggleGlobalFreeController = async (req: Request, res: Response) => {
  const { days } = req.body; // e.g. 30

  try {
    const daysNum = Number(days);
    if (isNaN(daysNum)) {
      return res.status(400).json({ success: false, message: 'Invalid days value' });
    }

    await db.globalSettings.upsert({
      where: { key: 'free_signup_days' },
      update: { value: daysNum.toString() },
      create: { key: 'free_signup_days', value: daysNum.toString() }
    });

    // Immediately affects new sign-ups via your existing registration flow
    if (io) {
      io.to('admin-room').emit('global-free-toggle', { days: daysNum });
    }

    res.json({ success: true, message: `New sign-ups are now free for ${daysNum} days` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/v1/admin/waive-subscription
 * Admin grants a subscription without charging the user (free access).
 */
export const waiveSubscriptionController = async (req: Request | any, res: Response) => {
  const adminId = req.auth?.userId;
  const userId = String(req.body.userId ?? '').trim();
  const planKey = String(req.body.planKey ?? 'basic').trim();
  const durationDays = Number(req.body.durationDays) || 30;
  const reason = String(req.body.reason ?? 'Admin waiver').trim();

  if (!userId) {
    return res.status(422).json({ success: false, message: 'userId is required' });
  }

  try {
    const user = await db.user.findUnique({ 
      where: { id: userId }, 
      select: { id: true, role: true } 
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const role = String(user.role || '').toUpperCase();
    const expiryDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    const dummyTxId = `WAIVER_${Date.now()}_${randomUUID().substring(0, 8)}`;

    // Create a financial record for audit trail
    await db.financialPayment.create({
      data: {
        id: randomUUID(),
        merchantTransactionId: dummyTxId,
        status: 'CAPTURED',
        amountMinor: BigInt(0),
        currency: 'INR',
        patientId: role === 'PATIENT' ? userId : undefined,
        providerId: role !== 'PATIENT' ? userId : undefined,
        metadata: { 
          action: 'ADMIN_WAIVER', 
          adminId, 
          reason, 
          planKey, 
          durationDays 
        } as any
      }
    });

    if (['THERAPIST', 'PSYCHIATRIST', 'PSYCHOLOGIST', 'COACH'].includes(role)) {
      await db.providerSubscription.upsert({
        where: { providerId: userId },
        create: {
          providerId: userId,
          plan: planKey as any,
          status: 'active',
          startDate: new Date(),
          expiryDate,
          leadsUsedThisWeek: 0,
          price: 0,
          leadsPerWeek: 0,
        },
        update: {
          plan: planKey as any,
          status: 'active',
          startDate: new Date(),
          expiryDate,
          leadsUsedThisWeek: 0,
        },
      });
    } else {
      await db.patientSubscription.upsert({
        where: { userId },
        create: {
          userId,
          planName: planKey,
          price: 0,
          status: 'active',
          autoRenew: false,
          renewalDate: expiryDate,
          billingCycle: 'monthly',
        },
        update: {
          planName: planKey,
          price: 0,
          status: 'active',
          autoRenew: false,
          renewalDate: expiryDate,
        },
      });
    }

    logger.info('[AdminWaiver] ADMIN_WAIVER_GRANTED', {
      adminId,
      userId,
      role,
      planKey,
      durationDays,
      expiryDate: expiryDate.toISOString(),
      reason,
      dummyTxId
    });

    res.status(200).json({
      success: true,
      message: `Subscription waived for user ${userId}. Plan: ${planKey}, Duration: ${durationDays} days. Record: ${dummyTxId}`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/v1/admin/pricing/contracts
 * List all pricing contract versions.
 */
export const getPricingContractsController = async (req: Request, res: Response) => {
  try {
    const contracts = await db.pricingVersion.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: contracts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/v1/admin/pricing/contracts/draft
 * Create a new pricing draft.
 */
export const createPricingDraftController = async (req: Request, res: Response) => {
  const { category, description, pricingData } = req.body;
  try {
    const lastVersion = await db.pricingVersion.findFirst({
      where: { category },
      orderBy: { version: 'desc' }
    });
    const nextVersion = (lastVersion?.version || 0) + 1;
    const draft = await db.pricingVersion.create({
      data: {
        category,
        version: nextVersion,
        pricingData,
        status: 'draft',
        description
      }
    });
    res.json({ success: true, data: draft, message: `Draft v${nextVersion} created for ${category}` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/v1/admin/pricing/contracts/:id/approve
 * Transitions a draft to LIVE and updates the cache.
 */
export const approvePricingContractController = async (req: Request | any, res: Response) => {
  const { id } = req.params;
  const adminId = req.auth?.userId || 'admin';
  try {
    const draft = await db.pricingVersion.findUnique({ where: { id } });
    if (!draft) return res.status(404).json({ success: false, message: 'Contract not found' });
    if (draft.status !== 'draft') return res.status(400).json({ success: false, message: 'Only drafts can be approved' });

    // Archive current live
    await db.pricingVersion.updateMany({
      where: { category: draft.category, status: 'live' },
      data: { status: 'archived', archivedAt: new Date() }
    });

    // Activate this draft
    const updated = await db.pricingVersion.update({
      where: { id },
      data: {
        status: 'live',
        approvedBy: adminId,
        effectiveFrom: new Date()
      }
    });

    // Update Redis for public landing pages
    const { redis } = await import('../config/redis');
    await redis.set(`pricing_live_${draft.category}`, JSON.stringify(draft.pricingData));

    if (io) {
      io.to('admin-room').emit('pricing-published', { category: draft.category, version: draft.version });
    }

    res.json({ success: true, data: updated, message: `${draft.category} pricing v${draft.version} is now LIVE` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
