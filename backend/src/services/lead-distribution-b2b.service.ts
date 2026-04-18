/**
 * B2B Lead Distribution Service (Subscription-Based)
 * 
 * CORE BUSINESS LOGIC for B2B lead assignment
 * Implements the 3-tier cascade system with fairness and quota enforcement
 *
 * LOCKED requirements:
 * - SCALE: 12-hour exclusive window, 1 therapist
 * - GROWTH: 12-36h, max 3 therapists  
 * - STARTER: 12-48h, 5-10 therapists
 * - Fair rotation: sort by leadsUsedThisWeek ASC, lastAssignedAt ASC
 * - Quality scoring: verification (40) + profile (30) + urgency (30)
 * - Lead lifetime: 48 hours max
 * - Conversion = first paid session booking ONLY
 */

import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import {
  PLAN_CONFIG,
  LEAD_DISTRIBUTION_CONFIG,
  LEAD_ASSIGNMENT_STATUS,
} from '../config/plans';
import { invalidateProviderDashboardCache } from './provider-dashboard-cache.service';
import { calculateLeadQualityScore } from '../utils/lead-quality-score';

type SubscriptionTier = 'STARTER' | 'GROWTH' | 'SCALE';

/**
 * Main function: Orchestrate lead distribution across 3 tiers
 * Called when a new lead is created
 */
export const distributeLead = async (leadId: string): Promise<void> => {
  console.log(`[B2B-LED] Starting distribution for lead ${leadId}`);

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { patient: true },
    });

    if (!lead) {
      throw new AppError(`Lead not found: ${leadId}`, 404);
    }

    // Step 1: Calculate lead quality (0-100)
    const qualityScore = calculateLeadQualityScore(lead);
    await prisma.lead.update({
      where: { id: leadId },
      data: { quality: qualityScore },
    });
    console.log(`[B2B-LED] Lead quality score: ${qualityScore}/100`);

    // Step 2: Set expiry time (48 hours from now)
    const expiresAt = new Date(
      Date.now() + LEAD_DISTRIBUTION_CONFIG.leadLifespanHours * 60 * 60 * 1000
    );
    await prisma.lead.update({
      where: { id: leadId },
      data: { expiresAt },
    });

    // Step 3: Stage 1 (0-12h): Assign to SCALE therapists ONLY
    const scaleAssigned = await assignLeadToTier(leadId, 'SCALE', lead);
    console.log(`[B2B-LED] Assigned to ${scaleAssigned} SCALE therapists`);

    // Step 4: Schedule cascade to GROWTH tier after 12 hours
    if (scaleAssigned > 0) {
      // Schedule cascade after 12 hours only if SCALE therapists were assigned
      scheduleLeadCascade(leadId, 'SCALE', LEAD_DISTRIBUTION_CONFIG.stages.scaleExclusive.end);
    } else {
      // If no SCALE therapists available, immediately cascade to GROWTH and STARTER
      await cascadeLeadAssignment(leadId, 'SCALE');
    }

    console.log(`[B2B-LED] Distribution complete for lead ${leadId}`);
  } catch (error) {
    console.error(`[B2B-LED] Distribution error for lead ${leadId}:`, error);
    throw error;
  }
};

/**
 * Assign lead to therapists in a specific tier
 * Implements fair rotation + quota hard stop
 */
const assignLeadToTier = async (
  leadId: string,
  tier: SubscriptionTier,
  lead: any
): Promise<number> => {
  const exclusivityRule = LEAD_DISTRIBUTION_CONFIG.exclusivityRules[tier];

  // Filter eligible therapists for this tier
  const eligibleTherapists = await filterEligibleTherapists(leadId, tier, lead);

  if (eligibleTherapists.length === 0) {
    console.log(`[B2B-LED] No eligible therapists for tier ${tier}`);
    return 0;
  }

  // Sort by fairness: leadsUsedThisWeek ASC → lastAssignedAt ASC
  const sortedTherapists = sortTherapistsByFairness(eligibleTherapists);

  // Determine how many to assign based on tier
  let assignCount = 1; // Default
  if (tier === 'STARTER') {
    // STARTER: 5-10 therapists
    const rule = LEAD_DISTRIBUTION_CONFIG.exclusivityRules.STARTER;
    assignCount = Math.min(sortedTherapists.length, rule.max);
    if (rule.min) {
      assignCount = Math.max(assignCount, rule.min);
    }
  } else if (tier === 'GROWTH') {
    // GROWTH: max 3 therapists
    const rule = LEAD_DISTRIBUTION_CONFIG.exclusivityRules.GROWTH;
    assignCount = Math.min(sortedTherapists.length, rule.max);
  }
  // SCALE is always exactly 1

  // Assign lead to selected therapists
  await assignLeadToTherapists(leadId, (sortedTherapists.slice(0, assignCount) as any), tier);

  return assignCount;
};

