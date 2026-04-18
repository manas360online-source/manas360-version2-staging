/**
 * Provider Dashboard Controller
 * Handles analytics and metrics endpoints for provider dashboards
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole, type UserRole } from '../middleware/rbac.middleware';
import { prisma } from '../config/db';
import { redis } from '../config/redis';
import { getProviderDashboardCacheKey } from '../services/provider-dashboard-cache.service';
import {
  getProviderMetrics,
  getConversionTrend,
} from '../services/provider-analytics.service';
import { PLAN_CONFIG } from '../config/plans';

const router = Router();
const providerDashboardRoles: UserRole[] = ['therapist', 'psychologist', 'psychiatrist', 'coach', 'learner'];

const DASHBOARD_CACHE_TTL = {
  metrics: 45,
  leads: 20,
  weekly: 60,
  summary: 45,
  plans: 300,
  breakdown: 60,
} as const;

const readJsonCache = async <T>(key: string): Promise<T | null> => {
  try {
    const cached = await redis.get(key);
    if (!cached) return null;
    return JSON.parse(cached) as T;
  } catch {
    return null;
  }
};

const writeJsonCache = async (key: string, payload: unknown, ttl: number): Promise<void> => {
  try {
    await redis.set(key, JSON.stringify(payload), ttl);
  } catch {
    // Best-effort cache write.
  }
};

/**
 * GET /api/provider/dashboard/metrics
 * Main dashboard metrics for a provider (therapist)
 * Returns: subscription info, quota, conversion rate, ROI, earnings
 */
