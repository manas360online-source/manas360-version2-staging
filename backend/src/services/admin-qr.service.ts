import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { randomUUID } from 'crypto';

const CODE_LENGTH = 8;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const QR_TEMPLATES = [
  { id: 'classic-black', name: 'Classic Black', fill: '#000000', back: '#FFFFFF' },
  { id: 'modern-blue', name: 'Modern Blue', fill: '#1E40AF', back: '#F0F4FF' },
  { id: 'vibrant-green', name: 'Vibrant Green', fill: '#0B8C3F', back: '#F0FFF0' },
] as const;

export const QR_STYLE_PRESETS = [
	{ id: 'rounded', name: 'Rounded', description: 'Smooth dots with soft corners' },
	{ id: 'dots', name: 'Dots', description: 'Circular modules for a modern look' },
	{ id: 'classy', name: 'Classy', description: 'Balanced and professional' },
	{ id: 'square', name: 'Square', description: 'Clean, standard QR geometry' },
] as const;

type QrTemplateId = (typeof QR_TEMPLATES)[number]['id'];
type QrStylePreset = (typeof QR_STYLE_PRESETS)[number]['id'];

export type UpsertQrCodePayload = {
  code?: string;
  redirectUrl?: string;
  qrType?: string;
  destinationUrl?: string;
  ownerId?: string | null;
  isDynamic?: boolean;
  expiresAt?: string | Date | null;
  templateId?: string;
  logoUrl?: string | null;
  stylePreset?: string;
  foregroundColor?: string;
  backgroundColor?: string;
  isActive?: boolean;
};

type ResolveTrackedQrInput = {
  code?: string;
  qrType?: string;
  uniqueId?: string;
  sessionId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  includeTrackingParams?: boolean;
};

type ResolveTrackedQrResult = {
  code: string;
  sessionId: string;
  redirectUrl: string;
};

type QrAnalyticsCodeRow = {
  code: string;
  qrType: string | null;
  ownerId: string | null;
  scanCount: number;
  createdAt: Date;
  scans?: Array<{ id: string }>;
  conversions?: Array<{ conversionType: string; attributedRevenue: any }>;
};

type QrAnalyticsCodeMetrics = {
  code: string;
  qrType: string | null;
  ownerId: string | null;
  scans: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
  createdAt: Date;
};

const isMissingQrInfraError = (error: unknown): boolean => {
  const message = String((error as any)?.message || '').toLowerCase();
  const code = String((error as any)?.code || '').toUpperCase();
  if (code === 'P2021' || code === 'P2022' || code === 'P2010') return true;
  return (
    message.includes('qr_type')
    || message.includes('destination_url')
    || message.includes('owner_id')
    || message.includes('is_dynamic')
    || message.includes('expires_at')
    || message.includes('last_scanned_at')
    || message.includes('qr_scans')
    || message.includes('qr_conversions')
    || message.includes('column') && message.includes('qr_')
  );
};

const isValidHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const normalizeTemplateId = (value?: string): QrTemplateId => {
  const candidate = String(value || 'classic-black').trim();
  const found = QR_TEMPLATES.find((item) => item.id === candidate);
  if (!found) {
    throw new AppError('Invalid templateId', 422);
  }
  return found.id;
};

const normalizeCode = (value: string): string => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '');

  if (!normalized || normalized.length < 4 || normalized.length > 32) {
    throw new AppError('code must be 4-32 chars (A-Z, 0-9, _, -)', 422);
  }

  return normalized;
};

const normalizeQrType = (value: string): string => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]{1,29}$/.test(normalized)) {
    throw new AppError('qr_type must be 2-30 chars (a-z, 0-9, _)', 422);
  }
  return normalized;
};

const normalizeQrUniqueId = (value: string): string => {
  const normalized = String(value || '').trim();
  if (!/^[A-Za-z0-9_-]{2,120}$/.test(normalized)) {
    throw new AppError('unique_id must be 2-120 chars (A-Z, a-z, 0-9, _, -)', 422);
  }
  return normalized;
};

