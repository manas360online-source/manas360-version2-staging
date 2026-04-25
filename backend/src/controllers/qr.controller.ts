import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { incrementQrConnectedCount, resolveTrackedQrRedirect } from '../services/admin-qr.service';

export const redirectQrCodeController = async (req: Request, res: Response): Promise<void> => {
  const code = String(req.params['code'] || '');
  if (!code) {
    throw new AppError('QR code is required', 422);
  }

  const tracked = await resolveTrackedQrRedirect({
    code,
    sessionId: String(req.query['sid'] || ''),
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null,
    includeTrackingParams: false,
  });

  res.redirect(302, tracked.redirectUrl);
};

export const redirectUniversalQrCodeController = async (req: Request, res: Response): Promise<void> => {
  const qrType = String(req.params['qr_type'] || '');
  const uniqueId = String(req.params['unique_id'] || '');

  if (!qrType || !uniqueId) {
    throw new AppError('qr_type and unique_id are required', 422);
  }

  const tracked = await resolveTrackedQrRedirect({
    qrType,
    uniqueId,
    sessionId: String(req.query['sid'] || ''),
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null,
    includeTrackingParams: true,
  });

  res.redirect(302, tracked.redirectUrl);
};

export const connectedQrCodeController = async (req: Request, res: Response): Promise<void> => {
	const code = String(req.params['code'] || '');
	if (!code) {
		throw new AppError('QR code is required', 422);
	}

	await incrementQrConnectedCount(code).catch(() => undefined);
	res.status(204).end();
};
