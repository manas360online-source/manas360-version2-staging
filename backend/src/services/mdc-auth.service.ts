import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { generateNumericOtp, hashOtp, verifyOtp } from '../utils/hash';
import { createTokenPair } from '../utils/jwt';
import { env } from '../config/env';

export const requestLoginOtp = async (loginCode: string, phone: string) => {
  const staff = await prisma.clinicUser.findUnique({
    where: { loginCode },
    include: { clinic: true }
  });

  if (!staff || !staff.isActive) {
    throw new AppError('Invalid login code or account inactive', 404);
  }

  if (staff.phone !== phone) {
    throw new AppError('Phone number does not match registered staff phone', 400);
  }

  const otp = generateNumericOtp();
  const otpHash = await hashOtp(otp);

  await prisma.clinicUser.update({
    where: { id: staff.id },
    data: {
      phoneVerificationOtpHash: otpHash,
      phoneVerificationOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
    }
  });

  // In a real app, send SMS/WhatsApp here.
  // For testing, we return it in dev mode.
  return {
    message: 'OTP sent to your registered phone',
    devOtp: env.nodeEnv !== 'production' ? otp : undefined,
  };
};

export const verifyLoginOtp = async (loginCode: string, otp: string) => {
  const staff = await prisma.clinicUser.findUnique({
    where: { loginCode },
    include: { clinic: true }
  });

  if (!staff || !staff.phoneVerificationOtpHash || !staff.phoneVerificationOtpExpiresAt) {
    throw new AppError('Invalid verification request', 400);
  }

  if (staff.phoneVerificationOtpExpiresAt < new Date()) {
    throw new AppError('OTP expired', 400);
  }

  const isValid = await verifyOtp(otp, staff.phoneVerificationOtpHash);
  if (!isValid) {
    throw new AppError('Invalid OTP', 400);
  }

  // Clear OTP
  await prisma.clinicUser.update({
    where: { id: staff.id },
    data: {
      phoneVerificationOtpHash: null,
      phoneVerificationOtpExpiresAt: null,
    }
  });

  // Generate tokens
  // We use staff.id as the subject (sub)
  // We don't have a 'session' table for MDC yet, so we'll just use a random UUID for sessionId
  const sessionId = `mdc_sess_${Date.now()}`;
  
  // Permissions for MDC roles
  const permissions: Record<string, boolean> = staff.role === 'admin' 
    ? { mdc_admin: true, mdc_therapist: true } 
    : { mdc_therapist: true };

  const tokens = createTokenPair(staff.id, sessionId, permissions);

  return {
    tokens,
    user: {
      id: staff.id,
      fullName: staff.fullName,
      role: staff.role,
      clinicId: staff.clinicId,
      clinicCode: staff.clinic.clinicCode,
      loginCode: staff.loginCode,
    }
  };
};