const inferDeviceType = (userAgent?: string | null): string => {
  const source = String(userAgent || '').toLowerCase();
  if (!source) return 'unknown';
  if (source.includes('mobile') || source.includes('iphone') || source.includes('android')) return 'mobile';
  if (source.includes('ipad') || source.includes('tablet')) return 'tablet';
  return 'desktop';
};

const inferDeviceOs = (userAgent?: string | null): string => {
  const source = String(userAgent || '').toLowerCase();
  if (!source) return 'unknown';
  if (source.includes('android')) return 'android';
  if (source.includes('iphone') || source.includes('ipad') || source.includes('ios')) return 'ios';
  if (source.includes('mac os')) return 'macos';
  if (source.includes('windows')) return 'windows';
  if (source.includes('linux')) return 'linux';
  return 'unknown';
};

const appendTrackingParams = (destinationUrl: string, code: string, sessionId: string): string => {
  try {
    const parsed = new URL(destinationUrl);
    parsed.searchParams.set('qr', code);
    parsed.searchParams.set('sid', sessionId);
    return parsed.toString();
  } catch {
    const separator = destinationUrl.includes('?') ? '&' : '?';
    return `${destinationUrl}${separator}qr=${encodeURIComponent(code)}&sid=${encodeURIComponent(sessionId)}`;
  }
};

const normalizeHexColor = (value: string | undefined, fallback: string): string => {
  const candidate = String(value || fallback || '').trim();
  if (!/^#[0-9A-Fa-f]{6}$/.test(candidate)) {
    throw new AppError('Color must be a hex value like #0F172A', 422);
  }
  return candidate.toUpperCase();
};

const normalizeStylePreset = (value?: string): QrStylePreset => {
  const candidate = String(value || 'rounded').trim();
  const found = QR_STYLE_PRESETS.find((item) => item.id === candidate);
  if (!found) {
    throw new AppError('Invalid style preset', 422);
  }
  return found.id;
};

const normalizeOptionalHttpUrl = (value?: string | null): string | null => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  if (!isValidHttpUrl(normalized)) {
    throw new AppError('URL must be a valid http/https value', 422);
  }
  return normalized;
};

const normalizeOptionalExpiry = (value?: string | Date | null): Date | null => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError('expiresAt must be a valid date-time', 422);
  }
  return parsed;
};

const isValidLogoSource = (value: string): boolean => {
  if (!value) return false;
  if (value.startsWith('data:image/')) return true;
  return isValidHttpUrl(value);
};

const generateRandomCode = (): string => {
  let output = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    output += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)] || 'X';
  }
  return output;
};

const generateUniqueCode = async (): Promise<string> => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = generateRandomCode();
    const existing = await prisma.qrCode.findUnique({ where: { code: candidate }, select: { code: true } });
    if (!existing) {
      return candidate;
    }
  }

  throw new AppError('Unable to generate unique QR code. Try again.', 500);
};

export const listQrCodes = async () => {
  const items = await prisma.qrCode.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return items;
};