router.get('/provider/dashboard/metrics', requireAuth, requireRole(providerDashboardRoles), async (req: Request, res: Response) => {
  try {
    const therapistId = (req as any).auth?.userId as string;

    if (!therapistId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cacheKey = await getProviderDashboardCacheKey('metrics', therapistId);
    const cached = await readJsonCache<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const metrics = await getProviderMetrics(therapistId);

    if (!metrics) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const payload = {
      success: true,
      data: metrics,
    };
    await writeJsonCache(cacheKey, payload, DASHBOARD_CACHE_TTL.metrics);
    res.json(payload);
  } catch (error) {
    console.error('[Dashboard] Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * GET /api/provider/dashboard/leads
 * List all assigned leads with their status
 * Query params: page, limit, status, sortBy
 */
router.get('/provider/dashboard/leads', requireAuth, requireRole(providerDashboardRoles), async (req: Request, res: Response) => {
  try {
    const therapistId = (req as any).auth?.userId as string;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const status = req.query.status as string | undefined;

    if (!therapistId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cacheKey = await getProviderDashboardCacheKey('leads', therapistId, req.query);
    const cached = await readJsonCache<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const pageNum = Math.max(1, page || 1);
    const limitNum = Math.min(100, Math.max(1, limit || 20));
    const skip = (pageNum - 1) * limitNum;

    // Build query filter
    const whereClause: any = { therapistId };
    if (status) {
      whereClause.status = status;
    }

    // Get paginated assignments
    const [assignments, total] = await Promise.all([
      prisma.leadAssignment.findMany({
        where: whereClause,
        include: {
          lead: true,
        },
        orderBy: { assignedAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.leadAssignment.count({ where: whereClause }),
    ]);

    // Format response
    const leads = assignments.map((a) => ({
      assignmentId: a.id,
      leadId: a.lead.id,
      status: a.status,
      assignedAt: a.assignedAt,
      respondedAt: a.respondedAt,
      convertedAt: a.convertedAt,
      responseTimeMinutes: a.responseTime,
      leadExpiresAt: a.lead.expiresAt,
      isExpired: a.lead.expiresAt ? new Date() > a.lead.expiresAt : false,
    }));

    const payload = {
      success: true,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      leads,
    };
    await writeJsonCache(cacheKey, payload, DASHBOARD_CACHE_TTL.leads);
    res.json(payload);
  } catch (error) {
    console.error('[Dashboard] Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

/**
 * GET /api/provider/dashboard/weekly-stats
 * Weekly performance stats for charts
 * Returns: last 4 weeks of lead/response/conversion data
 */
router.get('/provider/dashboard/weekly-stats', requireAuth, requireRole(providerDashboardRoles), async (req: Request, res: Response) => {
  try {
    const therapistId = (req as any).auth?.userId as string;
    const weeks = parseInt((req.query.weeks as string) || '4');

    if (!therapistId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cacheKey = await getProviderDashboardCacheKey('weekly-stats', therapistId, req.query);
    const cached = await readJsonCache<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const weekCount = Math.min(12, Math.max(1, weeks || 4));

    const trend = await getConversionTrend(therapistId, weekCount);

    const payload = {
      success: true,
      weeks: weekCount,
      data: trend,
    };
    await writeJsonCache(cacheKey, payload, DASHBOARD_CACHE_TTL.weekly);
    res.json(payload);
  } catch (error) {
    console.error('[Dashboard] Error fetching weekly stats:', error);
    res.status(500).json({ error: 'Failed to fetch weekly stats' });
  }
});

/**
 * GET /api/provider/dashboard/summary
 * Quick summary for dashboard cards
 */
router.get('/provider/dashboard/summary', requireAuth, requireRole(providerDashboardRoles), async (req: Request, res: Response) => {
  try {
    const therapistId = (req as any).auth?.userId as string;

    if (!therapistId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cacheKey = await getProviderDashboardCacheKey('summary', therapistId);
    const cached = await readJsonCache<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const metrics = await getProviderMetrics(therapistId);
    if (!metrics) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Build summary for dashboard cards
    const summary = {
      subscription: {
        tier: metrics.subscriptionTier,
        active: metrics.active,
        weeklyQuota: metrics.weeklyQuota,
        leadsRemaining: metrics.leadsRemaining,
      },
      thisWeek: {
        leadsReceived: metrics.weeklyQuota - metrics.leadsRemaining,
        leadsResponded: Math.round(
          ((metrics.weeklyQuota - metrics.leadsRemaining) * metrics.conversion.responseRate) / 100
        ),
        conversionRate: metrics.conversion.conversionRate.toFixed(1) + '%',
      },
      allTime: {
        totalLeads: metrics.totalLeadsReceived,
        conversionRate: metrics.conversion.conversionRate.toFixed(1) + '%',
        conversions: metrics.conversion.totalLeadsConverted,
      },
      earnings: {
        estimatedMonthly: '₹' + (metrics.roi.estimatedMonthlyRevenue / 100).toLocaleString('en-IN'),
        roi: metrics.roi.estimatedROI.toFixed(1) + '%',
        breakEven: metrics.roi.breakEvenLeads + ' leads',
      },
    };

    const payload = {
      success: true,
      data: summary,
    };
    await writeJsonCache(cacheKey, payload, DASHBOARD_CACHE_TTL.summary);
    res.json(payload);
  } catch (error) {
    console.error('[Dashboard] Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

/**
 * GET /api/provider/dashboard/subscription-plans
 * List available subscription plans (for plan selection/upgrade)
 */
router.get('/provider/dashboard/subscription-plans', requireAuth, requireRole(providerDashboardRoles), async (req: Request, res: Response) => {
  try {
    const therapistId = (req as any).auth?.userId as string;

    if (!therapistId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cacheKey = await getProviderDashboardCacheKey('subscription-plans', therapistId);
    const cached = await readJsonCache<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Get current subscription
    const current = await prisma.providerSubscription.findFirst({
      where: { providerId: therapistId },
      orderBy: { createdAt: 'desc' },
    });

    const plans = Object.entries(PLAN_CONFIG).map(([key, config]: any) => ({
      tier: key,
      name: config.name,
      monthlyPrice: config.monthlyPrice,
      leadsPerWeek: config.leadsPerWeek,
      bonusLeads: config.bonusLeads,
      verificationRequired: config.verificationRequired,
      exclusivity: config.exclusivity,
      responseWindow: config.responseWindow,
      earlyAccessHours: config.earlyAccessHours || null,
      dedicatedSupport: config.dedicatedSupport || false,
      current: current?.tier === key,
    }));

    const payload = {
      success: true,
      currentTier: current?.tier || null,
      plans,
    };
    await writeJsonCache(cacheKey, payload, DASHBOARD_CACHE_TTL.plans);
    res.json(payload);
  } catch (error) {
    console.error('[Dashboard] Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

/**
 * GET /api/provider/dashboard/performance-breakdown
 * Detailed breakdown of performance by lead quality tier
 */
router.get('/provider/dashboard/performance-breakdown', requireAuth, async (req: Request, res: Response) => {
  try {
    const therapistId = (req as any).auth?.userId as string;

    if (!therapistId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cacheKey = await getProviderDashboardCacheKey('performance-breakdown', therapistId);
    const cached = await readJsonCache<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Get assignments grouped by lead quality
    const assignments = await prisma.leadAssignment.findMany({
      where: { therapistId },
      include: {
        lead: {
          select: { quality: true },
        },
      },
    });

    // Group by quality tier
    const breakdown: any = {
      high: { assigned: 0, responded: 0, converted: 0 },
      medium: { assigned: 0, responded: 0, converted: 0 },
      low: { assigned: 0, responded: 0, converted: 0 },
    };

    assignments.forEach((a) => {
      const qualityScore = a.lead.quality || 50;
      let quality = 'low';
      if (qualityScore >= 70) {
        quality = 'high';
      } else if (qualityScore >= 40) {
        quality = 'medium';
      }
      if (breakdown[quality]) {
        breakdown[quality].assigned += 1;
        if (a.respondedAt) breakdown[quality].responded += 1;
        if (a.convertedAt) breakdown[quality].converted += 1;
      }
    });

    // Calculate rates
    const result = Object.entries(breakdown).map(([tier, data]: any) => ({
      tier,
      assigned: data.assigned,
      responded: data.responded,
      converted: data.converted,
      responseRate: data.assigned > 0 ? ((data.responded / data.assigned) * 100).toFixed(1) : '0',
      conversionRate: data.assigned > 0 ? ((data.converted / data.assigned) * 100).toFixed(1) : '0',
    }));

    const payload = {
      success: true,
      data: result,
    };
    await writeJsonCache(cacheKey, payload, DASHBOARD_CACHE_TTL.breakdown);
    res.json(payload);
  } catch (error) {
    console.error('[Dashboard] Error fetching breakdown:', error);
    res.status(500).json({ error: 'Failed to fetch performance breakdown' });
  }
});

export default router;
