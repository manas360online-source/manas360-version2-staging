import cron from 'node-cron';
import { prisma } from '../config/db';

const db = prisma as any;
const GRACE_WINDOW_HOURS = 78; // 2 days + 30 hours

const isInSet = (value: unknown, set: Set<string>): boolean =>
    set.has(String(value || '').toLowerCase());

export const runDailySubscriptionCheck = async () => {
    try {
        console.log('[CRON] Running subscription lifecycle check...');
        const now = new Date();
        const graceLockCutoff = new Date(now.getTime() - GRACE_WINDOW_HOURS * 60 * 60 * 1000);

        const patientActiveLike = new Set(['active', 'trial', 'renewal_pending']);
        const providerActiveLike = new Set(['active', 'trial', 'renewal_pending']);

        const [patientSubs, providerSubs] = await Promise.all([
            db.patientSubscription.findMany({
                where: {
                    status: { in: ['active', 'trial', 'renewal_pending', 'grace'] },
                },
                select: { id: true, status: true, renewalDate: true, updatedAt: true },
            }),
            db.providerSubscription.findMany({
                where: {
                    status: { in: ['active', 'trial', 'renewal_pending', 'grace'] },
                },
                select: { id: true, status: true, expiryDate: true, updatedAt: true },
            }),
        ]);

        let patientToGrace = 0;
        let patientToLocked = 0;
        let providerToGrace = 0;
        let providerToLocked = 0;

        for (const sub of patientSubs) {
            const status = String(sub.status || '').toLowerCase();
            const isExpiredByDate = new Date(sub.renewalDate).getTime() <= now.getTime();

            if (isInSet(status, patientActiveLike) && isExpiredByDate) {
                await db.patientSubscription.update({
                    where: { id: sub.id },
                    data: { status: 'grace' },
                });
                patientToGrace += 1;
                continue;
            }

            if (status === 'grace' && new Date(sub.updatedAt).getTime() <= graceLockCutoff.getTime()) {
                await db.patientSubscription.update({
                    where: { id: sub.id },
                    data: { status: 'locked' },
                });
                patientToLocked += 1;
            }
        }

        for (const sub of providerSubs) {
            const status = String(sub.status || '').toLowerCase();
            const isExpiredByDate = new Date(sub.expiryDate).getTime() <= now.getTime();

            if (isInSet(status, providerActiveLike) && isExpiredByDate) {
                await db.providerSubscription.update({
                    where: { id: sub.id },
                    data: { status: 'grace' },
                });
                providerToGrace += 1;
                continue;
            }

            if (status === 'grace' && new Date(sub.updatedAt).getTime() <= graceLockCutoff.getTime()) {
                await db.providerSubscription.update({
                    where: { id: sub.id },
                    data: { status: 'locked' },
                });
                providerToLocked += 1;
            }
        }

        console.log(
            `[CRON] Subscription lifecycle complete. patient->grace=${patientToGrace}, patient->locked=${patientToLocked}, provider->grace=${providerToGrace}, provider->locked=${providerToLocked}`,
        );
    } catch (err) {
        console.error('[CRON] Error checking subscriptions:', err);
    }
};

export const initSubscriptionCron = () => {
    // Run hourly to keep grace->locked transitions timely.
    cron.schedule('0 * * * *', () => {
        runDailySubscriptionCheck();
    });
};
