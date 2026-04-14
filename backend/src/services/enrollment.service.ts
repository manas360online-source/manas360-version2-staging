import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { initiatePhonePePayment } from './phonepe.service';
import { env } from '../config/env';

interface EnrollmentInput {
  userId?: string;
  fullName?: string;
  mobile?: string;
  certSlug: string;
  paymentPlan?: 'full' | 'installment';
  installmentCount?: number;
}

const FREE_CERT_SLUGS = new Set([
  'certified-practitioner',
  'certified-asha-mental-wellness-champion',
]);

const providerRoleSet = new Set(['LEARNER', 'THERAPIST', 'PSYCHOLOGIST', 'PSYCHIATRIST', 'COACH']);

const isFreeCertification = (certification: any): boolean => {
  const slug = String(certificateSlug(certification) || '').trim().toLowerCase();
  if (FREE_CERT_SLUGS.has(slug)) return true;

  const priceMinor = Number((certification?.metadata as any)?.priceMinor);
  if (Number.isFinite(priceMinor) && priceMinor <= 0) return true;

  const investmentLabel = String(certification?.investmentLabel || '').toLowerCase();
  if (investmentLabel.includes('free') || investmentLabel.includes('sponsored')) return true;

  return false;
};

const certificateSlug = (certification: any): string => String(certification?.slug || '').trim();

const ensureLearnerProviderIdentity = async (params: {
  userId: string;
  displayName: string;
  certSlug: string;
  markEnrolled: boolean;
  paymentReference?: string | null;
}) => {
  const { userId, displayName, certSlug, markEnrolled, paymentReference } = params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      isTherapistVerified: true,
    },
  });

  if (!user) {
    throw new AppError('User not found for certification enrollment', 404);
  }

  const userRole = String(user.role || '').toUpperCase();
  if (userRole === 'PATIENT') {
    await prisma.user.update({
      where: { id: userId },
      data: {
        role: 'LEARNER',
      },
    });
  } else if (!providerRoleSet.has(userRole)) {
    throw new AppError('This account type cannot enroll in provider certification', 403);
  }

  const existingProfile = await prisma.therapistProfile.findUnique({
    where: { userId },
    select: {
      certifications: true,
      certificationStatus: true,
      leadBoostScore: true,
    },
  });

  const mergedCertifications = Array.from(new Set([
    ...((existingProfile?.certifications as string[] | undefined) || []),
    ...(certSlug ? [certSlug] : []),
  ]));

  if (existingProfile) {
    await prisma.therapistProfile.update({
      where: { userId },
      data: {
        displayName: displayName || 'Learner',
        certifications: mergedCertifications,
        leadBoostScore: Math.max(30, Number(existingProfile.leadBoostScore || 0)),
        ...(markEnrolled
          ? {
              certificationStatus: 'ENROLLED',
              certificationPaymentId: paymentReference || null,
            }
          : {}),
      },
    });
    return;
  }

  await prisma.therapistProfile.create({
    data: {
      userId,
      displayName: displayName || 'Learner',
      onboardingCompleted: false,
      isVerified: false,
      leadBoostScore: 30,
      certifications: certSlug ? [certSlug] : [],
      certificationStatus: markEnrolled ? 'ENROLLED' : 'NONE',
      certificationPaymentId: markEnrolled ? paymentReference || null : null,
    },
  });
};

const normalizePhone = (value: string): string => {
  const compact = String(value || '').trim().replace(/[\s()-]/g, '');
  if (/^\d{10}$/.test(compact)) {
    return `+91${compact}`;
  }
  if (/^91\d{10}$/.test(compact)) {
    return `+${compact}`;
  }
  return compact;
};

