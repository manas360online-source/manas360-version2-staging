import { Request, Response } from 'express';
import { prisma as db } from '../config/db';
import { io } from '../socket';
import { logger } from '../utils/logger';

/**
 * Calculate light summary metrics for real-time dashboard updates.
 */
export const calculateLiveMetrics = async () => {
  const [
    activeUsersResult,
    todayRevenueResult,
    openTicketsResult,
    pendingCrisisResult
  ] = await Promise.allSettled([
    db.user.count({ where: { status: 'ACTIVE', isDeleted: false } }),
    db.financialPayment.aggregate({
      where: { 
        status: 'CAPTURED', 
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } 
      },
      _sum: { amountMinor: true }
    }),
    db.marqueeOffer.count({ where: { isActive: true, isDeleted: false } }), // Using marquee as proxy if tickets not in DB yet
    db.crisisAlert.count({ where: { status: 'pending' } })
  ]);

  const activeUsers = activeUsersResult.status === 'fulfilled' ? activeUsersResult.value : 0;
  const todayRevenue = todayRevenueResult.status === 'fulfilled'
    ? todayRevenueResult.value
    : { _sum: { amountMinor: null } };
  const openTickets = openTicketsResult.status === 'fulfilled' ? openTicketsResult.value : 0;
  const pendingCrisis = pendingCrisisResult.status === 'fulfilled' ? pendingCrisisResult.value : 0;

  if (activeUsersResult.status === 'rejected') {
    logger.warn('[Metrics] Falling back to zero active users', { error: String(activeUsersResult.reason) });
  }
  if (todayRevenueResult.status === 'rejected') {
    logger.warn('[Metrics] Falling back to zero revenue', { error: String(todayRevenueResult.reason) });
  }
  if (openTicketsResult.status === 'rejected') {
    logger.warn('[Metrics] Falling back to zero open tickets', { error: String(openTicketsResult.reason) });
  }
  if (pendingCrisisResult.status === 'rejected') {
    logger.warn('[Metrics] Falling back to zero pending crisis alerts', { error: String(pendingCrisisResult.reason) });
  }

  return {
    activeUsers,
    revenue: Number(todayRevenue._sum.amountMinor || 0) / 100,
    openTickets,
    pendingCrisis,
    timestamp: new Date().toISOString()
  };
};

/**
 * GET /api/v1/admin/metrics/live
 * Manually trigger or fetch the latest metrics.
 */
export const getLiveMetricsController = async (req: Request, res: Response) => {
  try {
    const metrics = await calculateLiveMetrics();
    
    if (io) {
      io.to('admin-room').emit('metrics-update', metrics);
    }

    res.json({ success: true, data: metrics });
  } catch (error: any) {
    logger.error('[Metrics] Failed to push live metrics', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};
