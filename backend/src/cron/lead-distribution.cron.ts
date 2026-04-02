/**
 * Cron Jobs for B2B Lead Distribution System
 * 
 * Three critical jobs:
 * 1. Weekly quota reset (Sunday 00:00 UTC)
 * 2. Dead lead detection (every hour)
 * 3. Lead expiry check (every 4 hours)
 */

import cron from 'node-cron';
import { prisma } from '../config/db';
import { LEAD_DISTRIBUTION_CONFIG } from '../config/plans';

/**
 * CRON JOB 1: Weekly Lead Quota Reset
 * Runs every Sunday at 00:00 UTC
 * Resets leadsUsedThisWeek to 0 for all active subscriptions
 */
export const initWeeklyLeadReset = (): void => {
  const cronPattern = `${LEAD_DISTRIBUTION_CONFIG.weeklyResetMinute} ${LEAD_DISTRIBUTION_CONFIG.weeklyResetHour} * * ${LEAD_DISTRIBUTION_CONFIG.weeklyResetDay}`;

  cron.schedule(cronPattern, async () => {
    console.log('[CRON] Weekly lead quota reset starting...');

    try {
      const result = await prisma.providerSubscription.updateMany({
        where: {
          status: 'active',
          expiryDate: { gt: new Date() },
        },
        data: {
          leadsUsedThisWeek: 0,
          weekStartsAt: new Date(),
        },
      });

      console.log(`[CRON] ✓ Reset quotas for ${result.count} active subscriptions`);
    } catch (error) {
      console.error('[CRON] Weekly reset failed:', error);
    }
  });

  console.log(`[CRON] Weekly reset scheduled: ${cronPattern} (Sunday 00:00 UTC)`);
};

/**
 * CRON JOB 2: Dead Lead Detection
 * Runs every hour
 * Finds leads assigned >24h ago with NO response
 * Action: Could reassign to next tier or mark as low-quality
 */
export const initDeadLeadCheck = (): void => {
  // Every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Checking for dead leads (24h no response)...');

    try {
      const thresholdTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Find assignments with no response after 24 hours
      const deadAssignments = await prisma.leadAssignment.findMany({
        where: {
          respondedAt: null,
          assignedAt: { lt: thresholdTime },
          status: { in: ['assigned'] },
        },
      });

      console.log(`[CRON] Found ${deadAssignments.length} dead leads`);

      for (const assignment of deadAssignments) {
        console.log(
          `[CRON] Dead lead: ${assignment.leadId} assigned to ${assignment.therapistId} (${
            Math.round((Date.now() - assignment.assignedAt.getTime()) / (60 * 60 * 1000))
          }h ago)`
        );

        await prisma.leadAssignment.update({
          where: { id: assignment.id },
          data: {
            status: 'no-response' as any,
          },
        }).catch(() => null);

        await prisma.lead.update({
          where: { id: assignment.leadId },
          data: {
            quality: { decrement: 5 } as any,
          },
        }).catch(() => null);
      }
    } catch (error) {
      console.error('[CRON] Dead lead check failed:', error);
    }
  });

  console.log('[CRON] Dead lead check scheduled: every hour');
};

/**
 * CRON JOB 3: Lead Expiry Check
 * Runs every 4 hours
 * Marks leads >48h old as EXPIRED
 * Prevents new assignments after lifetime exceeded
 */
export const initLeadExpiryCheck = (): void => {
  // Every 4 hours at minute 0
  cron.schedule('0 */4 * * *', async () => {
    console.log('[CRON] Checking for expired leads (48h lifetime)...');

    try {
      const now = new Date();

      // Mark lead as EXPIRED using valid LeadStatus
      const result = await prisma.lead.updateMany({
        where: {
          expiresAt: { lte: now },
          status: { in: ['AVAILABLE', 'PURCHASED'] },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      if (result.count > 0) {
        console.log(`[CRON] ✓ Expired ${result.count} old leads (>48h)`);
      }
    } catch (error) {
      console.error('[CRON] Lead expiry check failed:', error);
    }
  });

  console.log('[CRON] Lead expiry check scheduled: every 4 hours');
};

/**
 * Initialize all cron jobs
 * Call this in server startup (server.ts)
 */
export const initLeadDistributionCrons = (): void => {
  console.log('[CRON] Initializing lead distribution cron jobs...');
  initWeeklyLeadReset();
  initDeadLeadCheck();
  initLeadExpiryCheck();
  console.log('[CRON] All jobs initialized');
};

export default {
  initWeeklyLeadReset,
  initDeadLeadCheck,
  initLeadExpiryCheck,
  initLeadDistributionCrons,
};
