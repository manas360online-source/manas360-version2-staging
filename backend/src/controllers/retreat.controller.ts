import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import { prisma as db } from '../config/db';
import { submitRetreatIntent, listRetreatIntents, updateRetreatIntentStatus } from '../services/retreat.service';

export const submitRetreatIntentController = async (req: Request, res: Response): Promise<void> => {
  const { name, phone, email, theme, preferredDates, groupSize, budgetRange, personalNote, consentContact } = req.body;

  if (!name || !phone || !theme) {
    throw new AppError('name, phone, and theme are required', 400);
  }
  if (!consentContact) {
    throw new AppError('Consent is required to submit a retreat intent', 400);
  }

  const intent = await submitRetreatIntent({
    name,
    phone,
    email,
    theme,
    preferredDates,
    groupSize,
    budgetRange,
    personalNote,
    consentContact,
  });

  const admins = await db.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    select: { id: true },
  });

  if (admins.length > 0) {
    await db.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: 'RETREAT_INTENT_RECEIVED',
        title: 'New retreat intent submitted',
        message: `${name} submitted a retreat intent for ${theme}.`,
        payload: {
          intentId: intent.id,
          name,
          phone,
          theme,
          preferredDates,
          groupSize,
          budgetRange,
        },
        sentAt: new Date(),
      })),
    });
  }

  sendSuccess(res, intent, 'Retreat intent submitted successfully', 201);
};

export const listRetreatIntentsController = async (req: Request, res: Response): Promise<void> => {
  const { status, theme, page = '1', limit = '50' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const result = await listRetreatIntents({
    status: status || undefined,
    theme: theme || undefined,
    skip,
    take: parseInt(limit),
  });

  sendSuccess(res, result, 'Retreat intents retrieved');
};

export const updateRetreatIntentStatusController = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, adminNotes } = req.body;

  if (!status) throw new AppError('status is required', 400);

  const updated = await updateRetreatIntentStatus(id, status, adminNotes);
  sendSuccess(res, updated, 'Retreat intent updated');
};
