import QRCode from 'qrcode';
import crypto from 'crypto';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { createQrCode, updateQrCode } from './admin-qr.service';

type SessionJoinQrResult = {
  qrCode: {
    code: string;
    qrType: string | null;
    destinationUrl: string | null;
    ownerId: string | null;
    expiresAt: Date | null;
  };
  sessionId: string;
  bookingReferenceId: string;
  uniqueId: string;
  trackingPath: string;
  trackingUrl: string;
  sessionJoinUrl: string;
  meetingRoomName: string;
  qrImageBase64: string | null;
  expiresAt: Date;
};

const normalizeJoinSlug = (value: string): string => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-');

  if (!normalized) {
    throw new AppError('Unable to build session join QR identifier', 422);
  }

  const truncated = normalized.slice(0, 24).replace(/^-+|-+$/g, '');
  if (truncated.length < 3) {
    throw new AppError('Unable to build session join QR identifier', 422);
  }

  return truncated;
};

const ensureMeetingRoomName = async (sessionId: string, currentValue: string | null): Promise<string> => {
  const meetingRoomName = String(currentValue || '').trim() || `Manas360-${crypto.randomBytes(8).toString('hex')}`;
  if (!currentValue) {
    await prisma.therapySession.update({
      where: { id: sessionId },
      data: { meetingRoomName },
    });
  }

  return meetingRoomName;
};

export const buildSessionJoinQr = async (
  sessionId: string,
  createdById?: string,
): Promise<SessionJoinQrResult> => {
  const normalizedSessionId = String(sessionId || '').trim();
  if (!normalizedSessionId) {
    throw new AppError('sessionId is required', 422);
  }

  const session = await prisma.therapySession.findUnique({
    where: { id: normalizedSessionId },
    select: {
      id: true,
      bookingReferenceId: true,
      dateTime: true,
      meetingRoomName: true,
      therapistProfileId: true,
    },
  });

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  const uniqueId = normalizeJoinSlug(session.bookingReferenceId || session.id);
  const trackingPath = `/q/join/${uniqueId}`;
  const trackingUrl = `${env.apiUrl}${env.apiPrefix}${trackingPath}`;
  const sessionJoinUrl = `${env.frontendUrl}/video-session/${session.id}`;
  const expiresAt = new Date(new Date(session.dateTime).getTime() + 60 * 60 * 1000);
  const meetingRoomName = await ensureMeetingRoomName(session.id, session.meetingRoomName);
  const code = `JOIN_${uniqueId}`.toUpperCase();

  const qrCode = await prisma.qrCode.findUnique({
    where: { code },
    select: { code: true },
  })
    .then(async (existing) => {
      if (existing) {
        return updateQrCode(code, {
          qrType: 'join',
          redirectUrl: sessionJoinUrl,
          destinationUrl: sessionJoinUrl,
          ownerId: session.therapistProfileId,
          isDynamic: true,
          expiresAt,
          isActive: true,
        });
      }

      return createQrCode(
        {
          code,
          qrType: 'join',
          redirectUrl: sessionJoinUrl,
          destinationUrl: sessionJoinUrl,
          ownerId: session.therapistProfileId,
          isDynamic: true,
          expiresAt,
        },
        createdById,
      );
    });

  let qrImageBase64: string | null = null;
  try {
    qrImageBase64 = await QRCode.toDataURL(trackingUrl, {
      width: 512,
      margin: 2,
      color: { dark: '#032467', light: '#FFFFFF' },
    });
  } catch {
    qrImageBase64 = null;
  }

  return {
    qrCode: {
      code: qrCode.code,
      qrType: qrCode.qrType,
      destinationUrl: qrCode.destinationUrl,
      ownerId: qrCode.ownerId,
      expiresAt: qrCode.expiresAt,
    },
    sessionId: session.id,
    bookingReferenceId: session.bookingReferenceId,
    uniqueId,
    trackingPath,
    trackingUrl,
    sessionJoinUrl,
    meetingRoomName,
    qrImageBase64,
    expiresAt,
  };
};