export const createQrCode = async (payload: UpsertQrCodePayload, createdById?: string) => {
  const explicitRedirectUrl = normalizeOptionalHttpUrl(payload.redirectUrl);
  const destinationUrl = normalizeOptionalHttpUrl(payload.destinationUrl);
  const redirectUrl = explicitRedirectUrl || destinationUrl;
  if (!redirectUrl) {
    throw new AppError('Valid redirectUrl or destinationUrl is required', 422);
  }

  const initialCode = payload.code ? normalizeCode(payload.code) : await generateUniqueCode();
  const qrType = payload.qrType ? normalizeQrType(payload.qrType) : null;
  const templateId = normalizeTemplateId(payload.templateId);
  const stylePreset = normalizeStylePreset(payload.stylePreset);
  const foregroundColor = normalizeHexColor(payload.foregroundColor, '#0F172A');
  const backgroundColor = normalizeHexColor(payload.backgroundColor, '#FFFFFF');
  const logoUrl = payload.logoUrl ? String(payload.logoUrl).trim() : null;
  const ownerId = payload.ownerId ? String(payload.ownerId).trim() : null;
  const expiresAt = normalizeOptionalExpiry(payload.expiresAt);

  const exists = await prisma.qrCode.findUnique({ where: { code: initialCode }, select: { code: true } });
  if (exists) {
    throw new AppError('QR code already exists', 409);
  }

  if (logoUrl && !isValidLogoSource(logoUrl)) {
	throw new AppError('logoUrl must be a valid https/http URL or a data:image/* source', 422);
  }

  const buildData = (code: string) => ({
    code,
    redirectUrl,
    qrType,
    destinationUrl: destinationUrl || redirectUrl,
    ownerId,
    isDynamic: payload.isDynamic ?? true,
    expiresAt,
    templateId,
    stylePreset,
    foregroundColor,
    backgroundColor,
    logoUrl,
    isActive: payload.isActive ?? true,
    createdById: createdById || null,
  });

  const fallbackData = (code: string) => ({
    code,
    redirectUrl,
    templateId,
    stylePreset,
    foregroundColor,
    backgroundColor,
    logoUrl,
    isActive: payload.isActive ?? true,
    createdById: createdById || null,
  });

  const maxAttempts = payload.code ? 1 : 5;
  let code = initialCode;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await prisma.qrCode.create({ data: buildData(code) as any });
    } catch (error) {
      const prismaCode = String((error as any)?.code || '').toUpperCase();
      const target = String((error as any)?.meta?.target || '').toLowerCase();
      const isCodeCollision = prismaCode === 'P2002' && target.includes('code');

      if (isCodeCollision && !payload.code && attempt < maxAttempts - 1) {
        code = await generateUniqueCode();
        continue;
      }

      if (!isMissingQrInfraError(error)) {
        throw error;
      }

      try {
        return await prisma.qrCode.create({ data: fallbackData(code) as any });
      } catch (fallbackError) {
        const fallbackCode = String((fallbackError as any)?.code || '').toUpperCase();
        const fallbackTarget = String((fallbackError as any)?.meta?.target || '').toLowerCase();
        const fallbackCollision = fallbackCode === 'P2002' && fallbackTarget.includes('code');
        if (fallbackCollision && !payload.code && attempt < maxAttempts - 1) {
          code = await generateUniqueCode();
          continue;
        }
        throw fallbackError;
      }
    }
  }

  throw new AppError('Failed to create QR code after multiple attempts', 500);
};