export const findOrCreateProviderForCertification = async (input: EnrollmentInput) => {
  const certSlug = String(input.certSlug || '').trim();
  if (!certSlug) {
    throw new AppError('Certification slug is required', 400);
  }

  const requestedMobile = normalizePhone(String(input.mobile || ''));
  const requestedName = String(input.fullName || '').trim();
  const paymentPlan = input.paymentPlan === 'installment' ? 'installment' : 'full';
  const installmentCount = paymentPlan === 'installment'
    ? Math.max(2, Number(input.installmentCount || 3))
    : 1;
  const { userId } = input;

  let targetUserId = userId;
  let targetMobile = requestedMobile;
  let targetName = requestedName;

  // 0. If user is authenticated, treat account as source of truth.
  if (targetUserId) {
    const authenticatedUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, phone: true, name: true, isDeleted: true },
    });

    if (!authenticatedUser || authenticatedUser.isDeleted) {
      throw new AppError('Authenticated user not found', 404);
    }

    targetMobile = normalizePhone(String(authenticatedUser.phone || requestedMobile || ''));
    targetName = String(authenticatedUser.name || requestedName || 'Provider').trim();
  }

  if (!targetMobile) {
    throw new AppError('Mobile number is required', 400);
  }

  // 1. Identity Logic: UserId > Phone Lookup > Create Placeholder
  if (!targetUserId) {
    const existingUser = await prisma.user.findFirst({
      where: { phone: targetMobile, isDeleted: false },
      select: { id: true }
    });

    if (existingUser) {
      targetUserId = existingUser.id;
      logger.info('[Enrollment] Matched existing user by phone', { mobile: targetMobile, userId: targetUserId });
    } else {
      // Create a placeholder user
      const newUser = await prisma.user.create({
        data: {
          phone: targetMobile,
          name: targetName || 'Provider',
          role: 'PATIENT',
          isVerified: false
        }
      });
      targetUserId = newUser.id;
      logger.info('[Enrollment] Created placeholder user', { mobile: targetMobile, userId: targetUserId });
    }
  }

  const existingProfile = await prisma.therapistProfile.findUnique({
    where: { userId: targetUserId as string },
    select: {
      certificationStatus: true,
      certificationPaymentId: true,
      certifications: true,
    },
  });

  const alreadyHasCurrentCertification = Array.isArray(existingProfile?.certifications)
    ? existingProfile!.certifications.includes(certSlug)
    : false;
  const status = String(existingProfile?.certificationStatus || '').toUpperCase();

  if (
    alreadyHasCurrentCertification
    || status === 'ENROLLED'
    || status === 'COMPLETED'
    || status === 'VERIFIED'
  ) {
    throw new AppError('You are already enrolled or certified. Duplicate registration is blocked.', 409, {
      userId: targetUserId,
      certSlug,
      certificationStatus: existingProfile?.certificationStatus,
    });
  }

  // 2. Fetch Certification Details (for pricing)
  const certification = await prisma.certification.findFirst({
    where: { slug: certSlug, isActive: true }
  });

  if (!certification) {
    throw new AppError('Certification not found', 404);
  }

  const freeEnrollment = isFreeCertification(certification);
  const amount = freeEnrollment
    ? 0
    : Number((certification.metadata as any)?.priceMinor || 49900); // Default to 499 if not in metadata

  await ensureLearnerProviderIdentity({
    userId: targetUserId as string,
    displayName: targetName || 'Learner',
    certSlug,
    markEnrolled: freeEnrollment,
    paymentReference: freeEnrollment ? `FREE_${certSlug}_${Date.now()}` : null,
  });

  if (freeEnrollment) {
    return {
      transactionId: `FREE_${certSlug.substring(0, 10)}_${Date.now()}`,
      paymentUrl: null,
      userId: targetUserId,
      enrollmentMode: 'free',
    };
  }

  // 3. Initiate Payment
  const transactionId = `CERT_${certSlug.substring(0, 10)}_${Date.now()}`;
  const baseUrl = env.nodeEnv === 'production' ? 'https://manas360.com' : 'http://localhost:5173';
  
  const paymentResponse = await initiatePhonePePayment({
    transactionId,
    userId: targetUserId as string,
    amountInPaise: amount,
    callbackUrl: `${env.apiUrl}/v1/payments/webhook/phonepe`,
    redirectUrl: `${baseUrl}/#/payment/status?tid=${transactionId}`,
    metadata: {
      userId: targetUserId,
      certSlug: certSlug,
      type: 'CERTIFICATION_ENROLLMENT',
      mobile: targetMobile,
      paymentPlan,
      installmentCount,
    }
  });

  return {
    transactionId,
    paymentUrl: (paymentResponse as any)?.data?.instrumentResponse?.redirectInfo?.url,
    userId: targetUserId,
    enrollmentMode: 'paid',
  };
};
