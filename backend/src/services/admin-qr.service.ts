import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';

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
  templateId?: string;
  logoUrl?: string | null;
  stylePreset?: string;
  foregroundColor?: string;
  backgroundColor?: string;
  isActive?: boolean;
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
  const redirectUrl = String(payload.redirectUrl || '').trim();
  if (!redirectUrl || !isValidHttpUrl(redirectUrl)) {
    throw new AppError('Valid redirectUrl is required', 422);
  }

  const code = payload.code ? normalizeCode(payload.code) : await generateUniqueCode();
  const templateId = normalizeTemplateId(payload.templateId);
  const stylePreset = normalizeStylePreset(payload.stylePreset);
  const foregroundColor = normalizeHexColor(payload.foregroundColor, '#0F172A');
  const backgroundColor = normalizeHexColor(payload.backgroundColor, '#FFFFFF');
  const logoUrl = payload.logoUrl ? String(payload.logoUrl).trim() : null;

  const exists = await prisma.qrCode.findUnique({ where: { code }, select: { code: true } });
  if (exists) {
    throw new AppError('QR code already exists', 409);
  }

  if (logoUrl && !isValidLogoSource(logoUrl)) {
	throw new AppError('logoUrl must be a valid https/http URL or a data:image/* source', 422);
  }

  return prisma.qrCode.create({
    data: {
      code,
      redirectUrl,
      templateId,
      stylePreset,
      foregroundColor,
      backgroundColor,
      logoUrl,
      isActive: payload.isActive ?? true,
      createdById: createdById || null,
    },
  });
};

export const updateQrCode = async (code: string, payload: UpsertQrCodePayload) => {
  const normalizedCode = normalizeCode(code);
  const existing = await prisma.qrCode.findUnique({ where: { code: normalizedCode }, select: { code: true } });
  if (!existing) {
    throw new AppError('QR code not found', 404);
  }

  const data: {
    redirectUrl?: string;
    templateId?: QrTemplateId;
    stylePreset?: QrStylePreset;
    foregroundColor?: string;
    backgroundColor?: string;
    logoUrl?: string | null;
    isActive?: boolean;
  } = {};

  if (payload.redirectUrl !== undefined) {
    const redirectUrl = String(payload.redirectUrl || '').trim();
    if (!redirectUrl || !isValidHttpUrl(redirectUrl)) {
      throw new AppError('Valid redirectUrl is required', 422);
    }
    data.redirectUrl = redirectUrl;
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

  return prisma.qrCode.update({
    where: { code: normalizedCode },
    data,
  });
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