export const updateQrCode = async (code: string, payload: UpsertQrCodePayload) => {
  const normalizedCode = normalizeCode(code);
  const existing = await prisma.qrCode.findUnique({ where: { code: normalizedCode }, select: { code: true } });
  if (!existing) {
    throw new AppError('QR code not found', 404);
  }

  const data: {
    redirectUrl?: string;
    qrType?: string | null;
    destinationUrl?: string | null;
    ownerId?: string | null;
    isDynamic?: boolean;
    expiresAt?: Date | null;
    templateId?: QrTemplateId;
    stylePreset?: QrStylePreset;
    foregroundColor?: string;
    backgroundColor?: string;
    logoUrl?: string | null;
    isActive?: boolean;
  } = {};

  if (payload.redirectUrl !== undefined) {
    const redirectUrl = normalizeOptionalHttpUrl(payload.redirectUrl);
    if (!redirectUrl) {
      throw new AppError('Valid redirectUrl is required', 422);
    }
    data.redirectUrl = redirectUrl;
  }

  if (payload.qrType !== undefined) {
    const qrType = String(payload.qrType || '').trim();
    data.qrType = qrType ? normalizeQrType(qrType) : null;
  }

  if (payload.destinationUrl !== undefined) {
    const destinationUrl = normalizeOptionalHttpUrl(payload.destinationUrl);
    if (!destinationUrl) {
      throw new AppError('Valid destinationUrl is required', 422);
    }
    data.destinationUrl = destinationUrl;
  }

  if (payload.ownerId !== undefined) {
    const ownerId = String(payload.ownerId || '').trim();
    data.ownerId = ownerId || null;
  }

  if (payload.isDynamic !== undefined) {
    data.isDynamic = Boolean(payload.isDynamic);
  }

  if (payload.expiresAt !== undefined) {
    data.expiresAt = normalizeOptionalExpiry(payload.expiresAt);
  }

  if (payload.templateId !== undefined) {
    data.templateId = normalizeTemplateId(payload.templateId);
  }

  if (payload.stylePreset !== undefined) {
    data.stylePreset = normalizeStylePreset(payload.stylePreset);
  }

  if (payload.foregroundColor !== undefined) {
    data.foregroundColor = normalizeHexColor(payload.foregroundColor, '#0F172A');
  }

  if (payload.backgroundColor !== undefined) {
    data.backgroundColor = normalizeHexColor(payload.backgroundColor, '#FFFFFF');
  }

  if (payload.logoUrl !== undefined) {
    const logoSource = payload.logoUrl ? String(payload.logoUrl).trim() : '';
    if (logoSource && !isValidLogoSource(logoSource)) {
      throw new AppError('logoUrl must be a valid https/http URL or a data:image/* source', 422);
    }
    data.logoUrl = logoSource || null;
  }

  if (payload.isActive !== undefined) {
    data.isActive = Boolean(payload.isActive);
  }

  try {
    return await prisma.qrCode.update({
      where: { code: normalizedCode },
      data,
    });
  } catch (error) {
    if (!isMissingQrInfraError(error)) {
      throw error;
    }

    const legacyData: {
      redirectUrl?: string;
      templateId?: QrTemplateId;
      stylePreset?: QrStylePreset;
      foregroundColor?: string;
      backgroundColor?: string;
      logoUrl?: string | null;
      isActive?: boolean;
    } = {
      redirectUrl: data.redirectUrl,
      templateId: data.templateId,
      stylePreset: data.stylePreset,
      foregroundColor: data.foregroundColor,
      backgroundColor: data.backgroundColor,
      logoUrl: data.logoUrl,
      isActive: data.isActive,
    };

    return prisma.qrCode.update({
      where: { code: normalizedCode },
      data: legacyData,
    });
  }
};

export const resolveQrRedirect = async (code: string): Promise<string> => {
  const normalizedCode = normalizeCode(code);

  const record = await prisma.qrCode.findUnique({
    where: { code: normalizedCode },
    select: {
      redirectUrl: true,
      isActive: true,
    },
  });

  if (!record || !record.isActive) {
    throw new AppError('QR code not found', 404);
  }

  return record.redirectUrl;
};

