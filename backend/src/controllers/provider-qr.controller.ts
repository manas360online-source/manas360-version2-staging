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
  const data = await getProviderProfileQrAnalytics(providerId);
  sendSuccess(res, data, 'Provider QR analytics fetched');
};
