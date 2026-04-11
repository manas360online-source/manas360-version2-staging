import { prisma } from '../config/db';
import { env } from '../config/env';
import { createQrCode } from './admin-qr.service';

const normalizeSlugSegment = (value: string): string =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

const buildProviderSlug = (provider: {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
}): string => {
  const first = normalizeSlugSegment(String(provider.firstName || '').split(/\s+/)[0] || 'provider');
  const lastInitial = normalizeSlugSegment(String(provider.lastName || '').charAt(0) || String(provider.name || '').charAt(0) || 'p');
  const suffix = String(provider.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toLowerCase() || '000000';
  return `${first}-${lastInitial}-${suffix}`;
};

const getMonthBounds = (): { start: Date; end: Date } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const ensureProviderProfileQr = async (providerId: string) => {
  const existing = await prisma.qrCode.findFirst({
    where: {
      ownerId: providerId,
      qrType: 'provider',
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    return existing;
  }

  const provider = await prisma.user.findUnique({
    where: { id: providerId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      name: true,
      role: true,
      isDeleted: true,
    },
  });

  if (!provider || provider.isDeleted) {
    throw new Error('Provider not found');
  }

  const role = String(provider.role || '').toUpperCase();
  if (!['THERAPIST', 'PSYCHOLOGIST', 'PSYCHIATRIST', 'COACH'].includes(role)) {
    throw new Error('User is not a provider');
  }

  const slug = buildProviderSlug(provider);
  const code = `provider_${slug}`;
  const destinationUrl = `${env.frontendUrl}/provider/${provider.id}`;

  const created = await createQrCode(
    {
      code,
      qrType: 'provider',
      redirectUrl: destinationUrl,
      destinationUrl,
      ownerId: provider.id,
      isDynamic: true,
      templateId: 'modern-blue',
    },
    provider.id,
  );

  return created;
};

export const getProviderProfileQr = async (providerId: string) => {
  const qrCode = await ensureProviderProfileQr(providerId);
  const uniqueId = String(qrCode.code || '').replace(/^provider_/i, '').toLowerCase();
  const trackingPath = `/q/provider/${uniqueId}`;
  const trackingUrl = `${env.apiUrl}${env.apiPrefix}${trackingPath}`;
  return { qrCode, trackingPath, trackingUrl, uniqueId };
};

export const getProviderProfileQrAnalytics = async (providerId: string) => {
  const { qrCode, trackingPath, trackingUrl, uniqueId } = await getProviderProfileQr(providerId);
  const { start, end } = getMonthBounds();

  const [monthScans, monthBookings, monthRevenueAggregate, lifetimeBookings] = await Promise.all([
    prisma.qrScan.count({
      where: {
        qrCodeCode: qrCode.code,
        scanTimestamp: { gte: start, lte: end },
      },
    }).catch(() => qrCode.scanCount || 0),
    prisma.qrConversion.count({
      where: {
        qrCodeCode: qrCode.code,
        conversionType: 'session_booked',
        conversionAt: { gte: start, lte: end },
      },
    }).catch(() => 0),
    prisma.qrConversion.aggregate({
      where: {
        qrCodeCode: qrCode.code,
        conversionType: 'session_booked',
        conversionAt: { gte: start, lte: end },
      },
      _sum: { attributedRevenue: true },
    }).catch(() => ({ _sum: { attributedRevenue: 0 } })),
    prisma.qrConversion.count({
      where: {
        qrCodeCode: qrCode.code,
        conversionType: 'session_booked',
      },
    }).catch(() => 0),
  ]);

  const monthRevenue = Number(monthRevenueAggregate?._sum?.attributedRevenue || 0);
  const conversionRate = monthScans > 0 ? Number(((monthBookings / monthScans) * 100).toFixed(2)) : 0;

  return {
    qrCode,
    trackingPath,
    trackingUrl,
    uniqueId,
    month: {
      scans: monthScans,
      bookings: monthBookings,
      conversionRate,
      revenue: monthRevenue,
    },
    lifetime: {
      scans: qrCode.scanCount,
      bookings: lifetimeBookings,
    },
  };
};
