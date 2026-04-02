import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { incrementQrConnectedCount, incrementQrScanCount, resolveQrRedirect } from '../services/admin-qr.service';

export const redirectQrCodeController = async (req: Request, res: Response): Promise<void> => {
  const code = String(req.params['code'] || '');
  if (!code) {
    throw new AppError('QR code is required', 422);
  }

  await incrementQrScanCount(code).catch(() => undefined);
  const redirectUrl = await resolveQrRedirect(code);
  res.redirect(302, redirectUrl);
};

export const connectedQrCodeController = async (req: Request, res: Response): Promise<void> => {
	const code = String(req.params['code'] || '');
	if (!code) {
		throw new AppError('QR code is required', 422);
	}

	await incrementQrConnectedCount(code).catch(() => undefined);
	res.status(204).end();
};
