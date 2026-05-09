import { prisma } from '../config/db';

type RecordQrConversionInput = {
  qrCode: string;
  conversionType: string;
  sessionId?: string;
  attributedRevenue?: number;
  conversionData?: Record<string, unknown>;
};

const normalizeQrCode = (value: string): string => String(value || '').trim();

export const recordQrConversion = async (input: RecordQrConversionInput): Promise<void> => {
  const qrCodeRaw = normalizeQrCode(input.qrCode);
  if (!qrCodeRaw) return;

  const qrCode = await prisma.qrCode.findFirst({
    where: {
      code: { in: qrCodeRaw === qrCodeRaw.toUpperCase() ? [qrCodeRaw] : [qrCodeRaw, qrCodeRaw.toUpperCase()] },
    },
    select: { code: true },
  });

  if (!qrCode) return;

  const sessionId = String(input.sessionId || '').trim() || null;

  const scan = sessionId
    ? await prisma.qrScan.findFirst({
        where: {
          qrCodeCode: qrCode.code,
          sessionId,
        },
        orderBy: { scanTimestamp: 'desc' },
        select: { id: true },
      })
    : null;

  await prisma.qrConversion.create({
    data: {
      qrCodeCode: qrCode.code,
      qrScanId: scan?.id || null,
      sessionId,
      conversionType: String(input.conversionType || 'unknown').trim() || 'unknown',
      attributedRevenue: input.attributedRevenue ?? 0,
      conversionData: input.conversionData ?? null,
      conversionAt: new Date(),
    },
  });
};
