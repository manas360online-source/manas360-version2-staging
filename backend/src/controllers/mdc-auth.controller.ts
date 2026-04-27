import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { generateNumericOtp, hashOtp, verifyOtp, hashOpaqueToken } from '../utils/hash';
import { send2FactorOtp } from '../services/otp.service';
import { createAccessToken, createRefreshToken } from '../utils/jwt';
import { env } from '../config/env';
import { randomUUID } from 'crypto';
import * as mdcClinicService from '../services/mdc-clinic.service';

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
  const { clinicCode, role, phone: rawPhone } = req.body;

  if (!clinicCode || !role || !rawPhone) {
    return next(new AppError('Clinic code, role, and phone are required', 400));
  }

  try {
    const phoneCandidates = buildPhoneCandidates(rawPhone);
    
    // 1. Try Staff/Admin
    if (role === 'admin' || role === 'therapist') {
      let staff = await prisma.clinicUser.findFirst({
        where: {
          role,
          clinic: { clinicCode },
          phone: { in: phoneCandidates },
          isActive: true,
        },
      });

      if (staff) {
        const otp = generateNumericOtp(4);
        const otpHash = await hashOtp(otp);

        await prisma.clinicUser.update({
          where: { id: staff.id },
          data: {
            phoneVerificationOtpHash: otpHash,
            phoneVerificationOtpExpiresAt: nowPlusMinutes(env.otpTtlMinutes),
          },
        });

        await send2FactorOtp(rawPhone, otp, 'otp_login');

        return res.json({
          message: 'OTP sent successfully',
          devOtp: env.nodeEnv !== 'production' ? otp : undefined,
        });
      }
    }

    // 2. Try Patient
    if (role === 'patient') {
      let patient = await prisma.clinicPatient.findFirst({
        where: {
          clinic: { clinicCode },
          phone: { in: phoneCandidates },
          status: 'active',
        },
      });

      if (patient) {
        const otp = generateNumericOtp(4);
        const otpHash = await hashOtp(otp);

        await prisma.clinicPatient.update({
          where: { id: patient.id },
          data: {
            phoneVerificationOtpHash: otpHash,
            phoneVerificationOtpExpiresAt: nowPlusMinutes(env.otpTtlMinutes),
          },
        });

        await send2FactorOtp(rawPhone, otp, 'otp_login');

        return res.json({
          message: 'OTP sent successfully',
          devOtp: env.nodeEnv !== 'production' ? otp : undefined,
        });
      }
    }

    return next(new AppError('Invalid login details or account inactive', 401));
  } catch (error) {
    next(error);
  }
};

