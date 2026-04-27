import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';

export const listMdcClinicsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinics = await prisma.clinic.findMany({
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        staff: {
          where: { role: 'admin' },
          take: 1,
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(clinics);
  } catch (error) {
    next(error);
  }
};

export const updateMdcClinicSubscriptionController = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status, trialEndsAt } = req.body;

  try {
    const clinic = await prisma.clinic.findUnique({
      where: { id },
    });

    if (!clinic) {
      return next(new AppError('Clinic not found', 404));
    }

    const currentSub = await prisma.clinicSubscription.findFirst({
      where: { clinicId: id },
      orderBy: { createdAt: 'desc' },
    });

    if (currentSub) {
      await prisma.clinicSubscription.update({
        where: { id: currentSub.id },
        data: { 
          status,
          ...(trialEndsAt ? { trialEndsAt: new Date(trialEndsAt) } : {})
        },
      });
    }

    await prisma.clinic.update({
      where: { id },
      data: {
        subscriptionStatus: status,
        ...(trialEndsAt ? { trialEndsAt: new Date(trialEndsAt) } : {})
      },
    });

    res.json({ message: 'Clinic subscription updated successfully' });
  } catch (error) {
    next(error);
  }
};
