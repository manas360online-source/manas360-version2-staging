import { Request, Response } from 'express';
import { prisma as db } from '../config/db';
import { io } from '../socket';
import { logger } from '../utils/logger';

/**
 * GET /api/v1/admin/crisis/alerts
 * Fetch all active crisis alerts.
 */
export const getCrisisAlertsController = async (req: Request, res: Response) => {
  try {
    const alerts = await db.crisisAlert.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        patientId: true,
        severity: true,
        status: true,
        respondedBy: true,
        resolutionNotes: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    res.json({ success: true, data: alerts });
  } catch (error: any) {
    res.json({ success: true, data: [], message: error.message });
  }
};

/**
 * POST /api/v1/admin/crisis/:id/respond
 * Respond to a crisis and mark it as resolved.
 */
export const respondToCrisisController = async (req: Request | any, res: Response) => {
  const { id } = req.params;
  const { action, notes } = req.body;
  const adminId = req.auth?.userId || 'admin';

  try {
    const alert = await db.crisisAlert.update({
      where: { id },
      data: { 
        status: 'responded', 
        respondedBy: adminId, 
        resolutionNotes: notes || action 
      }
    });

    if (io) {
      io.to('admin-room').emit('crisis-resolved', { 
        id, 
        action, 
        respondedBy: adminId 
      });
    }

    // Log the audit action
    try {
      await db.auditLog.create({
        data: {
          userId: adminId,
          action: 'RESPOND_CRISIS',
          resource: `CrisisAlert:${id}`,
          details: { action, notes }
        }
      });
    } catch (auditError) {
      logger.warn('[Crisis] Audit log write failed', { id, error: (auditError as any)?.message });
    }

    res.json({ success: true, data: alert, message: 'Crisis marked as responded.' });
  } catch (error: any) {
    logger.error('[Crisis] Failed to respond to alert', { id, error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};