/**
 * Filter therapists eligible for assignment in this tier
 * HARD STOP on quota: skip if leadsUsedThisWeek >= leadsPerWeek
 */
const filterEligibleTherapists = async (
  leadId: string,
  tier: SubscriptionTier,
  lead: any
): Promise<any[]> => {
  const tierConfig = PLAN_CONFIG[tier];

  // Find all active subscriptions for this tier
  const subscriptions = await prisma.providerSubscription.findMany({
    where: {
      tier,
      status: 'active',
      expiryDate: { gt: new Date() },
    },
    include: {
      provider: {
        include: {
          therapistProfile: true,
        },
      },
    },
  });

  const eligible: any[] = [];

  for (const sub of subscriptions) {
    // HARD STOP: Quota enforcement (CRITICAL)
    if (sub.leadsUsedThisWeek >= sub.leadsPerWeek) {
      console.log(
        `[B2B-LED] QUOTA FULL: ${sub.providerId} - ${sub.leadsUsedThisWeek}/${sub.leadsPerWeek}`
      );
      continue;
    }

    const therapist = sub.provider;
    const profile = therapist.therapistProfile;

    // Check verification level requirement
    if (!verificationLevelMeets(lead.verificationLevel, tierConfig.verificationRequired)) {
      continue;
    }

    // Check expertise match
    if (profile && lead.issue && lead.issue.length > 0) {
      // Get expertise tags from specializations or custom field
      const profileExpertise = (profile as any).specializations || (profile as any).expertise || [];
      const hasExpertise =
        profileExpertise.length === 0 ||
        lead.issue.some((issue: string) => profileExpertise.includes(issue));

      if (!hasExpertise) {
        console.log(
          `[B2B-LED] No expertise match: ${therapist.id} for issues ${lead.issue.join(', ')}`
        );
        continue;
      }
    }

    eligible.push({
      ...therapist,
      subscription: sub,
    });
  }

  return eligible;
};

/**
 * Sort therapists by fairness for fair rotation
 * Priority:
 * 1. leadsUsedThisWeek ASC (less used first) - MAIN DRIVER
 * 2. lastAssignedAt ASC (older assignments first) - TIE BREAKER
 */
export const sortTherapistsByFairness = (therapists: any[]): any[] => {
  return therapists.sort((a, b) => {
    // First sort by leads used this week (ascending = less used first)
    const leadsCompare =
      (a.subscription.leadsUsedThisWeek || 0) - (b.subscription.leadsUsedThisWeek || 0);
    if (leadsCompare !== 0) {
      return leadsCompare;
    }

    // Then sort by last assignment time (ascending = older assignments first)
    const aTime = a.subscription.lastAssignedAt?.getTime() || 0;
    const bTime = b.subscription.lastAssignedAt?.getTime() || 0;
    return aTime - bTime;
  });
};

/**
 * Create LeadAssignment records for selected therapists
 * Update their leadsUsedThisWeek counter
 * Update lastAssignedAt for fair rotation
 */
const assignLeadToTherapists = async (
  leadId: string,
  therapists: any[],
  tier: SubscriptionTier
): Promise<void> => {
  const now = new Date();

  for (const therapist of therapists) {
    try {
      // Create assignment record
      await prisma.leadAssignment.create({
        data: {
          leadId,
          therapistId: therapist.id,
          status: LEAD_ASSIGNMENT_STATUS.ASSIGNED,
        },
      });

      // Increment quota counter and update lastAssignedAt
      const newLeads = (therapist.subscription.leadsUsedThisWeek || 0) + 1;
      await prisma.providerSubscription.update({
        where: { id: therapist.subscription.id },
        data: {
          leadsUsedThisWeek: newLeads,
          lastAssignedAt: now,
          totalLeadsReceived: (therapist.subscription.totalLeadsReceived || 0) + 1,
        },
      });

      await invalidateProviderDashboardCache(String(therapist.id));

      console.log(
        `[B2B-LED] ✓ Assigned to ${therapist.id} (${tier}) - Quota: ${newLeads}/${therapist.subscription.leadsPerWeek}`
      );
    } catch (error) {
      console.error(`[B2B-LED] Failed to assign to ${therapist.id}:`, error);
      // Continue with other therapists on error
    }
  }
};