export const resolveTrackedQrRedirect = async (input: ResolveTrackedQrInput): Promise<ResolveTrackedQrResult> => {
  const includeTrackingParams = input.includeTrackingParams ?? true;

  let whereCodeCandidates: string[] = [];
  let typedRouteFilter: string | null = null;

  if (input.code) {
    whereCodeCandidates = [normalizeCode(input.code)];
  } else {
    const qrType = normalizeQrType(String(input.qrType || ''));
    const uniqueId = normalizeQrUniqueId(String(input.uniqueId || ''));
    const fullTypedCode = `${qrType}_${uniqueId}`;
    whereCodeCandidates = fullTypedCode === fullTypedCode.toUpperCase()
      ? [fullTypedCode]
      : [fullTypedCode, fullTypedCode.toUpperCase()];
    typedRouteFilter = qrType;
  }

  let qrCode: {
    code: string;
    redirectUrl: string;
    destinationUrl: string | null;
    isActive: boolean;
    expiresAt: Date | null;
  } | null = null;

  try {
    qrCode = await prisma.qrCode.findFirst({
      where: {
        code: { in: whereCodeCandidates },
        ...(typedRouteFilter ? { OR: [{ qrType: null }, { qrType: typedRouteFilter }] } : {}),
      },
      select: {
        code: true,
        redirectUrl: true,
        destinationUrl: true,
        isActive: true,
        expiresAt: true,
      },
    });
  } catch (error) {
    if (!isMissingQrInfraError(error)) {
      throw error;
    }

    const legacy = await prisma.qrCode.findFirst({
      where: { code: { in: whereCodeCandidates } },
      select: {
        code: true,
        redirectUrl: true,
        isActive: true,
      },
    });

    qrCode = legacy
      ? {
          code: legacy.code,
          redirectUrl: legacy.redirectUrl,
          destinationUrl: legacy.redirectUrl,
          isActive: legacy.isActive,
          expiresAt: null,
        }
      : null;
  }

  if (!qrCode || !qrCode.isActive) {
    throw new AppError('QR code not found', 404);
  }

  if (qrCode.expiresAt && qrCode.expiresAt.getTime() <= Date.now()) {
    throw new AppError('QR code expired', 410);
  }

  const sessionId = String(input.sessionId || '').trim() || randomUUID();
  const userAgent = String(input.userAgent || '').trim() || null;
  const ipAddress = String(input.ipAddress || '').trim() || null;

  const scanLogResult = await prisma.qrScan.create({
    data: {
      qrCodeCode: qrCode.code,
      scanTimestamp: new Date(),
      deviceType: inferDeviceType(userAgent),
      deviceOs: inferDeviceOs(userAgent),
      ipAddress,
      sessionId,
      userAgent,
    },
  }).then(() => 'ok' as const).catch((error) => (isMissingQrInfraError(error) ? 'legacy' as const : Promise.reject(error)));

  if (scanLogResult === 'legacy') {
    await incrementQrScanCount(qrCode.code).catch(() => undefined);
  } else {
    await prisma.qrCode.update({
      where: { code: qrCode.code },
      data: {
        scanCount: { increment: 1 },
        lastScannedAt: new Date(),
      },
    }).catch(async (error) => {
      if (!isMissingQrInfraError(error)) throw error;
      await incrementQrScanCount(qrCode.code).catch(() => undefined);
    });
  }

  const destinationUrl = String(qrCode.destinationUrl || qrCode.redirectUrl || '').trim();
  if (!destinationUrl) {
    throw new AppError('QR destination is not configured', 422);
  }

  return {
    code: qrCode.code,
    sessionId,
    redirectUrl: includeTrackingParams ? appendTrackingParams(destinationUrl, qrCode.code, sessionId) : destinationUrl,
  };
};

export const incrementQrScanCount = async (code: string): Promise<void> => {
  const normalizedCode = normalizeCode(code);
  await prisma.qrCode.update({
    where: { code: normalizedCode },
    data: { scanCount: { increment: 1 } },
  });
};

export const incrementQrConnectedCount = async (code: string): Promise<void> => {
  const normalizedCode = normalizeCode(code);
  await prisma.qrCode.update({
    where: { code: normalizedCode },
    data: { connectedCount: { increment: 1 } },
  });
};

