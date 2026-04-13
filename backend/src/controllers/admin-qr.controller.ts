import type { Request, Response } from 'express';
import { sendSuccess } from '../utils/response';
import {
  createQrCode,
  getQrAnalyticsBySource,
  getQrAnalyticsByType,
  listQrCodes,
  QR_STYLE_PRESETS,
  QR_TEMPLATES,
  updateQrCode,
} from '../services/admin-qr.service';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { POLICY_VERSION } from '../middleware/rbac.middleware';
import { recordAdminAuditEvent } from '../services/admin-audit.service';
import { buildSessionJoinQr } from '../services/session-join-qr.service';

const normalizeSourceId = (value: unknown): string => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-');

  if (!/^[a-z0-9][a-z0-9_-]{2,119}$/.test(normalized)) {
    throw new AppError('sourceId must be 3-120 chars (a-z, 0-9, _, -)', 422);
  }

  return normalized;
};

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
      qrType: created.qrType,
      destinationUrl: created.destinationUrl,
      ownerId: created.ownerId,
      isDynamic: created.isDynamic,
      expiresAt: created.expiresAt,
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
      qrType: true,
      destinationUrl: true,
      ownerId: true,
      isDynamic: true,
      expiresAt: true,
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
        qrType: updated.qrType,
        destinationUrl: updated.destinationUrl,
        ownerId: updated.ownerId,
        isDynamic: updated.isDynamic,
        expiresAt: updated.expiresAt,
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

export const getAdminQrAnalyticsByTypeController = async (_req: Request, res: Response): Promise<void> => {
  const data = await getQrAnalyticsByType();
  sendSuccess(res, data, 'QR analytics by type fetched');
};

export const getAdminQrAnalyticsBySourceController = async (req: Request, res: Response): Promise<void> => {
  const limitRaw = Number.parseInt(String(req.query.limit || ''), 10);
  const data = await getQrAnalyticsBySource(Number.isFinite(limitRaw) ? limitRaw : undefined);
  sendSuccess(res, data, 'QR analytics by source fetched');
};

export const createScreeningQrCodeController = async (req: Request, res: Response): Promise<void> => {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const sourceId = normalizeSourceId(req.body?.sourceId);
  const templateKey = String(req.body?.templateKey || '').trim();
  const code = `screen_${sourceId}`;
  const trackingPath = `/q/screen/${sourceId}`;
  const trackingUrl = `${env.apiUrl}${env.apiPrefix}${trackingPath}`;

  const defaultDestination = new URL(`${env.frontendUrl}/screen`);
  defaultDestination.searchParams.set('qrSource', sourceId);
  if (templateKey) {
    defaultDestination.searchParams.set('templateKey', templateKey);
  }

  const destinationUrl = String(req.body?.destinationUrl || '').trim() || defaultDestination.toString();

  const created = await createQrCode(
    {
      code,
      qrType: 'screen',
      redirectUrl: destinationUrl,
      destinationUrl,
      isDynamic: true,
      ownerId: null,
      templateId: req.body?.templateId,
      stylePreset: req.body?.stylePreset,
      foregroundColor: req.body?.foregroundColor,
      backgroundColor: req.body?.backgroundColor,
      logoUrl: req.body?.logoUrl,
      isActive: req.body?.isActive,
    },
    userId,
  );

  await recordAdminAuditEvent({
    userId,
    action: 'QR_SCREENING_CODE_CREATED',
    resource: 'QrCode',
    details: {
      code: created.code,
      sourceId,
      qrType: created.qrType,
      destinationUrl: created.destinationUrl,
      trackingPath,
      policy: 'qr.manage',
      policyVersion: POLICY_VERSION,
    },
  });

  sendSuccess(
    res,
    {
      qrCode: created,
      sourceId,
      trackingPath,
      trackingUrl,
    },
    'Screening QR code created',
    201,
  );
};

export const createCheckinQrCodeController = async (req: Request, res: Response): Promise<void> => {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const clinicSlug = normalizeSourceId(req.body?.clinicSlug || req.body?.sourceId);
  const providerId = String(req.body?.providerId || req.body?.ownerId || '').trim();
  if (!providerId) {
    throw new AppError('providerId is required', 422);
  }

  const code = `checkin_${clinicSlug}`;
  const trackingPath = `/q/checkin/${clinicSlug}`;
  const trackingUrl = `${env.apiUrl}${env.apiPrefix}${trackingPath}`;

  const destination = new URL(`${env.frontendUrl}/checkin`);
  destination.searchParams.set('clinic', clinicSlug);
  const destinationUrl = String(req.body?.destinationUrl || '').trim() || destination.toString();

  const created = await createQrCode(
    {
      code,
      qrType: 'checkin',
      redirectUrl: destinationUrl,
      destinationUrl,
      ownerId: providerId,
      isDynamic: true,
      templateId: req.body?.templateId,
      stylePreset: req.body?.stylePreset,
      foregroundColor: req.body?.foregroundColor,
      backgroundColor: req.body?.backgroundColor,
      logoUrl: req.body?.logoUrl,
      isActive: req.body?.isActive,
    },
    userId,
  );

  await recordAdminAuditEvent({
    userId,
    action: 'QR_CHECKIN_CODE_CREATED',
    resource: 'QrCode',
    details: {
      code: created.code,
      clinicSlug,
      providerId,
      destinationUrl: created.destinationUrl,
      trackingPath,
      policy: 'qr.manage',
      policyVersion: POLICY_VERSION,
    },
  });

  sendSuccess(
    res,
    {
      qrCode: created,
      clinicSlug,
      providerId,
      trackingPath,
      trackingUrl,
    },
    'Check-in QR code created',
    201,
  );
};

export const createSessionJoinQrCodeController = async (req: Request, res: Response): Promise<void> => {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const sessionId = String(req.body?.sessionId || '').trim();
  if (!sessionId) {
    throw new AppError('sessionId is required', 422);
  }

  const created = await buildSessionJoinQr(sessionId, userId);

  await recordAdminAuditEvent({
    userId,
    action: 'QR_SESSION_JOIN_CODE_CREATED',
    resource: 'QrCode',
    details: {
      sessionId: created.sessionId,
      bookingReferenceId: created.bookingReferenceId,
      code: created.qrCode.code,
      qrType: created.qrCode.qrType,
      destinationUrl: created.qrCode.destinationUrl,
      trackingPath: created.trackingPath,
      expiresAt: created.expiresAt,
      policy: 'qr.manage',
      policyVersion: POLICY_VERSION,
    },
  });

  sendSuccess(
    res,
    {
      ...created,
      qrImageAvailable: Boolean(created.qrImageBase64),
    },
    'Session join QR code created',
    201,
  );
};
