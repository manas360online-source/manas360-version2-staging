import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { generateNumericOtp, hashOtp, verifyOtp, hashOpaqueToken } from '../utils/hash';
import { createAccessToken, createRefreshToken } from '../utils/jwt';
import { env } from '../config/env';
import { randomBytes, randomUUID } from 'crypto';
import { sendWhatsAppMessage } from '../services/whatsapp.service';

const nowPlusMinutes = (minutes: number): Date => new Date(Date.now() + minutes * 60 * 1000);
const nowPlusDays = (days: number): Date => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

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

export const initiateMdcLogin = async (req: Request, res: Response, next: NextFunction) => {
  const { clinicCode, loginSuffix, phone: rawPhone } = req.body;

  if (!clinicCode || !loginSuffix || !rawPhone) {
    return next(new AppError('Clinic code, login suffix, and phone are required', 400));
  }

  try {
    const phoneCandidates = buildPhoneCandidates(rawPhone);
    const loginCode = `${clinicCode}-${loginSuffix}`;
    const clinicUser = await prisma.clinicUser.findFirst({
      where: {
        loginCode,
        phone: { in: phoneCandidates },
        isActive: true,
      },
      include: {
        clinic: true,
      },
    });

    if (!clinicUser) {
      return next(new AppError('Invalid login details or account inactive', 401));
    }

    const otp = generateNumericOtp();
    const otpHash = await hashOtp(otp);

    await prisma.clinicUser.update({
      where: { id: clinicUser.id },
      data: {
        phoneVerificationOtpHash: otpHash,
        phoneVerificationOtpExpiresAt: nowPlusMinutes(env.otpTtlMinutes),
      },
    });

    // Send WhatsApp OTP (non-blocking)
    sendWhatsAppMessage({
      phoneNumber: rawPhone,
      templateType: 'user_otp_login',
      userType: 'user',
      templateVariables: { otp },
      language: 'en',
    }).catch(console.error);

    res.json({
      message: 'OTP sent successfully',
      devOtp: env.nodeEnv !== 'production' ? otp : undefined,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyMdcLogin = async (req: Request, res: Response, next: NextFunction) => {
  const { clinicCode, loginSuffix, phone: rawPhone, otp } = req.body;

  try {
    const phoneCandidates = buildPhoneCandidates(rawPhone);
    const loginCode = `${clinicCode}-${loginSuffix}`;
    const clinicUser = await prisma.clinicUser.findFirst({
      where: {
        loginCode,
        phone: { in: phoneCandidates },
        isActive: true,
      },
      include: {
        clinic: true,
      },
    });

    if (!clinicUser || !clinicUser.phoneVerificationOtpHash || !clinicUser.phoneVerificationOtpExpiresAt) {
      return next(new AppError('Invalid verification request', 400));
    }

    if (clinicUser.phoneVerificationOtpExpiresAt < new Date()) {
      return next(new AppError('OTP expired', 400));
    }

    const isValid = await verifyOtp(otp, clinicUser.phoneVerificationOtpHash);
    if (!isValid) {
      return next(new AppError('Invalid OTP', 401));
    }

    // Clear OTP
    await prisma.clinicUser.update({
      where: { id: clinicUser.id },
      data: {
        phoneVerificationOtpHash: null,
        phoneVerificationOtpExpiresAt: null,
      },
    });

    // Issue MDC-specific JWT
    const sessionId = randomUUID();
    const refreshJti = randomUUID();
    const accessJti = randomUUID();

    const accessToken = createAccessToken({
      sub: clinicUser.id,
      sessionId,
      jti: accessJti,
      clinicId: clinicUser.clinicId,
      mdcRole: clinicUser.role as any,
      loginCode: clinicUser.loginCode,
    });

    const refreshToken = createRefreshToken({
      sub: clinicUser.id,
      sessionId,
      jti: refreshJti,
    });

    const refreshTokenHash = hashOpaqueToken(refreshToken);

    await prisma.mDCSession.create({
      data: {
        clinicUserId: clinicUser.id,
        jti: refreshJti,
        refreshTokenHash,
        expiresAt: nowPlusDays(7),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    // Fetch clinic features from active subscription
    const subscription = await prisma.clinicSubscription.findFirst({
      where: {
        clinicId: clinicUser.clinicId,
        status: { in: ['trial', 'active'] },
      },
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: clinicUser.id,
        clinicId: clinicUser.clinicId,
        role: clinicUser.role,
        fullName: clinicUser.fullName,
        clinicName: clinicUser.clinic.name,
        loginCode: clinicUser.loginCode,
        selectedFeatures: subscription?.selectedFeatures || [],
      },
    });
  } catch (error) {
    next(error);
  }
};
