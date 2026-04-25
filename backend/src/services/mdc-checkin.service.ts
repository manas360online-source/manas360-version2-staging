import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { publishPlaceholderNotificationEvent } from './notification.service';

type MdcCheckInInput = {
  qrCode?: string;
  clinicSlug?: string;
  phone: string;
};

const normalizePhone = (value: string): string => String(value || '').replace(/[^0-9]/g, '');

const buildPhoneCandidates = (raw: string): string[] => {
  const normalized = normalizePhone(raw);
  if (!normalized) return [];

  const last10 = normalized.slice(-10);
  const candidates = new Set<string>([
    normalized,
    last10,
    `91${last10}`,
    `+91${last10}`,
    `0${last10}`,
  ]);

  return Array.from(candidates).filter(Boolean);
};

const resolveQrCode = async (input: MdcCheckInInput) => {
  const qrCodeInput = String(input.qrCode || '').trim();
  const clinicSlug = String(input.clinicSlug || '').trim().toLowerCase();

  if (!qrCodeInput && !clinicSlug) {
    throw new AppError('qrCode or clinicSlug is required', 422);
  }

  if (qrCodeInput) {
    const byCode = await prisma.qrCode.findFirst({
      where: { code: { in: [qrCodeInput, qrCodeInput.toUpperCase()] }, isActive: true },
      select: { code: true, ownerId: true, qrType: true },
    });

    if (byCode) return byCode;
  }

  if (clinicSlug) {
    const fullCode = `checkin_${clinicSlug}`;
    const bySlug = await prisma.qrCode.findFirst({
      where: { code: { in: [fullCode, fullCode.toUpperCase()] }, isActive: true },
      select: { code: true, ownerId: true, qrType: true },
    });

    if (bySlug) return bySlug;
  }

  throw new AppError('Check-in QR not found', 404);
};

export const processMdcCheckIn = async (input: MdcCheckInInput) => {
  const phoneCandidates = buildPhoneCandidates(input.phone);
  if (!phoneCandidates.length) {
    throw new AppError('Valid phone is required', 422);
  }

  const qrCode = await resolveQrCode(input);
  const providerId = String(qrCode.ownerId || '').trim();
  if (!providerId) {
    throw new AppError('Check-in QR is not linked to a provider', 409);
  }

  const patient = await prisma.user.findFirst({
    where: {
      role: 'PATIENT',
      isDeleted: false,
      OR: phoneCandidates.map((phone) => ({ phone })),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      name: true,
      patientProfile: { select: { id: true } },
    },
  });

  if (!patient?.patientProfile?.id) {
    return {
      status: 'not_found',
      message: 'No patient record found for this phone number',
      qrCode: qrCode.code,
    };
  }

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const session = await prisma.therapySession.findFirst({
    where: {
      therapistProfileId: providerId,
      patientProfileId: patient.patientProfile.id,
      dateTime: { gte: startOfDay, lte: endOfDay },
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    orderBy: { dateTime: 'asc' },
    select: {
      id: true,
      bookingReferenceId: true,
      dateTime: true,
      status: true,
    },
  });

  const patientName = `${String(patient.firstName || '').trim()} ${String(patient.lastName || '').trim()}`.trim()
    || String(patient.name || 'Patient');

  if (!session) {
    return {
      status: 'no_session',
      message: 'No scheduled session found for today',
      patientName,
      qrCode: qrCode.code,
    };
  }

  await publishPlaceholderNotificationEvent({
    eventType: 'PATIENT_CHECKIN',
    entityType: 'therapy_session',
    entityId: session.id,
    payload: {
      sessionId: session.id,
      providerId,
      patientId: patient.id,
      qrCode: qrCode.code,
      checkInAt: new Date().toISOString(),
    },
    userId: providerId,
    title: 'Patient checked in',
    message: `${patientName} has arrived for the session.`,
  }).catch(() => null);

  await prisma.qrConversion.create({
    data: {
      qrCodeCode: qrCode.code,
      conversionType: 'checkin_completed',
      attributedRevenue: 0,
      conversionData: {
        providerId,
        patientId: patient.id,
        sessionId: session.id,
      },
      conversionAt: new Date(),
    },
  }).catch(() => null);

  return {
    status: 'checked_in',
    message: 'Patient checked in successfully',
    patientName,
    qrCode: qrCode.code,
    session: {
      id: session.id,
      bookingReferenceId: session.bookingReferenceId,
      scheduledAt: session.dateTime,
      status: session.status,
    },
  };
};
