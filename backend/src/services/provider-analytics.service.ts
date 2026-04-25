/**
 * Provider Analytics Service
 * Calculates conversion rates, ROI, and key metrics for provider dashboards
 */

import { prisma } from '../config/db';
import { PLAN_CONFIG } from '../config/plans';

interface ConversionMetrics {
  totalLeadsAssigned: number;
  totalLeadsResponded: number;
  totalLeadsConverted: number;
  responseRate: number; // percentage
  conversionRate: number; // percentage
  avgResponseTimeMinutes: number;
  lastConversionAt: Date | null;
  lastAssignmentAt: Date | null;
}

interface ROIMetrics {
  monthlyPlanCost: number;
  estimatedMonthlyRevenue: number;
  estimatedROI: number; // percentage
  breakEvenLeads: number;
  leadsAboveBreakEven: number;
}

interface ProviderMetrics {
  providerId: string;
  subscriptionTier: string;
  active: boolean;
  weeklyQuota: number;
  leadsUsedThisWeek: number;
  leadsRemaining: number;
  totalLeadsReceived: number;
  conversion: ConversionMetrics;
  roi: ROIMetrics;
}

/**
 * Calculate conversion metrics for a provider (therapist)
 */
export const getConversionMetrics = async (
  therapistId: string,
  periodDays: number = 30
): Promise<ConversionMetrics> => {
  try {
    const cutoffDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    // Get all assignments in the period
    const assignments = await prisma.leadAssignment.findMany({
      where: {
        therapistId,
        assignedAt: { gte: cutoffDate },
      },
    });

    const totalAssigned = assignments.length;
    const respondedAssignments = assignments.filter((a) => a.respondedAt);
    const convertedAssignments = assignments.filter((a) => a.convertedAt);

    const responseTimes = respondedAssignments
      .filter((a) => a.responseTime)
      .map((a) => a.responseTime as number);

    const avgResponseTime =
      responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;

    return {
      totalLeadsAssigned: totalAssigned,
      totalLeadsResponded: respondedAssignments.length,
      totalLeadsConverted: convertedAssignments.length,
      responseRate: totalAssigned > 0 ? (respondedAssignments.length / totalAssigned) * 100 : 0,
      conversionRate: totalAssigned > 0 ? (convertedAssignments.length / totalAssigned) * 100 : 0,
      avgResponseTimeMinutes: avgResponseTime,
      lastConversionAt:
        convertedAssignments.length > 0
          ? new Date(
              Math.max(...convertedAssignments.map((a) => a.convertedAt?.getTime() || 0))
            )
          : null,
      lastAssignmentAt:
        totalAssigned > 0
          ? new Date(Math.max(...assignments.map((a) => a.assignedAt.getTime())))
          : null,
    };
  } catch (error) {
    console.error('[Analytics] Error calculating conversion metrics:', error);
    throw error;
  }
};

/**
 * Calculate estimated ROI based on conversion rate and plan cost
 * ASSUMPTIONS (customize based on actual business model):
 * - Average consultation fee: ₹500
 * - Consultation completion rate: 80% (not all converted leads complete sessions)
 * - Therapist commission: 60% of consultation fee
 */
export const getROIMetrics = async (
  therapistId: string,
  tier: string,
  periodDays: number = 30,
  precomputedConversionMetrics?: ConversionMetrics,
): Promise<ROIMetrics> => {
  try {
    const planConfig = PLAN_CONFIG[tier as keyof typeof PLAN_CONFIG];
    if (!planConfig) throw new Error(`Invalid tier: ${tier}`);

    const conversionMetrics = precomputedConversionMetrics
      ?? await getConversionMetrics(therapistId, periodDays);

    // Business model assumptions (adjust per business needs)
    const AVG_CONSULTATION_FEE = 50000; // ₹500 in paise
    const CONSULTATION_COMPLETION_RATE = 0.8; // 80% of booked sessions complete
    const THERAPIST_COMMISSION = 0.6; // 60% commission to therapist

    // Calculate for the period (daily rate)
    const dailyLeadsReceived = (periodDays > 0 ? conversionMetrics.totalLeadsAssigned / periodDays : 0) * 7;
    const dailyConversionRate = conversionMetrics.conversionRate / 100;
    const dailyConversions = dailyLeadsReceived * dailyConversionRate * CONSULTATION_COMPLETION_RATE;
    const dailyRevenue = dailyConversions * AVG_CONSULTATION_FEE * THERAPIST_COMMISSION;

    // Annualize
    const monthlyRevenue = dailyRevenue * 30;
    const monthlyPlanCost = planConfig.monthlyPrice;

    // Break-even: how many conversions needed to cover plan cost?
    const breakEvenConversions = monthlyPlanCost / (AVG_CONSULTATION_FEE * THERAPIST_COMMISSION);
    const breakEvenLeads = planConfig.leadsPerWeek * 4; // Monthly leads received
    const expectedMonthlyConversions = breakEvenLeads * (conversionMetrics.conversionRate / 100) * CONSULTATION_COMPLETION_RATE;
    const leadsAboveBreakEven = Math.max(0, expectedMonthlyConversions - breakEvenConversions);

    return {
      monthlyPlanCost,
      estimatedMonthlyRevenue: Math.round(monthlyRevenue),
      estimatedROI:
        monthlyPlanCost > 0
          ? ((monthlyRevenue - monthlyPlanCost) / monthlyPlanCost) * 100
          : 0,
      breakEvenLeads: Math.ceil(breakEvenConversions),
      leadsAboveBreakEven: Math.ceil(leadsAboveBreakEven),
    };
  } catch (error) {
    console.error('[Analytics] Error calculating ROI:', error);
    throw error;
  }
};

