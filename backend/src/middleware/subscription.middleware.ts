import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export const requireSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const sub = await (prisma as any).patientSubscription.findUnique({
      where: { userId }
    });

    if (!sub || sub.status !== "active") {
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

    if (!sub || sub.status !== "active" || !["premium_monthly", "premium_annual"].includes(sub.plan)) {
      return res.status(403).json({ success: false, message: "Premium subscription required" });
    }

    next();
  } catch (error) {
    next(error);
  }
};
