import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import { processMdcCheckIn } from '../services/mdc-checkin.service';

export const mdcCheckInController = async (req: Request, res: Response): Promise<void> => {
  const phone = String(req.body?.phone || '').trim();
  if (!phone) {
    throw new AppError('phone is required', 422);
  }

  const data = await processMdcCheckIn({
    phone,
    qrCode: typeof req.body?.qrCode === 'string' ? req.body.qrCode : undefined,
    clinicSlug: typeof req.body?.clinicSlug === 'string' ? req.body.clinicSlug : undefined,
  });

  sendSuccess(res, data, 'Check-in processed');
};