/**
 * Get comprehensive provider metrics
 * Main function for dashboard queries
 */
export const getProviderMetrics = async (therapistId: string): Promise<ProviderMetrics | null> => {
  try {
    // Get subscription info
    const subscription = await prisma.providerSubscription.findFirst({
      where: { providerId: therapistId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return null;
    }

    const isActive = new Date() <= new Date(subscription.expiryDate);
    const tier = subscription.tier as string;

    const planConfig = PLAN_CONFIG[tier as keyof typeof PLAN_CONFIG];
    if (!planConfig) throw new Error(`Invalid tier: ${tier}`);

    const leadsRemaining = Math.max(
      0,
      planConfig.leadsPerWeek + (subscription.bonusLeads || 0) - (subscription.leadsUsedThisWeek || 0)
    );

    // Get conversion and ROI metrics
    const conversionMetrics = await getConversionMetrics(therapistId);
    const roiMetrics = await getROIMetrics(therapistId, tier, 30, conversionMetrics);

    return {
      providerId: therapistId,
      subscriptionTier: tier,
      active: isActive,
      weeklyQuota: planConfig.leadsPerWeek + (subscription.bonusLeads || 0),
      leadsUsedThisWeek: subscription.leadsUsedThisWeek || 0,
      leadsRemaining,
      totalLeadsReceived: subscription.totalLeadsReceived || 0,
      conversion: conversionMetrics,
      roi: roiMetrics,
    };
  } catch (error) {
    console.error('[Analytics] Error getting provider metrics:', error);
    throw error;
  }
};

/**
 * Get trending data for charts (last N weeks)
 */
export const getConversionTrend = async (
  therapistId: string,
  weeks: number = 4
): Promise<
  Array<{
    week: number;
    date: Date;
    leadsAssigned: number;
    leadsResponded: number;
    leadsConverted: number;
    responseRate: number;
    conversionRate: number;
  }>
> => {
  try {
    const start = new Date(Date.now() - (weeks - 1) * 7 * 24 * 60 * 60 * 1000);
    const end = new Date();
    const assignments = await prisma.leadAssignment.findMany({
      where: {
        therapistId,
        assignedAt: {
          gte: start,
          lt: end,
        },
      },
      select: {
        assignedAt: true,
        respondedAt: true,
        convertedAt: true,
      },
    });

    const trends: Array<{
      week: number;
      date: Date;
      leadsAssigned: number;
      leadsResponded: number;
      leadsConverted: number;
      responseRate: number;
      conversionRate: number;
    }> = [];

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      const weeklyAssignments = assignments.filter((a) => a.assignedAt >= weekStart && a.assignedAt < weekEnd);
      const responded = weeklyAssignments.filter((a) => a.respondedAt).length;
      const converted = weeklyAssignments.filter((a) => a.convertedAt).length;

      trends.push({
        week: weeks - i,
        date: weekStart,
        leadsAssigned: weeklyAssignments.length,
        leadsResponded: responded,
        leadsConverted: converted,
        responseRate: weeklyAssignments.length > 0 ? (responded / weeklyAssignments.length) * 100 : 0,
        conversionRate: weeklyAssignments.length > 0 ? (converted / weeklyAssignments.length) * 100 : 0,
      });
    }

    return trends;
  } catch (error) {
    console.error('[Analytics] Error getting conversion trend:', error);
    throw error;
  }
};

export default {
  getConversionMetrics,
  getROIMetrics,
  getProviderMetrics,
  getConversionTrend,
};