export const verifyMdcLogin = async (req: Request, res: Response, next: NextFunction) => {
  const { clinicCode, role, phone: rawPhone, otp } = req.body;

  try {
    const phoneCandidates = buildPhoneCandidates(rawPhone);

    // 1. Check Staff
    if (role === 'admin' || role === 'therapist') {
      const staff = await prisma.clinicUser.findFirst({
        where: {
          role,
          clinic: { clinicCode },
          phone: { in: phoneCandidates },
          isActive: true,
        },
        include: { clinic: true },
      });

      if (staff) {
        if (!staff.phoneVerificationOtpHash || !staff.phoneVerificationOtpExpiresAt) {
          return next(new AppError('Invalid verification request', 400));
        }
        if (staff.phoneVerificationOtpExpiresAt < new Date()) {
          return next(new AppError('OTP expired', 400));
        }
        const isValid = await verifyOtp(otp, staff.phoneVerificationOtpHash);
        if (!isValid) return next(new AppError('Invalid OTP', 401));

        await prisma.clinicUser.update({
          where: { id: staff.id },
          data: { phoneVerificationOtpHash: null, phoneVerificationOtpExpiresAt: null },
        });

        const sessionId = randomUUID();
        const refreshJti = randomUUID();
        const accessToken = createAccessToken({
          sub: staff.id,
          sessionId,
          jti: randomUUID(),
          clinicId: staff.clinicId,
          mdcRole: staff.role as any,
          loginCode: staff.loginCode,
        });

        const refreshToken = createRefreshToken({ sub: staff.id, sessionId, jti: refreshJti });
        await prisma.mDCSession.create({
          data: {
            clinicUserId: staff.id,
            jti: refreshJti,
            refreshTokenHash: hashOpaqueToken(refreshToken),
            expiresAt: nowPlusDays(7),
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        });

        const subscription = await prisma.clinicSubscription.findFirst({
          where: { clinicId: staff.clinicId },
          orderBy: { createdAt: 'desc' }
        });

        return res.json({
          accessToken,
          refreshToken,
          user: {
            id: staff.id,
            clinicId: staff.clinicId,
            role: staff.role,
            fullName: staff.fullName,
            clinicName: staff.clinic.name,
            loginCode: staff.loginCode,
            subscriptionStatus: subscription?.status || 'pending',
            selectedFeatures: subscription?.selectedFeatures || [],
          },
        });
      }
    }

    // 2. Check Patient
    if (role === 'patient') {
      const patient = await prisma.clinicPatient.findFirst({
        where: {
          clinic: { clinicCode },
          phone: { in: phoneCandidates },
          status: 'active',
        },
        include: { clinic: true },
      });

      if (patient) {
        if (!patient.phoneVerificationOtpHash || !patient.phoneVerificationOtpExpiresAt) {
          return next(new AppError('Invalid verification request', 400));
        }
        if (patient.phoneVerificationOtpExpiresAt < new Date()) {
          return next(new AppError('OTP expired', 400));
        }
        const isValid = await verifyOtp(otp, patient.phoneVerificationOtpHash);
        if (!isValid) return next(new AppError('Invalid OTP', 401));

        await prisma.clinicPatient.update({
          where: { id: patient.id },
          data: { phoneVerificationOtpHash: null, phoneVerificationOtpExpiresAt: null },
        });

        const accessToken = createAccessToken({
          sub: patient.id,
          sessionId: randomUUID(),
          jti: randomUUID(),
          clinicId: patient.clinicId,
          mdcRole: 'patient',
          loginCode: patient.loginCode,
        });

        return res.json({
          accessToken,
          user: {
            id: patient.id,
            clinicId: patient.clinicId,
            role: 'patient',
            fullName: patient.fullName,
            clinicName: patient.clinic.name,
            loginCode: patient.loginCode,
            subscriptionStatus: 'active',
            selectedFeatures: [],
          },
        });
      }
    }

    return next(new AppError('Invalid login details or account inactive', 401));
  } catch (error) {
    next(error);
  }
};

export const registerClinicRequestOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Create the clinic and the pending admin user
    const clinic = await mdcClinicService.createClinic({
      ...req.body,
      tier: req.body.tier || 'trial',
      billingCycle: req.body.billingCycle || 'monthly',
      selectedFeatures: req.body.selectedFeatures || [],
    });

    const adminUser = await prisma.clinicUser.findFirst({
      where: { clinicId: clinic.id, role: 'admin' },
    });

    if (!adminUser) {
      throw new AppError('Failed to create admin user', 500);
    }

    const otp = generateNumericOtp(4);
    const otpHash = await hashOtp(otp);

    await prisma.clinicUser.update({
      where: { id: adminUser.id },
      data: {
        phoneVerificationOtpHash: otpHash,
        phoneVerificationOtpExpiresAt: nowPlusMinutes(env.otpTtlMinutes),
        verificationStatus: 'pending',
      },
    });

    // Send 2Factor OTP
    await send2FactorOtp(req.body.ownerPhone, otp, 'Registration1');

    res.status(201).json({
      message: 'Clinic created. OTP sent to owner phone.',
      clinicId: clinic.id,
      adminUserId: adminUser.id,
      devOtp: env.nodeEnv !== 'production' ? otp : undefined,
    });
  } catch (error) {
    next(error);
  }
};

export const registerClinicVerifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  const { adminUserId, otp } = req.body;

  try {
    const adminUser = await prisma.clinicUser.findUnique({
      where: { id: adminUserId },
      include: { clinic: true },
    });

    if (!adminUser || !adminUser.phoneVerificationOtpHash || !adminUser.phoneVerificationOtpExpiresAt) {
      return next(new AppError('Invalid verification request', 400));
    }

    if (adminUser.phoneVerificationOtpExpiresAt < new Date()) {
      return next(new AppError('OTP expired', 400));
    }

    const isValid = await verifyOtp(otp, adminUser.phoneVerificationOtpHash);
    if (!isValid) {
      return next(new AppError('Invalid OTP', 401));
    }

    // Mark as verified
    await prisma.clinicUser.update({
      where: { id: adminUser.id },
      data: {
        phoneVerificationOtpHash: null,
        phoneVerificationOtpExpiresAt: null,
        verificationStatus: 'verified',
      },
    });

    res.json({
      message: 'Clinic registration verified successfully',
      clinicCode: adminUser.clinic.clinicCode,
      adminLogin: adminUser.loginCode,
    });
  } catch (error) {
    next(error);
  }
};
