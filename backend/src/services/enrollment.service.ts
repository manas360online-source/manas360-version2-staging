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
  bypassPayment?: boolean;
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
  paymentPlan?: 'full' | 'installment';
  totalAmount?: number;
  paymentReference?: string | null;
}) => {
  const { userId, displayName, certSlug, markEnrolled, paymentReference, paymentPlan, totalAmount } = params;

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

  // Ensure Enrollment record exists
  const enrollment = await prisma.certificationEnrollment.findUnique({
    where: { userId_certificationSlug: { userId, certificationSlug: certSlug } }
  });

  if (!enrollment) {
    await prisma.certificationEnrollment.create({
      data: {
        userId,
        certificationSlug: certSlug,
        status: markEnrolled ? 'ENROLLED' : 'NONE',
        paymentPlan: (paymentPlan || 'full').toUpperCase() as any,
        totalAmount: totalAmount || 0,
        amountPaid: markEnrolled ? totalAmount || 0 : 0,
        certId: paymentReference || null,
      }
    });
  } else if (markEnrolled) {
    await prisma.certificationEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: 'ENROLLED',
        certId: paymentReference || enrollment.certId,
        amountPaid: totalAmount || enrollment.amountPaid,
      }
    });
  }

  // Sync with TherapistProfile
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
        // We keep these for legacy compatibility/latest cert tracking
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

  const existingEnrollment = await prisma.certificationEnrollment.findUnique({
    where: { userId_certificationSlug: { userId: targetUserId as string, certificationSlug: certSlug } },
    select: { status: true }
  });

  if (existingEnrollment && (existingEnrollment.status === 'ENROLLED' || existingEnrollment.status === 'PAID' || existingEnrollment.status === 'COMPLETED' || existingEnrollment.status === 'VERIFIED')) {
    throw new AppError('You are already enrolled or certified in this program.', 409, {
      userId: targetUserId,
      certSlug,
      status: existingEnrollment.status,
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
  const hasPhonePeOAuth = process.env.PHONEPE_CLIENT_ID && process.env.PHONEPE_CLIENT_SECRET && !String(process.env.PHONEPE_CLIENT_ID).includes('change-');
  const allowBypassPayment = (Boolean(input.bypassPayment) || (env.allowDevPaymentBypass && !hasPhonePeOAuth)) && env.nodeEnv !== 'production' && Boolean(userId);
  const shouldMarkEnrolledNow = freeEnrollment || allowBypassPayment;
  const amount = freeEnrollment
    ? 0
    : Number((certification.metadata as any)?.priceMinor || 49900); // Default to 499 if not in metadata

  const amountToCharge = paymentPlan === 'installment' ? Math.ceil(amount / 3) : amount;

  await ensureLearnerProviderIdentity({
    userId: targetUserId as string,
    displayName: targetName || 'Learner',
    certSlug,
    markEnrolled: shouldMarkEnrolledNow,
    paymentPlan,
    totalAmount: amount,
    paymentReference: shouldMarkEnrolledNow ? `${allowBypassPayment ? 'BYPASS' : 'FREE'}_${certSlug}_${Date.now()}` : null,
  });

  if (freeEnrollment) {
    return {
      transactionId: `FREE_${certSlug.substring(0, 10)}_${Date.now()}`,
      paymentUrl: null,
      userId: targetUserId,
      enrollmentMode: 'free',
    };
  }

  if (allowBypassPayment) {
    return {
      transactionId: `BYPASS_${certSlug.substring(0, 10)}_${Date.now()}`,
      paymentUrl: null,
      userId: targetUserId,
      enrollmentMode: 'bypassed',
    };
  }

  // 3. Initiate Payment
  const transactionId = `CERT_${certSlug.substring(0, 10)}_${Date.now()}`;
  const baseUrl = env.nodeEnv === 'production' ? 'https://manas360.com' : 'http://localhost:5173';
  
  const metadata = {
    userId: targetUserId,
    certSlug: certSlug,
    type: 'CERTIFICATION_ENROLLMENT',
    mobile: targetMobile,
    paymentPlan,
    installmentCount,
  };

  const paymentResponse = await initiatePhonePePayment({
    transactionId,
    userId: targetUserId as string,
    amountInPaise: amountToCharge,
    callbackUrl: `${env.apiUrl}/v1/payments/phonepe/webhook`,
    redirectUrl: `${baseUrl}/#/payment/status?tid=${transactionId}`,
    metadata,
  });

  // Mandatory: Create financialPayment record for reconciliation worker and webhook tracking
  await (prisma as any).financialPayment.create({
    data: {
      merchantTransactionId: transactionId,
      patientId: targetUserId,
      amountMinor: BigInt(amountToCharge),
      currency: 'INR',
      status: 'INITIATED',
      metadata,
    }
  }).catch((err: any) => {
    logger.error('[Enrollment] Failed to create financialPayment record', { transactionId, error: err.message });
  });

  return {
    transactionId,
    paymentUrl: paymentResponse, // initiatePhonePePayment returns the URL directly
    userId: targetUserId,
    enrollmentMode: 'paid',
  };
};