/**
 * Cascade lead to next tier after 12h or immediately if previous tier had no match
 * 0-12h: SCALE only
 * 12-36h: SCALE + GROWTH
 * 12-48h: SCALE + GROWTH + STARTER (concurrent)
 * 48h+: EXPIRED
 */
const cascadeLeadAssignment = async (
  leadId: string,
  fromTier: SubscriptionTier
): Promise<void> => {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });

  if (!lead) {
    console.log(`[B2B-LED] Lead ${leadId} not found for cascade`);
    return;
  }

  // Check if already converted (conversion = paid session booking)
  const converted = await prisma.leadAssignment.findFirst({
    where: {
      leadId,
      convertedAt: { not: null },
    },
  });

  if (converted) {
    console.log(`[B2B-LED] Lead ${leadId} already converted, skipping cascade`);
    return;
  }

  // Check if expired
  if (lead.expiresAt && lead.expiresAt < new Date()) {
    console.log(`[B2B-LED] Lead ${leadId} expired, skipping cascade`);
    return;
  }

  // Cascade logic based on source tier
  if (fromTier === 'SCALE') {
    console.log(`[B2B-LED] Cascading ${leadId}: SCALE → GROWTH + STARTER`);
    const growthCount = await assignLeadToTier(leadId, 'GROWTH', lead);
    const starterCount = await assignLeadToTier(leadId, 'STARTER', lead);
    console.log(`[B2B-LED] Cascade done - GROWTH: ${growthCount}, STARTER: ${starterCount}`);
  } else if (fromTier === 'GROWTH') {
    console.log(`[B2B-LED] Cascading ${leadId}: GROWTH → STARTER`);
    const starterCount = await assignLeadToTier(leadId, 'STARTER', lead);
    console.log(`[B2B-LED] Cascade done - STARTER: ${starterCount}`);
  }
};

/**
 * Schedule lead cascade after delay (typically 12 hours)
 * 
 * TODO: In production, replace with a job queue (Bull, Agenda, etc)
 * setTimeout is only for demo/testing
 */
const scheduleLeadCascade = (
  leadId: string,
  fromTier: SubscriptionTier,
  delayHours: number
): void => {
  const delayMs = delayHours * 60 * 60 * 1000;
  console.log(`[B2B-LED] Scheduled cascade for ${leadId} in ${delayHours}h (${delayMs}ms)`);

  // DEMO ONLY: Replace with job queue in production
  setTimeout(() => {
    cascadeLeadAssignment(leadId, fromTier).catch((error) => {
      console.error(`[B2B-LED] Cascade failed for ${leadId}:`, error);
    });
  }, delayMs);
};

/**
 * Helper: Check if lead's verification level meets tier requirement
 * Hierarchy: email (0) < phone (1) < complete (2)
 */
const verificationLevelMeets = (leadLevel: string, tierRequired: string): boolean => {
  const hierarchy: Record<string, number> = {
    email: 0,
    phone: 1,
    complete: 2,
  };

  const leadScore = hierarchy[leadLevel] ?? 0;
  const requiredScore = hierarchy[tierRequired] ?? 0;
  return leadScore >= requiredScore;
};

/**
 * Get therapist's assigned leads with conversion status
 */
export const getTherapistAssignedLeads = async (
  therapistId: string,
  status?: string
) => {
  return prisma.leadAssignment.findMany({
    where: {
      therapistId,
      ...(status && { status }),
    },
    include: {
      lead: {
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: { assignedAt: 'desc' },
  });
};

/**
 * Mark lead as responded by therapist
 * Sets respondedAt and calculates responseTime in minutes
 */
export const markLeadResponded = async (
  leadId: string,
  therapistId: string
): Promise<void> => {
  const assignment = await prisma.leadAssignment.findUnique({
    where: {
      leadId_therapistId: { leadId, therapistId },
    },
  });

  if (!assignment) {
    throw new AppError('Assignment not found', 404);
  }

  const responseTime = assignment.assignedAt
    ? Math.round((Date.now() - assignment.assignedAt.getTime()) / (1000 * 60))
    : undefined;

  await prisma.leadAssignment.update({
    where: { id: assignment.id },
    data: {
      respondedAt: new Date(),
      responseTime,
      status: LEAD_ASSIGNMENT_STATUS.RESPONDED,
    },
  });

  console.log(
    `[B2B-LED] Lead ${leadId} responded by ${therapistId} (${responseTime} min)`
  );
};

export default {
  distributeLead,
  filterEligibleTherapists,
  assignLeadToTherapists,
  cascadeLeadAssignment,
  getTherapistAssignedLeads,
  markLeadResponded,
};