const loadQrAnalyticsRows = async (): Promise<QrAnalyticsCodeRow[]> => {
  try {
    return await prisma.qrCode.findMany({
      select: {
        code: true,
        qrType: true,
        ownerId: true,
        scanCount: true,
        createdAt: true,
        scans: { select: { id: true } },
        conversions: { select: { conversionType: true, attributedRevenue: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    if (!isMissingQrInfraError(error)) {
      throw error;
    }

    return prisma.qrCode.findMany({
      select: {
        code: true,
        qrType: true,
        ownerId: true,
        scanCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
};

const mapQrAnalyticsMetrics = (rows: QrAnalyticsCodeRow[]): QrAnalyticsCodeMetrics[] => rows.map((row) => {
  const scans = Array.isArray(row.scans) ? row.scans.length : Number(row.scanCount || 0);
  const conversions = Array.isArray(row.conversions) ? row.conversions.length : 0;
  const revenue = Array.isArray(row.conversions)
    ? row.conversions.reduce((sum, conversion) => sum + Number(conversion.attributedRevenue || 0), 0)
    : 0;
  const conversionRate = scans > 0 ? Number(((conversions / scans) * 100).toFixed(2)) : 0;

  return {
    code: row.code,
    qrType: row.qrType,
    ownerId: row.ownerId,
    scans,
    conversions,
    revenue: Number(revenue.toFixed(2)),
    conversionRate,
    createdAt: row.createdAt,
  };
});

export const getQrAnalyticsByType = async () => {
  const rows = mapQrAnalyticsMetrics(await loadQrAnalyticsRows());

  const grouped = rows.reduce<Record<string, {
    qrType: string;
    qrCount: number;
    scans: number;
    conversions: number;
    revenue: number;
    conversionRate: number;
  }>>((acc, item) => {
    const qrType = String(item.qrType || 'untagged');
    const current = acc[qrType] || { qrType, qrCount: 0, scans: 0, conversions: 0, revenue: 0, conversionRate: 0 };
    current.qrCount += 1;
    current.scans += item.scans;
    current.conversions += item.conversions;
    current.revenue += item.revenue;
    acc[qrType] = current;
    return acc;
  }, {});

  const breakdown = Object.values(grouped)
    .map((item) => ({
      ...item,
      revenue: Number(item.revenue.toFixed(2)),
      conversionRate: item.scans > 0 ? Number(((item.conversions / item.scans) * 100).toFixed(2)) : 0,
    }))
    .sort((left, right) => right.scans - left.scans);

  const totals = breakdown.reduce((acc, item) => {
    acc.qrCount += item.qrCount;
    acc.scans += item.scans;
    acc.conversions += item.conversions;
    acc.revenue += item.revenue;
    return acc;
  }, { qrCount: 0, scans: 0, conversions: 0, revenue: 0 });

  return {
    totals: {
      qrCount: totals.qrCount,
      scans: totals.scans,
      conversions: totals.conversions,
      revenue: Number(totals.revenue.toFixed(2)),
    },
    breakdown,
  };
};

export const getQrAnalyticsBySource = async (limit = 10) => {
  const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(50, Math.trunc(limit))) : 10;
  const rows = mapQrAnalyticsMetrics(await loadQrAnalyticsRows());

  const sources = rows
    .map((item) => ({
      code: item.code,
      source: String(item.code || '')
        .replace(/^SCREEN_/, '')
        .replace(/^CHECKIN_/, '')
        .replace(/^JOIN_/, '')
        .replace(/^PROVIDER_/, '')
        .replace(/^EAP_/, '')
        .toLowerCase()
        .replace(/_/g, '-')
        .replace(/-/g, ' '),
      qrType: item.qrType,
      scans: item.scans,
      conversions: item.conversions,
      revenue: item.revenue,
      conversionRate: item.conversionRate,
    }))
    .sort((left, right) => {
      if (right.conversionRate !== left.conversionRate) return right.conversionRate - left.conversionRate;
      if (right.revenue !== left.revenue) return right.revenue - left.revenue;
      return right.scans - left.scans;
    })
    .slice(0, normalizedLimit);

  const totals = sources.reduce((acc, item) => {
    acc.scans += item.scans;
    acc.conversions += item.conversions;
    acc.revenue += item.revenue;
    return acc;
  }, { scans: 0, conversions: 0, revenue: 0 });

  return {
    limit: normalizedLimit,
    totals: {
      scans: totals.scans,
      conversions: totals.conversions,
      revenue: Number(totals.revenue.toFixed(2)),
    },
    breakdown: sources,
  };
};
