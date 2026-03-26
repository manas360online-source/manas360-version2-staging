import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

const ACTIVE_PATIENT_STATES = new Set(['active', 'trial', 'grace', 'trialing']);

export const requireSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const sub = await (prisma as any).patientSubscription.findUnique({
      where: { userId }
    });

    if (!sub || !ACTIVE_PATIENT_STATES.has(String(sub.status || '').toLowerCase())) {
      return res.status(403).json({ success: false, message: "Subscription required" });
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requirePremiumSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const sub = await (prisma as any).patientSubscription.findUnique({
      where: { userId }
    });

    const isActiveLike = ACTIVE_PATIENT_STATES.has(String(sub?.status || '').toLowerCase());
    if (!sub || !isActiveLike || !["premium_monthly", "premium_annual"].includes(sub.plan)) {
      return res.status(403).json({ success: false, message: "Premium subscription required" });
    }

    next();
  } catch (error) {
    next(error);
  }
};
