/**
 * Lead Response Controller
 * Handles therapist responses to assigned leads and conversion tracking
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../config/db';
import { requireAuth } from '../middleware/auth.middleware';
import { requireProviderSubscription } from '../middleware/subscription.middleware';
import { LEAD_ASSIGNMENT_STATUS } from '../config/plans';
import { invalidateProviderDashboardCache } from '../services/provider-dashboard-cache.service';

const router = Router();

/**
 * PUT /api/leads/:leadId/respond
 * Mark that therapist has seen/responded to the lead
 * Sets respondedAt and responseTime for analytics
 */
router.put('/leads/:leadId/respond', requireAuth, requireProviderSubscription, async (req: Request, res: Response) => {
  try {
    const leadId = Array.isArray(req.params.leadId) ? req.params.leadId[0] : req.params.leadId;
    const therapistId = (req as any).auth?.userId as string;

    if (!therapistId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find the assignment for this therapist+lead combo
    const assignment = await prisma.leadAssignment.findFirst({
      where: {
        leadId: leadId as string,
        therapistId: therapistId as string,
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Lead assignment not found' });
    }

    if (assignment.respondedAt) {
      return res.status(400).json({ error: 'Already responded to this lead' });
    }

    // Get lead to check expiry
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Check if lead is expired
    if (lead.expiresAt && new Date() > lead.expiresAt) {
      return res.status(410).json({ error: 'Lead has expired' });
    }

    // Calculate response time in minutes
    const responseTime = Math.round(
      (Date.now() - assignment.assignedAt.getTime()) / (1000 * 60)
    );

    // Mark as responded
    const updatedAssignment = await prisma.leadAssignment.update({
      where: { id: assignment.id },
      data: {
        respondedAt: new Date(),
        responseTime,
        status: LEAD_ASSIGNMENT_STATUS.RESPONDED,
      },
    });

    await invalidateProviderDashboardCache(therapistId);

    res.json({
      message: 'Lead response recorded',
      assignment: updatedAssignment,
      responseTimeMinutes: responseTime,
    });
  } catch (error) {
    console.error('[Lead Response] Error marking response:', error);
    res.status(500).json({ error: 'Failed to record response' });
  }
});

/**
 * PUT /api/leads/:leadId/convert
 * Mark that patient has booked a PAID session (conversion confirmed)
 * This is triggered when a therapy session booking is completed with payment
 */
router.put('/leads/:leadId/convert', requireAuth, requireProviderSubscription, async (req: Request, res: Response) => {
  try {
    const leadId = Array.isArray(req.params.leadId) ? req.params.leadId[0] : req.params.leadId;
    const therapistId = (req as any).auth?.userId as string;
    const { sessionId, paymentAmount } = req.body;

    if (!therapistId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find the assignment
    const assignment = await prisma.leadAssignment.findFirst({
      where: {
        leadId: leadId as string,
        therapistId: therapistId as string,
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Lead assignment not found' });
    }

    if (assignment.convertedAt) {
      return res.status(400).json({ error: 'Conversion already recorded' });
    }

    // Convert and update counters
    const updatedAssignment = await prisma.leadAssignment.update({
      where: { id: assignment.id },
      data: {
        convertedAt: new Date(),
        sessionBooked: true,
        status: LEAD_ASSIGNMENT_STATUS.CONVERTED,
      },
    });

    // Update provider subscription: increment totalLeadsReceived for conversion tracking stats
    const subscription = await prisma.providerSubscription.findFirst({
      where: { providerId: therapistId },
    });

    if (subscription) {
      await prisma.providerSubscription.update({
        where: { id: subscription.id },
        data: {
          totalLeadsReceived: {
            increment: 1,
          },
        },
      });
    }

    await invalidateProviderDashboardCache(therapistId);

    res.json({
      message: 'Conversion recorded',
      assignment: updatedAssignment,
      sessionId,
      paymentAmount,
    });
  } catch (error) {
    console.error('[Lead Conversion] Error recording conversion:', error);
    res.status(500).json({ error: 'Failed to record conversion' });
  }
});

/**
 * GET /api/leads/:leadId/assignments
 * Get all assignments for a lead (admin/analytics)
 */
router.get('/leads/:leadId/assignments', requireAuth, requireProviderSubscription, async (req: Request, res: Response) => {
  try {
    const leadId = Array.isArray(req.params.leadId) ? req.params.leadId[0] : req.params.leadId;

    const assignments = await prisma.leadAssignment.findMany({
      where: { leadId: leadId as string },
      include: {
        therapist: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    res.json({
      leadId,
      totalAssignments: assignments.length,
      assignments,
    });
  } catch (error) {
    console.error('[Lead Assignments] Error fetching:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

/**
 * GET /api/leads/:leadId/status
 * Get lead distribution status (which tier it's in, how many responses, etc.)
 */
router.get('/leads/:leadId/status', requireAuth, requireProviderSubscription, async (req: Request, res: Response) => {
  try {
    const leadId = Array.isArray(req.params.leadId) ? req.params.leadId[0] : req.params.leadId;

    const [lead, assignments] = await Promise.all([
      prisma.lead.findUnique({
        where: { id: leadId as string },
      }),
      prisma.leadAssignment.findMany({
        where: { leadId: leadId as string },
        select: {
          id: true,
          status: true,
          respondedAt: true,
          convertedAt: true,
          responseTime: true,
        },
      }),
    ]);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Calculate status metrics
    const totalAssignments = assignments.length;
    const respondedCount = assignments.filter((a) => a.respondedAt).length;
    const convertedCount = assignments.filter((a) => a.convertedAt).length;
    const avgResponseTime =
      respondedCount > 0
        ? Math.round(
            assignments
              .filter((a) => a.responseTime)
              .reduce((sum, a) => sum + (a.responseTime || 0), 0) / respondedCount
          )
        : null;

    const isExpired = lead.expiresAt ? new Date() > lead.expiresAt : false;

    res.json({
      leadId,
      status: lead.status,
      createdAt: lead.createdAt,
      expiresAt: lead.expiresAt,
      isExpired,
      distribution: {
        totalAssignments,
        respondedCount,
        responseRate: totalAssignments > 0 ? ((respondedCount / totalAssignments) * 100).toFixed(1) + '%' : '0%',
        convertedCount,
        conversionRate: totalAssignments > 0 ? ((convertedCount / totalAssignments) * 100).toFixed(1) + '%' : '0%',
        avgResponseTimeMinutes: avgResponseTime,
      },
    });
  } catch (error) {
    console.error('[Lead Status] Error fetching:', error);
    res.status(500).json({ error: 'Failed to fetch lead status' });
  }
});

export default router;
