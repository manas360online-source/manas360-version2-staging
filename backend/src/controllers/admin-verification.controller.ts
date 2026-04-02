import { Request, Response } from 'express';
import { prisma as db } from '../config/db';
import { triggerZohoFlow, zohoDesk } from '../services/zohoDesk.service';
import { sendWhatsApp } from '../services/twilio.service';
import { io } from '../socket';

/**
 * PATCH /api/v1/admin/verifications/:id
 * Approve or Reject a provider verification request.
 */
export const updateVerificationController = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, rejection_reason } = req.body;

  const therapist = await db.therapistProfile.findUnique({ 
    where: { userId: id },
    include: { user: true }
  });

  if (!therapist) {
    return res.status(404).json({ success: false, message: 'Therapist profile not found' });
  }

  const newStatus = action === 'approve' ? 'COMPLETED' : 'REJECTED';

  await db.therapistProfile.update({
    where: { userId: id },
    data: { 
      isVerified: action === 'approve', 
      verifiedByUserId: (req as any).auth?.userId, 
      verifiedAt: new Date(), 
      rejectionReason: action === 'approve' ? null : rejection_reason 
    }
  });

  // Update User onboarding status
  await db.user.update({
    where: { id },
    data: { onboardingStatus: newStatus as any }
  });

  // Zoho Desk Blueprint 1 transition (simulated/service call)
  // Note: zoho_ticket_id would need to be in the schema if used, 
  // currently we'll assume it might be in metadata or skip if missing.
  const zohoTicketId = (therapist as any).zohoTicketId; 
  if (zohoTicketId) {
    await zohoDesk.updateTicket(zohoTicketId, {
      status: action === 'approve' ? 'Approved' : 'Rejected',
      comment: action === 'approve' ? `Verified by admin` : rejection_reason
    });
  }

  // Notify via WhatsApp (Zoho Flow WF-1.2)
  if (therapist.user.phone) {
    await sendWhatsApp(therapist.user.phone, action === 'approve'
      ? `🎉 MANAS360 Verification Approved! Login & start receiving patients.`
      : `Verification Rejected: ${rejection_reason}. Please resubmit.`);
  }

  if (io) {
    io.to('admin-room').emit('verification-updated', { id, status: newStatus });
  }

  await triggerZohoFlow('therapist_verification_updated', {
    therapistUserId: id,
    action,
    status: newStatus,
    rejection_reason: action === 'approve' ? null : rejection_reason,
    updatedByAdminId: (req as any).auth?.userId || null,
    updatedAt: new Date().toISOString(),
  });

  res.json({ success: true, status: newStatus });
};

/**
 * GET /api/v1/admin/verifications
 * List all pending verifications.
 */
export const getVerificationsController = async (req: Request, res: Response) => {
  const verifications = await db.therapistProfile.findMany({
    where: { isVerified: false },
    include: { 
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          onboardingStatus: true
        }
      }
    }
  });
  res.json({ success: true, data: verifications });
};

/**
 * GET /api/v1/admin/verifications/:id/documents
 * Get documents for a specific provider.
 */
export const getVerificationDocumentsController = async (req: Request, res: Response) => {
  const { id } = req.params;
  const documents = await db.providerDocument.findMany({
    where: { userId: id }
  });
  res.json({ success: true, data: documents });
};
