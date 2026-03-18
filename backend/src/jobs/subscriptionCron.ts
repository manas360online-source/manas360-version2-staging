import cron from 'node-cron';
import { prisma } from '../config/db';

const db = prisma as any;

export const runDailySubscriptionCheck = async () => {
    try {
        console.log('[CRON] Running daily subscription check...');
        const expired = await db.patientSubscription.findMany({
            where: {
                status: "active",
                expiryDate: { lt: new Date() }
            }
        });

        for (const sub of expired) {
            if (sub.autoRenew && sub.plan !== 'free') {
                // Future: integrate auto-charge with payment gateway
                // For now, if auto-renew fails to run immediately, it becomes expired.
                console.log(`[CRON] Subscription ${sub.id} is pending auto-renew. Marking as expired until payment succeeds.`);
            }

            await db.patientSubscription.update({
                where: { id: sub.id },
                data: { status: "expired" }
            });
        }
        console.log(`[CRON] Expired ${expired.length} subscriptions.`);
    } catch (err) {
        console.error('[CRON] Error checking subscriptions:', err);
    }
};

export const initSubscriptionCron = () => {
    // Run every day at midnight
    cron.schedule('0 0 * * *', () => {
        runDailySubscriptionCheck();
    });
};
