import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { getEffectiveSubscriptionStatus, isSubscriptionValidForMatching } from '../services/subscription.helper';

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

    const effective = sub ? getEffectiveSubscriptionStatus(sub as any) : 'locked';
    if (!sub || !['active', 'trial', 'grace'].includes(effective)) {
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

    const isActiveLike = sub ? ['active', 'trial', 'grace'].includes(getEffectiveSubscriptionStatus(sub as any)) : false;
    const planName = String(sub?.planName || '').toLowerCase();
    const isPremiumLike = planName.includes('premium') || planName.includes('pro');

    if (!sub || !isActiveLike || !isPremiumLike) {
      return res.status(403).json({ success: false, message: "Premium subscription required" });
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireProviderSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const sub = await (prisma as any).providerSubscription.findUnique({
      where: { providerId: userId },
      select: {
        status: true,
        plan: true,
        price: true,
        expiryDate: true,
        metadata: true,
      },
    });

    if (!sub || !isSubscriptionValidForMatching(sub as any)) {
      return res.status(403).json({ success: false, message: 'Active provider subscription required' });
    }

    next();
  } catch (error) {
    next(error);
  }
};
