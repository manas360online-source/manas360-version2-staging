import type { Request, Response } from 'express';
import { sendSuccess } from '../utils/response';
import { createQrCode, listQrCodes, QR_STYLE_PRESETS, QR_TEMPLATES, updateQrCode } from '../services/admin-qr.service';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/db';
import { POLICY_VERSION } from '../middleware/rbac.middleware';
import { recordAdminAuditEvent } from '../services/admin-audit.service';

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

  await recordAdminAuditEvent({
    userId,
    action: 'QR_CODE_CREATED',
    resource: 'QrCode',
    details: {
      code: created.code,
      redirectUrl: created.redirectUrl,
      isActive: created.isActive,
      policy: 'qr.manage',
      policyVersion: POLICY_VERSION,
    },
  });

  sendSuccess(res, created, 'QR code created', 201);
};

export const updateAdminQrCodeController = async (req: Request, res: Response): Promise<void> => {
  const code = String(req.params['code'] || '');
  if (!code) {
    throw new AppError('code is required', 422);
  }

  const userId = req.auth?.userId;
  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const before = await prisma.qrCode.findUnique({
    where: { code: code.trim().toUpperCase() },
    select: {
      code: true,
      redirectUrl: true,
      templateId: true,
      stylePreset: true,
      foregroundColor: true,
      backgroundColor: true,
      logoUrl: true,
      isActive: true,
    },
  });

  const updated = await updateQrCode(code, req.body || {});

  await recordAdminAuditEvent({
    userId,
    action: 'QR_CODE_UPDATED',
    resource: 'QrCode',
    details: {
      code: updated.code,
      before,
      after: {
        redirectUrl: updated.redirectUrl,
        templateId: updated.templateId,
        stylePreset: updated.stylePreset,
        foregroundColor: updated.foregroundColor,
        backgroundColor: updated.backgroundColor,
        logoUrl: updated.logoUrl,
        isActive: updated.isActive,
      },
      policy: 'qr.manage',
      policyVersion: POLICY_VERSION,
    },
  });

  sendSuccess(res, updated, 'QR code updated');
};
