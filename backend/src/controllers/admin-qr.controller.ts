import type { Request, Response } from 'express';
import { sendSuccess } from '../utils/response';
import { createQrCode, listQrCodes, QR_STYLE_PRESETS, QR_TEMPLATES, updateQrCode } from '../services/admin-qr.service';
import { AppError } from '../middleware/error.middleware';

export const listAdminQrCodesController = async (req: Request, res: Response): Promise<void> => {
  const items = await listQrCodes();
  sendSuccess(res, { items, templates: QR_TEMPLATES, stylePresets: QR_STYLE_PRESETS }, 'QR codes fetched');
};

export const createAdminQrCodeController = async (req: Request, res: Response): Promise<void> => {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const created = await createQrCode(req.body || {}, userId);
  sendSuccess(res, created, 'QR code created', 201);
};

export const updateAdminQrCodeController = async (req: Request, res: Response): Promise<void> => {
  const code = String(req.params['code'] || '');
  if (!code) {
    throw new AppError('code is required', 422);
  }

  const updated = await updateQrCode(code, req.body || {});
  sendSuccess(res, updated, 'QR code updated');
};
