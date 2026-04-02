import { Request, Response } from 'express';
import { prisma as db } from '../config/db';

/**
 * GET /api/v1/admin/audit
 * Expose chronological audit trail of admin actions.
 */
export const getAuditLogController = async (req: Request, res: Response) => {
  try {
    const logs = await db.auditLog.findMany({
      include: { 
        user: { 
          select: { firstName: true, lastName: true, email: true } 
        } 
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
