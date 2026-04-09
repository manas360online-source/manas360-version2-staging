import { Request, Response } from 'express';
import { prisma as db } from '../config/db';
import { io } from '../socket';
import { triggerZohoFlow } from '../services/zohoDesk.service';

/**
 * GET /api/v1/admin/payouts
 * List all payout requests.
 */
export const getPayoutsController = async (req: Request, res: Response) => {
  try {
    const payouts = await db.payoutRequest.findMany({
      select: {
        id: true,
        providerId: true,
        amountMinor: true,
        currency: true,
        status: true,
        minWithdrawalRuleMinor: true,
        requestedAt: true,
        approvedAt: true,
        paidAt: true,
        rejectedAt: true,
        approvedByAdminId: true,
        rejectedByAdminId: true,
        rejectionReason: true,
        bankReference: true,
        idempotencyKey: true,
        platformAmount: true,
        therapistAmount: true,
        provider: {
          select: {
            provider: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                therapistProfile: {
                  select: {
                    commissionOverride: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        requestedAt: 'desc'
      }
    });

    // Handle BigInt serialization
    const serializedPayouts = payouts.map(p => ({
      id: p.id,
      providerId: p.providerId,
      amountMinor: p.amountMinor.toString(),
      currency: p.currency,
      status: p.status,
      minWithdrawalRuleMinor: p.minWithdrawalRuleMinor.toString(),
      requestedAt: p.requestedAt,
      approvedAt: p.approvedAt,
      paidAt: p.paidAt,
      rejectedAt: p.rejectedAt,
      approvedByAdminId: p.approvedByAdminId,
      rejectedByAdminId: p.rejectedByAdminId,
      rejectionReason: p.rejectionReason,
      bankReference: p.bankReference,
      idempotencyKey: p.idempotencyKey,
      platformAmount: p.platformAmount?.toString() ?? null,
      therapistAmount: p.therapistAmount?.toString() ?? null,
      provider: p.provider,
    }));

    res.json({ success: true, data: serializedPayouts });
  } catch (error: any) {
    res.json({ success: true, data: [], message: error.message });
  }
};

/**
 * POST /api/v1/admin/payouts/:id/approve
 * Calculate commission split and process payout.
 */
export const approvePayoutController = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const payout = await db.payoutRequest.findUnique({ 
      where: { id },
      include: { 
        provider: {
          include: {
            provider: {
              include: {
                therapistProfile: true
              }
            }
          }
        }
      }
    });

    if (!payout) {
      return res.status(404).json({ success: false, message: 'Payout request not found' });
    }

    if (payout.status === 'PAID') {
      return res.status(400).json({ success: false, message: 'Payout already processed' });
    }

    const gross = Number(payout.amountMinor);
    const split = payout.provider.provider.therapistProfile?.commissionOverride || 60; // 60% default
    const therapistAmount = Math.round(gross * (split / 100));
    const platformAmount = gross - therapistAmount;

    // Trigger PhonePe / Payout Gateway (Zoho Flow WF-3.3)
    // Simulated as per request: "... your PhonePe payout call here ..."
    
    await db.payoutRequest.update({
      where: { id },
      data: { 
        status: 'PAID', 
        paidAt: new Date(), 
        therapistAmount: BigInt(therapistAmount), 
        platformAmount: BigInt(platformAmount),
        approvedByAdminId: (req as any).auth?.userId
      }
    });

    if (io) {
      io.to('admin-room').emit('payout-processed', { id, amount: therapistAmount });
    }

    await triggerZohoFlow('payout_processed', {
      payoutRequestId: id,
      providerId: payout.providerId,
      therapistAmount,
      platformAmount,
      currency: payout.currency,
      approvedByAdminId: (req as any).auth?.userId || null,
      paidAt: new Date().toISOString(),
    });

    res.json({ 
      success: true, 
      therapistAmount, 
      platformAmount,
      currency: payout.currency
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
