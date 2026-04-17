import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import { getProviderProfileQr, getProviderProfileQrAnalytics } from '../services/provider-qr.service';

const authUserId = (req: Request): string => {
  const userId = req.auth?.userId;
  if (!userId) throw new AppError('Authentication required', 401);
  return userId;
};

export const getProviderMyQrController = async (req: Request, res: Response): Promise<void> => {
  const providerId = authUserId(req);
  const data = await getProviderProfileQr(providerId);
  sendSuccess(res, data, 'Provider QR fetched');
};

export const getProviderMyQrAnalyticsController = async (req: Request, res: Response): Promise<void> => {
  const providerId = authUserId(req);
  try {
    const data = await getProviderProfileQrAnalytics(providerId);
    sendSuccess(res, data, 'Provider QR analytics fetched');
  } catch (error) {
    const message = String((error as any)?.message || '').toLowerCase();
    const code = String((error as any)?.code || '').toUpperCase();
    const isQrInfraIssue = code === 'P2021' || code === 'P2022' || message.includes('qr_') || message.includes('qrcode');

    if (!isQrInfraIssue) throw error;

    sendSuccess(
      res,
      {
        unavailable: true,
        month: { scans: 0, bookings: 0, conversionRate: 0, revenue: 0 },
        lifetime: { scans: 0, bookings: 0 },
      },
      'Provider QR analytics unavailable in this environment',
    );
  }
};
