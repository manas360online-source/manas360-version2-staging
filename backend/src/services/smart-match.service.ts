import { prisma } from '../config/db';
import crypto from 'crypto';
import { AppError } from '../middleware/error.middleware';
import { User, UserRole } from '@prisma/client';
import { isSubscriptionValidForMatching } from './subscription.helper';
import { env } from '../config/env';
import { initiatePhonePePayment, checkPhonePeStatus } from './phonepe.service';
import { assertPatientHasCompletedBothPHQandGAD7 } from './patient-v1.service';
import { hasAcceptedNriTerms } from './legal-compliance.service';
import { hasNriProviderCapability, scoreProviderMatch } from './provider-match.engine';

const REQUEST_EXPIRY_HOURS = 24;
const ACTIVE_SESSION_STATUSES = ['PENDING', 'CONFIRMED'] as const;

const buildSmartMatchBookingReference = () =>
  `SM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const getSmartMatchSlotLockKey = (scope: 'provider' | 'patient', id: string, scheduledAt: Date): bigint => {
  const digest = crypto
    .createHash('sha256')
    .update(`${scope}:${id}:${scheduledAt.toISOString()}`)
    .digest();
  return digest.readBigInt64BE(0);
};

// Default fallback session prices (in minor units, e.g., 699 * 100 = ₹699.00)
const DEFAULT_SESSION_QUOTE = {
  THERAPIST: 699 * 100,
  PSYCHOLOGIST: 999 * 100,
  PSYCHIATRIST: 1499 * 100,
};

interface AvailabilityPrefs {
  daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
  timeSlots: Array<{ startMinute: number; endMinute: number }>;
}

interface ProviderMatch {
  id: string;
  name: string;
  displayName?: string;
  providerType: string;
  profileId?: string;
  consultationFee?: number;
  specializations?: string[];
  averageRating?: number;
  availability?: string;
  score?: number;
  tier?: 'HOT' | 'WARM' | 'COLD';
  matchBand?: 'PLATINUM' | 'HOT' | 'WARM' | 'COLD';
  matchChancePct?: number;
  breakdown?: {
    expertise: number;
    communication: number;
    quality: number;
  };
  providerSubscriptionStatus?: string;
  providerSubscriptionGraceEndDate?: string | null;
  audit?: {
    subscriptionStatus: {
      patient: string;
      provider: string;
    };
    quota: {
      used: number;
      limit: number;
    };
    contextMultiplier: {
      expertise: number;
      communication: number;
      quality: number;
    };
    graceEndDate: {
      patient: string | null;
      provider: string | null;
    };
  };
}

type MatchContext = 'Standard' | 'Corporate' | 'Night' | 'Buddy' | 'Crisis';

interface SmartMatchCriteria {
  concerns?: string[];
  languages?: string[];
  modes?: string[];
  context?: MatchContext;
  patientUserId?: string;
  presetEntryType?: string;
  timezoneRegion?: string;
  sourceFunnel?: string;
  selectedDate?: string;
  // Hard filters applied before scoring
  providerTypeFilter?: string;
  specializationRequired?: string[];
  credentialFilter?: string[];
  sessionTypeFilter?: string[];
}

type NriPresetEntryType = 'nri_psychologist' | 'nri_psychiatrist' | 'nri_therapist';

const NRI_PROVIDER_TYPE_BY_ENTRY: Record<NriPresetEntryType, string> = {
  nri_psychologist: 'psychologist',
  nri_psychiatrist: 'psychiatrist',
  nri_therapist: 'therapist',
};

const NRI_TIMEZONE_TO_SHIFT: Record<string, string> = {
  US_EST: 'shift_a_us_east',
  US_PST: 'shift_b_us_west',
  UK: 'shift_c_uk',
  AU: 'shift_d_au_sg',
  SG: 'shift_d_au_sg',
  UAE: 'shift_e_uae',
  OTHER: 'shift_a_us_east',
};

const isNriPresetEntryType = (value?: string | null): value is NriPresetEntryType =>
  value === 'nri_psychologist' || value === 'nri_psychiatrist' || value === 'nri_therapist';

/**
 * Resolves the session quote (in minor units) by looking up the pricing config.
 * For NRI entry types, looks up prices by NRI provider type (e.g., 'nri_psychologist').
 * Falls back to provider type pricing, then default pricing.
 */
const resolveSessionQuoteMinor = async (
  providerType?: string | null,
  presetEntryType?: string | null,
): Promise<number> => {
  const pricingConfig = await (await import('./pricing.service')).getPricingConfig();
  const sessionPricing = pricingConfig.sessionPricing || [];

  // If NRI entry type, look up pricing by NRI provider type
  if (isNriPresetEntryType(presetEntryType)) {
    const nriProviderType = NRI_PROVIDER_TYPE_BY_ENTRY[presetEntryType];
    const nriPrice = sessionPricing.find((s) => {
      const configuredType = String(s.providerType || '').toLowerCase();
      return configuredType === String(presetEntryType || '').toLowerCase()
        || configuredType === String(nriProviderType || '').toLowerCase();
    });
    if (nriPrice && Number.isFinite(nriPrice.price) && nriPrice.price > 0) {
      return nriPrice.price * 100;
    }
  }

  // Look up by provider type
  if (providerType) {
    const price = sessionPricing.find(
      (s) => String(s.providerType || '').toLowerCase() === String(providerType || '').toLowerCase(),
    );
    if (price && Number.isFinite(price.price) && price.price > 0) {
      return price.price * 100;
    }
  }

  // Fallback to default prices by provider type
  const normalized = String(providerType || 'THERAPIST').toUpperCase();
  return DEFAULT_SESSION_QUOTE[normalized as keyof typeof DEFAULT_SESSION_QUOTE] || DEFAULT_SESSION_QUOTE.THERAPIST;
};

const normalizeSourceFunnel = (value?: string | null): string | null => {
  const normalized = String(value || '').trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '_').slice(0, 30);
  return normalized || null;
};

type AvailabilitySlot = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  isAvailable?: boolean;
};

const CONTEXT_MULTIPLIERS: Record<MatchContext, { expertise: number; communication: number; quality: number }> = {
  Standard: { expertise: 1.0, communication: 1.0, quality: 1.0 },
  Corporate: { expertise: 1.2, communication: 1.0, quality: 0.8 },
  Night: { expertise: 0.8, communication: 1.5, quality: 0.7 },
  Buddy: { expertise: 0.5, communication: 1.8, quality: 0.7 },
  Crisis: { expertise: 1.0, communication: 1.5, quality: 0.5 },
};

const isFreeLikePlan = (planName?: string | null, price?: number | null): boolean =>
  Number(price || 0) <= 0 || String(planName || '').toLowerCase().includes('free');

const normalizeToken = (value: string): string =>
  String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ');

const getWeekStartMonday = (base = new Date()): Date => {
  const date = new Date(base);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const mapTierFromScore = (score: number): 'HOT' | 'WARM' | 'COLD' => {
  if (score >= 85) return 'HOT';
  if (score >= 70) return 'HOT';
  if (score >= 50) return 'WARM';
  return 'COLD';
};

const mapBandFromScore = (score: number): 'PLATINUM' | 'HOT' | 'WARM' | 'COLD' => {
  if (score >= 85) return 'PLATINUM';
  if (score >= 70) return 'HOT';
  if (score >= 50) return 'WARM';
  return 'COLD';
};

const assertPatientSmartMatchEligibility = async (patientUserId: string): Promise<{ status: string; planName: string; price: number; graceEndDate: string | null }> => {
  const subscription = await prisma.patientSubscription.findUnique({
    where: { userId: patientUserId },
    select: { status: true, planName: true, price: true, metadata: true },
  });

  if (!subscription || !isSubscriptionValidForMatching(subscription)) {
    throw new AppError('Active subscription required to use smart matching', 403);
  }

  return {
    status: subscription.status,
    planName: String(subscription.planName || ''),
    price: Number(subscription.price || 0),
    graceEndDate: subscription?.metadata?.graceEndDate ? String(subscription.metadata.graceEndDate) : null,
  };
};

const mapLeadTier = (tier: 'HOT' | 'WARM' | 'COLD'): 'EXCLUSIVE' | 'PRIORITY' | 'STANDARD' => {
  if (tier === 'HOT') return 'EXCLUSIVE';
  if (tier === 'WARM') return 'PRIORITY';
  return 'STANDARD';
};

// Convert day/time preferences to a readable format
const formatAvailabilityPrefs = (prefs: AvailabilityPrefs): string => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const days = prefs.daysOfWeek.map((d) => dayNames[d]).join(', ');
  const times = prefs.timeSlots.map((t) => {
    const startHour = Math.floor(t.startMinute / 60);
    const endHour = Math.floor(t.endMinute / 60);
    return `${String(startHour).padStart(2, '0')}:00-${String(endHour).padStart(2, '0')}:00`;
  });
  return `${days} (${times.join(', ')})`;
};

export const hasSmartMatchAvailabilityOverlap = (
  availabilityPrefs: AvailabilityPrefs,
  therapistAvailability: AvailabilitySlot[],
): boolean => {
  return availabilityPrefs.daysOfWeek.some((reqDay) =>
    availabilityPrefs.timeSlots.some((reqTime) =>
      therapistAvailability.some((slot: AvailabilitySlot) => {
        return (
          slot.dayOfWeek === reqDay &&
          (slot.isAvailable ?? true) &&
          isTimeOverlap(reqTime.startMinute, reqTime.endMinute, slot.startMinute, slot.endMinute)
        );
      }),
    ),
  );
};

const ACTIVE_BOOKING_STATUSES = ['PENDING', 'CONFIRMED'] as const;

const parseSelectedDate = (value?: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

// Query providers who match the requested availability
export const findMatchingProviders = async (
  availabilityPrefs: AvailabilityPrefs,
  providerType?: string,
  limit: number = 10,
  criteria?: SmartMatchCriteria,
): Promise<ProviderMatch[]> => {
  let patientSubscriptionSnapshot: Awaited<ReturnType<typeof assertPatientSmartMatchEligibility>> | null = null;
  if (criteria?.patientUserId) {
    patientSubscriptionSnapshot = await assertPatientSmartMatchEligibility(criteria.patientUserId);
  }

  const context = criteria?.context || 'Standard';
  const isNriPresetFlow = isNriPresetEntryType(criteria?.presetEntryType);
  const nriProviderType = isNriPresetFlow ? NRI_PROVIDER_TYPE_BY_ENTRY[criteria!.presetEntryType as NriPresetEntryType] : null;
  const timezoneRegion = String(criteria?.timezoneRegion || '').trim().toUpperCase();
  const requiredNriShift = isNriPresetFlow && timezoneRegion
    ? NRI_TIMEZONE_TO_SHIFT[timezoneRegion] || NRI_TIMEZONE_TO_SHIFT.OTHER
    : null;
  const contextMultiplier = CONTEXT_MULTIPLIERS[context] || CONTEXT_MULTIPLIERS.Standard;
  const requestedConcerns = (criteria?.concerns || []).map(normalizeToken).filter(Boolean);
  const requestedLanguages = (criteria?.languages || []).map(normalizeToken).filter(Boolean);
  const requestedModes = (criteria?.modes || []).map(normalizeToken).filter(Boolean);
  const isNriUser = criteria?.patientUserId ? await hasAcceptedNriTerms(criteria.patientUserId).catch(() => false) : false;
  const weekStart = getWeekStartMonday();

  const eligibleProviderSubscriptions = await prisma.providerSubscription.findMany({
    where: {
      expiryDate: { gt: new Date() },
      plan: { notIn: ['free', 'FREE'] as any },
    },
    select: {
      providerId: true,
      leadsPerWeek: true,
      bonusLeads: true,
      leadsUsedThisWeek: true,
      weekStartsAt: true,
      plan: true,
      status: true,
      metadata: true,
    },
  });
  const eligibleProviderIds = new Set(
    eligibleProviderSubscriptions
      .filter((s) => {
        if (!isSubscriptionValidForMatching(s)) return false;
        const startsAt = s.weekStartsAt ? new Date(s.weekStartsAt) : null;
        const usedThisWeek = startsAt && startsAt.getTime() >= weekStart.getTime() ? Number(s.leadsUsedThisWeek || 0) : 0;
        const allowedLeads = Number(s.leadsPerWeek || 0) + Number((s as any).bonusLeads || 0);
        return allowedLeads > usedThisWeek;
      })
      .map((s) => String(s.providerId)),
  );
  const subscriptionByProviderId = new Map<string, (typeof eligibleProviderSubscriptions)[number]>(
    eligibleProviderSubscriptions.map((sub) => [String(sub.providerId), sub] as const),
  );

  if (!eligibleProviderIds.size) return [];

  let patientProfileId: string | null = null;
  if (criteria?.patientUserId) {
    const patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: criteria.patientUserId },
      select: { id: true },
    });
    patientProfileId = patientProfile?.id || null;
  }

  // Find all active therapist profiles
  const therapists = await prisma.therapistProfile.findMany({
    where: {
      userId: { in: Array.from(eligibleProviderIds) },
      user: {
        isDeleted: false,
        status: 'ACTIVE',
        ...(providerType && { providerType: providerType as any }),
      },
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          providerType: true,
          isDeleted: true,
        },
      },
    },
    take: Math.max(limit, 20),
  });

  const providerIds = therapists.map((t) => String(t.userId));
  const selectedDate = parseSelectedDate(criteria?.selectedDate);
  const dayStart = selectedDate
    ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0, 0)
    : null;
  const dayEnd = dayStart
    ? new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 1, 0, 0, 0, 0)
    : null;

  const providerConflictsById = new Set<string>();
  if (providerIds.length > 0 && dayStart && dayEnd) {
    const bookedSessions = await prisma.therapySession.findMany({
      where: {
        therapistProfileId: { in: providerIds },
        status: { in: ACTIVE_BOOKING_STATUSES as any },
        dateTime: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
      select: {
        therapistProfileId: true,
        dateTime: true,
        durationMinutes: true,
      },
    });

    for (const session of bookedSessions) {
      const startsAt = new Date(session.dateTime);
      const startMinute = startsAt.getHours() * 60 + startsAt.getMinutes();
      const duration = Math.max(1, Number(session.durationMinutes || 50));
      const endMinute = startMinute + duration;

      const overlapsRequestedSlot = availabilityPrefs.timeSlots.some((slot) =>
        isTimeOverlap(slot.startMinute, slot.endMinute, startMinute, endMinute),
      );

      if (overlapsRequestedSlot) {
        providerConflictsById.add(String(session.therapistProfileId));
      }
    }
  }

  const nriEligibilityByProviderId = new Map<string, { certified: boolean; shifts: string[] }>();

  if (isNriPresetFlow && providerIds.length > 0) {
    const nriRows = await prisma.$queryRawUnsafe(
      `SELECT "userId", "nri_pool_certified", "nri_timezone_shifts"
       FROM "therapist_profiles"
       WHERE "userId" = ANY($1::uuid[])`,
      providerIds,
    ) as Array<{ userId: string; nri_pool_certified: boolean; nri_timezone_shifts: string[] | null }>;

    for (const row of nriRows || []) {
      nriEligibilityByProviderId.set(String(row.userId), {
        certified: Boolean(row.nri_pool_certified),
        shifts: Array.isArray(row.nri_timezone_shifts) ? row.nri_timezone_shifts.map((s) => String(s || '').trim()).filter(Boolean) : [],
      });
    }
  }

  const providerSessions = providerIds.length
    ? await prisma.therapySession.findMany({
        where: { therapistProfileId: { in: providerIds } },
        select: {
          therapistProfileId: true,
          status: true,
          patientProfileId: true,
        },
      })
    : [];

  const qualityMap = new Map<string, { total: number; completed: number; cancelled: number }>();
  const continuityMap = new Map<string, number>();

  for (const session of providerSessions) {
    const providerIdKey = String(session.therapistProfileId);
    const aggregate = qualityMap.get(providerIdKey) || { total: 0, completed: 0, cancelled: 0 };
    aggregate.total += 1;
    const status = String(session.status || '').toUpperCase();
    if (status === 'COMPLETED') aggregate.completed += 1;
    if (status === 'CANCELLED') aggregate.cancelled += 1;
    qualityMap.set(providerIdKey, aggregate);

    if (patientProfileId && String(session.patientProfileId) === patientProfileId) {
      continuityMap.set(providerIdKey, Number(continuityMap.get(providerIdKey) || 0) + 1);
    }
  }

  const matches: ProviderMatch[] = therapists
    .filter((t) => {
      if (!eligibleProviderIds.has(String(t.userId))) return false;
      if (providerConflictsById.has(String(t.userId))) return false;

      if (isNriUser && !hasNriProviderCapability(t)) return false;

      if (!t.availability) return false;

      try {
        const slots = t.availability as any;
        if (!Array.isArray(slots)) return false;

        return hasSmartMatchAvailabilityOverlap(availabilityPrefs, slots as AvailabilitySlot[]);
      } catch {
        return false;
      }
    })
    .map((t) => {
      const qualityStats = qualityMap.get(String(t.userId)) || { total: 0, completed: 0, cancelled: 0 };
      const continuitySessions = Number(continuityMap.get(String(t.userId)) || 0);
      const match = scoreProviderMatch({
        providerId: String(t.userId),
        profile: {
          specializations: t.specializations || [],
          clinicalCategories: t.clinicalCategories || [],
          certifications: t.certifications || [],
          certificationStatus: (t as any).certificationStatus || null,
          leadBoostScore: Number((t as any).leadBoostScore || 0),
          languages: t.languages || [],
          shiftPreferences: t.shiftPreferences || [],
          availability: (t.availability as any) || [],
          bio: t.bio || '',
          averageRating: t.averageRating || 0,
        },
        context,
        requestedConcerns,
        requestedLanguages,
        requestedModes,
        availabilityPrefs,
        qualityStats,
        continuitySessions,
        isNriUser,
      });

      if (!match) return null;

      const providerSubscription = subscriptionByProviderId.get(String(t.userId));
      const providerWeekStart = providerSubscription?.weekStartsAt ? new Date(providerSubscription.weekStartsAt) : null;
      const usedThisWeek = providerWeekStart && providerWeekStart.getTime() >= weekStart.getTime()
        ? Number(providerSubscription?.leadsUsedThisWeek || 0)
        : 0;
      const quotaLimit = Number(providerSubscription?.leadsPerWeek || 0) + Number(providerSubscription?.bonusLeads || 0);
      const providerGraceEndDate = providerSubscription?.metadata?.graceEndDate
        ? String(providerSubscription.metadata.graceEndDate)
        : null;

      return {
        id: t.userId,
        name: `${t.user.firstName} ${t.user.lastName}`.trim(),
        displayName: t.displayName,
        providerType: t.user.providerType as any,
        profileId: t.id,
        consultationFee: t.consultationFee || 0,
        specializations: t.specializations || [],
        averageRating: t.averageRating || 0,
        score: match.score,
        tier: match.tier,
        matchBand: match.matchBand,
        matchChancePct: match.matchChancePct,
        breakdown: {
          expertise: match.breakdown.expertise,
          communication: match.breakdown.communication,
          quality: match.breakdown.quality,
        },
        providerSubscriptionStatus: String(providerSubscription?.status || ''),
        providerSubscriptionGraceEndDate: providerGraceEndDate,
        audit: {
          subscriptionStatus: {
            patient: patientSubscriptionSnapshot?.status || 'unknown',
            provider: String(providerSubscription?.status || ''),
          },
          quota: {
            used: usedThisWeek,
            limit: quotaLimit,
          },
          contextMultiplier,
          graceEndDate: {
            patient: patientSubscriptionSnapshot?.graceEndDate || null,
            provider: providerGraceEndDate,
          },
        },
      };
    })
    .filter((entry): entry is ProviderMatch => Boolean(entry))
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));

  return matches.slice(0, Math.max(1, limit));
};

// Helper to check if two time slots overlap
const isTimeOverlap = (
  start1: number,
  end1: number,
  start2: number,
  end2: number,
): boolean => {
  return start1 < end2 && end1 > start2;
};

interface CreateAppointmentRequestInput {
  patientId: string;
  availabilityPrefs: AvailabilityPrefs;
  providerIds: string[]; // up to 3 provider IDs
  sourceFunnel?: string;
  presetEntryType?: string;
  timezoneRegion?: string;
  preferredSpecialization?: string;
  durationMinutes?: number;
  context?: MatchContext;
  concerns?: string[];
  languages?: string[];
  modes?: string[];
  rankedProviders?: Array<{
    providerId: string;
    score?: number;
    tier?: 'HOT' | 'WARM' | 'COLD';
    breakdown?: { expertise: number; communication: number; quality: number };
  }>;
  payment?: {
    merchantTransactionId?: string;
  };
}

const isPhonePePaymentSuccess = (statusResponse: any): boolean => {
  const code = String(statusResponse?.code || '').toUpperCase();
  const state = String(statusResponse?.data?.state || '').toUpperCase();
  return code === 'PAYMENT_SUCCESS' || state === 'COMPLETED';
};

// Create a broadcast appointment request that goes to multiple providers
export const createAppointmentRequest = async (
  input: CreateAppointmentRequestInput,
): Promise<{
  appointmentRequestId: string;
  status: string;
  providers: Array<{ providerId: string; name: string }>;
  message: string;
  paymentRequired?: boolean;
  payment?: {
    merchantTransactionId: string;
    redirectUrl: string;
    amountMinor: number;
    currency: 'INR';
  };
}> => {
  await assertPatientHasCompletedBothPHQandGAD7(input.patientId);

  if (!input.providerIds || input.providerIds.length === 0) {
    throw new AppError('At least one provider must be selected', 422);
  }

  if (input.providerIds.length > 3) {
    throw new AppError('Maximum 3 providers can be selected', 422);
  }

  const patientSubscriptionSnapshot = await assertPatientSmartMatchEligibility(input.patientId);
  const contextMultiplier = CONTEXT_MULTIPLIERS[input.context || 'Standard'] || CONTEXT_MULTIPLIERS.Standard;
  const sourceFunnel = normalizeSourceFunnel(input.sourceFunnel);

  // Validate patient exists
  const patient = await prisma.patientProfile.findUnique({
    where: { userId: input.patientId },
  });
  if (!patient) throw new AppError('Patient profile not found', 404);

  // Validate all providers exist and are active
  const providers = await prisma.user.findMany({
    where: {
      id: { in: input.providerIds },
      isDeleted: false,
      status: 'ACTIVE',
    },
    select: { id: true, firstName: true, lastName: true, providerType: true },
  });

  if (providers.length !== input.providerIds.length) {
    throw new AppError('One or more providers not found or inactive', 404);
  }

  // Resolve session quote (amount) by checking all provider types and taking the maximum
  const quotes = await Promise.all(
    providers.map((provider) => resolveSessionQuoteMinor(provider.providerType, input.presetEntryType)),
  );
  const defaultQuote = await resolveSessionQuoteMinor('THERAPIST', input.presetEntryType);
  const amountMinor = Math.max(...quotes, defaultQuote);

  const merchantTransactionId = String(input.payment?.merchantTransactionId || '').trim();
  if (!merchantTransactionId) {
    const transactionId = `SMREQ_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const callbackUrl = `${env.apiUrl}${env.apiPrefix}/v1/payments/phonepe/webhook`;
    const redirectUrl = `${env.frontendUrl}/#/payment/status?transactionId=${encodeURIComponent(transactionId)}`;
    const phonePeRedirectUrl = await initiatePhonePePayment({
      transactionId,
      userId: input.patientId,
      amountInPaise: amountMinor,
      callbackUrl,
      redirectUrl,
    });

    return {
      appointmentRequestId: '',
      status: 'PAYMENT_REQUIRED',
      providers: providers.map((p) => ({ providerId: p.id, name: `${p.firstName} ${p.lastName}`.trim() })),
      message: 'Payment is required before sending request to providers.',
      paymentRequired: true,
      payment: {
        merchantTransactionId: transactionId,
        redirectUrl: phonePeRedirectUrl,
        amountMinor,
        currency: 'INR',
      },
    };
  }

  const paymentStatus = await checkPhonePeStatus(merchantTransactionId);
  if (!isPhonePePaymentSuccess(paymentStatus)) {
    throw new AppError('Payment not completed. Complete payment first before sending request to providers.', 409);
  }

  const eligibleSubscriptions = await prisma.providerSubscription.findMany({
    where: {
      providerId: { in: input.providerIds },
      expiryDate: { gt: new Date() },
      plan: { notIn: ['free', 'FREE'] as any },
    },
    select: {
      providerId: true,
      plan: true,
      leadsPerWeek: true,
      bonusLeads: true,
      leadsUsedThisWeek: true,
      weekStartsAt: true,
      totalLeadsReceived: true,
      status: true,
      metadata: true,
    },
  });

  const weekStart = getWeekStartMonday();
  const eligibleProviderIds = new Set<string>();
  const quotaIneligible = new Set<string>();
  const subscriptionByProviderId = new Map<string, (typeof eligibleSubscriptions)[number]>();

  for (const subscription of eligibleSubscriptions) {
    const key = String(subscription.providerId);
    if (!isSubscriptionValidForMatching(subscription as any)) {
      continue;
    }
    subscriptionByProviderId.set(key, subscription);
    const startsAt = subscription.weekStartsAt ? new Date(subscription.weekStartsAt) : null;
    const usedThisWeek = startsAt && startsAt.getTime() >= weekStart.getTime()
      ? Number(subscription.leadsUsedThisWeek || 0)
      : 0;
    const allowedLeads = Number(subscription.leadsPerWeek || 0) + Number(subscription.bonusLeads || 0);
    if (allowedLeads <= usedThisWeek) {
      quotaIneligible.add(key);
      continue;
    }
    eligibleProviderIds.add(key);
  }

  const ineligible = input.providerIds.filter((providerId) => {
    const key = String(providerId);
    return !eligibleProviderIds.has(key);
  });
  if (ineligible.length > 0) {
    const quotaBlocked = ineligible.filter((providerId) => quotaIneligible.has(String(providerId)));
    if (quotaBlocked.length > 0) {
      throw new AppError('One or more selected providers reached their weekly lead quota. Please choose different providers.', 422);
    }
    throw new AppError('One or more selected providers cannot receive leads right now. Please select active providers.', 422);
  }

  // Create the appointment request
  const appointmentRequest = await prisma.appointmentRequest.create({
    data: {
      patientId: input.patientId,
      availabilityPrefs: input.availabilityPrefs as any,
      sourceFunnel,
      providers: providers.map((p) => ({
        providerId: p.id,
        name: `${p.firstName} ${p.lastName}`.trim(),
        providerType: p.providerType,
        status: 'PENDING',
        sentAt: new Date(),
      })) as any,
      preferredSpecialization: input.preferredSpecialization,
      durationMinutes: input.durationMinutes || 50,
      status: 'PENDING',
      razorpayOrderId: merchantTransactionId,
      amountMinor: BigInt(amountMinor),
      currency: 'INR',
      expiresAt: new Date(Date.now() + REQUEST_EXPIRY_HOURS * 60 * 60 * 1000),
    } as any,
  });

  const rankedMap = new Map(
    (input.rankedProviders || []).map((entry) => [String(entry.providerId), entry]),
  );

  await prisma.$transaction(async (tx) => {
    for (const provider of providers) {
      const providerId = String(provider.id);
      const ranked = rankedMap.get(providerId);
      const score = Number(ranked?.score || 0);
      const tier = ranked?.tier || mapTierFromScore(score);
      const matchBand = mapBandFromScore(score);
      const subscription = subscriptionByProviderId.get(providerId);
      if (!subscription) continue;

      const startsAt = subscription.weekStartsAt ? new Date(subscription.weekStartsAt) : null;
      const isCurrentWeek = Boolean(startsAt && startsAt.getTime() >= weekStart.getTime());
      const nextUsedCount = (isCurrentWeek ? Number(subscription.leadsUsedThisWeek || 0) : 0) + 1;

      await tx.lead.create({
        data: {
          patientId: input.patientId,
          providerId,
          status: 'PURCHASED',
          matchScore: score || null,
          amountMinor: BigInt(0),
          currency: 'INR',
          idempotencyKey: `${appointmentRequest.id}:${providerId}`,
          channel: 'CONSUMER',
          tier: mapLeadTier(tier),
          visibleAt: new Date(),
          issue: (input.concerns || []).map((item) => normalizeToken(String(item))).filter(Boolean),
          quality: Math.max(0, Math.min(100, score || 0)),
          previewData: {
            type: 'smart_match_v3',
            context: input.context || 'Standard',
            tier,
            matchBand,
            leadType: tier,
            audit: {
              matchedAt: new Date().toISOString(),
              patientSubscriptionStatus: patientSubscriptionSnapshot.status,
              patientPlanName: patientSubscriptionSnapshot.planName,
              patientPlanPrice: patientSubscriptionSnapshot.price,
              providerSubscriptionStatus: String(subscription.status || ''),
              providerPlan: String(subscription.plan || ''),
              providerQuota: Number(subscription.leadsPerWeek || 0) + Number(subscription.bonusLeads || 0),
              providerQuotaUsedAtAssignment: nextUsedCount,
              subscriptionStatus: {
                patient: patientSubscriptionSnapshot.status,
                provider: String(subscription.status || ''),
              },
              quota: {
                used: nextUsedCount,
                limit: Number(subscription.leadsPerWeek || 0) + Number(subscription.bonusLeads || 0),
              },
              contextMultiplier,
              graceEndDate: {
                patient: patientSubscriptionSnapshot.graceEndDate,
                provider: subscription?.metadata?.graceEndDate ? String(subscription.metadata.graceEndDate) : null,
              },
            },
            patientPreferences: {
              concerns: input.concerns || [],
              languages: input.languages || [],
              modes: input.modes || [],
              availabilityPrefs: input.availabilityPrefs,
            },
            breakdown: ranked?.breakdown || undefined,
          },
        },
      });

      await tx.providerSubscription.update({
        where: { providerId },
        data: {
          leadsUsedThisWeek: nextUsedCount,
          totalLeadsReceived: Number(subscription.totalLeadsReceived || 0) + 1,
          weekStartsAt: weekStart,
          lastAssignedAt: new Date(),
        },
      });

      subscriptionByProviderId.set(providerId, {
        ...subscription,
        leadsUsedThisWeek: nextUsedCount,
        weekStartsAt: weekStart,
        totalLeadsReceived: Number(subscription.totalLeadsReceived || 0) + 1,
      });
    }
  });

  // Persist in-app notifications so selected providers can see incoming requests.
  await prisma.notification.createMany({
    data: providers.map((provider) => ({
      userId: String(provider.id),
      type: 'SMART_MATCH_APPOINTMENT_REQUEST',
      title: 'New smart-match appointment request',
      message: 'A patient has requested a session. Review and accept this request to lock the booking.',
      payload: {
        appointmentRequestId: appointmentRequest.id,
        patientId: input.patientId,
        preferredSpecialization: input.preferredSpecialization || null,
        availabilityPrefs: input.availabilityPrefs,
        durationMinutes: input.durationMinutes || 50,
        requestStatus: 'PENDING',
      },
      sentAt: new Date(),
    })),
  }).catch(() => null);

  return {
    appointmentRequestId: appointmentRequest.id,
    status: appointmentRequest.status,
    providers: providers.map((p) => ({
      providerId: p.id,
      name: `${p.firstName} ${p.lastName}`.trim(),
    })),
    message: `Payment verified. Request sent to ${input.providerIds.length} provider(s).`,
  };
};

interface ProviderAcceptanceInput {
  appointmentRequestId: string;
  providerId: string;
  scheduledAt: Date;
}

// Provider accepts an appointment request
export const acceptAppointmentRequest = async (
  input: ProviderAcceptanceInput,
): Promise<{
  status: string;
  appointmentRequestId: string;
  therapySessionId?: string;
  scheduledAt: string;
  amountMinor: number;
  message: string;
}> => {
  const appointmentRequest = await prisma.appointmentRequest.findUnique({
    where: { id: input.appointmentRequestId },
  });

  if (!appointmentRequest) {
    throw new AppError('Appointment request not found', 404);
  }

  // Only accept if still pending
  if (appointmentRequest.status !== 'PENDING') {
    throw new AppError('Appointment request is no longer available', 409);
  }

  // Validate provider is in the request
  const providers = appointmentRequest.providers as any;
  const providerEntry = providers.find((p: any) => p.providerId === input.providerId);
  if (!providerEntry) {
    throw new AppError('Provider not found in this appointment request', 403);
  }

  if (providerEntry.status !== 'PENDING') {
    throw new AppError('You have already responded to this request', 409);
  }

  // Check time is in the future
  if (input.scheduledAt <= new Date()) {
    throw new AppError('Scheduled time must be in the future', 422);
  }

  const amountMinor = Number(appointmentRequest.amountMinor || 0);

  if (!appointmentRequest.razorpayOrderId) {
    throw new AppError('Request payment reference is missing. Please create a new paid request.', 409);
  }

  const paymentStatus = await checkPhonePeStatus(String(appointmentRequest.razorpayOrderId));
  if (!isPhonePePaymentSuccess(paymentStatus)) {
    throw new AppError('Patient payment is not completed. This request cannot be accepted yet.', 409);
  }

  const patientProfile = await prisma.patientProfile.findUnique({
    where: { userId: String(appointmentRequest.patientId) },
    select: { id: true },
  });

  if (!patientProfile?.id) {
    throw new AppError('Patient profile not found for this request', 404);
  }

  // Update request and create TherapySession in one transaction to avoid split-brain states.
  const acceptanceResult = await prisma.$transaction(async (tx: any) => {
    const lockKeys = [
      getSmartMatchSlotLockKey('provider', String(input.providerId), input.scheduledAt),
      getSmartMatchSlotLockKey('patient', String(patientProfile.id), input.scheduledAt),
    ].sort((a, b) => (a < b ? -1 : 1));

    for (const lockKey of lockKeys) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;
    }

    const current = await tx.appointmentRequest.findUnique({
      where: { id: input.appointmentRequestId },
    });

    if (!current) {
      throw new AppError('Appointment request not found', 404);
    }

    if (current.status !== 'PENDING') {
      throw new AppError('Appointment request is no longer available', 409);
    }

    const therapistConflict = await tx.therapySession.findFirst({
      where: {
        therapistProfileId: String(input.providerId),
        dateTime: input.scheduledAt,
        status: { in: ACTIVE_SESSION_STATUSES as any },
      },
      select: { id: true },
    });

    if (therapistConflict) {
      throw new AppError('Selected provider is already booked for this slot', 409);
    }

    const patientConflict = await tx.therapySession.findFirst({
      where: {
        patientProfileId: String(patientProfile.id),
        dateTime: input.scheduledAt,
        status: { in: ACTIVE_SESSION_STATUSES as any },
      },
      select: { id: true },
    });

    if (patientConflict) {
      throw new AppError('Patient already has a booking at this selected slot', 409);
    }

    const updatedProviders = providers.map((p: any) => {
      if (p.providerId === input.providerId) {
        return { ...p, status: 'ACCEPTED', acceptedAt: new Date() };
      }
      return { ...p, status: 'CANCELLED', cancelledAt: new Date() };
    });

    const therapySessionId = crypto.randomUUID();

    const updatedRequest = await tx.appointmentRequest.update({
      where: { id: input.appointmentRequestId },
      data: {
        acceptedProviderId: input.providerId,
        therapySessionId,
        scheduledAt: input.scheduledAt,
        providers: updatedProviders as any,
        status: 'CONFIRMED',
      },
    });

    const createdSession = await tx.therapySession.create({
      data: {
        id: therapySessionId,
        bookingReferenceId: buildSmartMatchBookingReference(),
        patientProfileId: String(patientProfile.id),
        therapistProfileId: String(input.providerId),
        dateTime: input.scheduledAt,
        status: 'CONFIRMED',
        durationMinutes: Number(updatedRequest.durationMinutes || 50),
        sessionFeeMinor: amountMinor,
        paymentStatus: 'CAPTURED',
        sourceFunnel: updatedRequest.sourceFunnel || 'smart_match',
        isLocked: true,
      },
      select: { id: true },
    });

    return {
      updatedRequest,
      therapySessionId: String(createdSession.id),
    };
  });

  const updated = acceptanceResult.updatedRequest;
  const therapySessionId = acceptanceResult.therapySessionId;

  const acceptedProviderName = `${providerEntry?.name || ''}`.trim() || 'A provider';

  await prisma.notification.create({
    data: {
      userId: String(appointmentRequest.patientId),
      type: 'SMART_MATCH_REQUEST_CONFIRMED',
      title: 'Provider accepted your request',
      message: `${acceptedProviderName} accepted your paid request. Your session request is now confirmed.`,
      payload: {
        appointmentRequestId: updated.id,
        providerId: input.providerId,
        therapySessionId,
        scheduledAt: updated.scheduledAt?.toISOString(),
        amountMinor,
        requestStatus: 'CONFIRMED',
      },
      sentAt: new Date(),
    },
  }).catch(() => null);

  const cancelledProviderIds = providers
    .filter((p: any) => String(p.providerId) !== String(input.providerId))
    .map((p: any) => String(p.providerId));

  if (cancelledProviderIds.length > 0) {
    await prisma.notification.createMany({
      data: cancelledProviderIds.map((providerId) => ({
        userId: providerId,
        type: 'SMART_MATCH_REQUEST_CLOSED',
        title: 'Appointment request closed',
        message: 'This request was accepted by another provider and is no longer available.',
        payload: {
          appointmentRequestId: updated.id,
          acceptedProviderId: input.providerId,
          requestStatus: 'CLOSED',
        },
        sentAt: new Date(),
      })),
    }).catch(() => null);
  }

  return {
    status: updated.status,
    appointmentRequestId: updated.id,
    therapySessionId,
    scheduledAt: updated.scheduledAt!.toISOString(),
    amountMinor,
    message: `You accepted the appointment request. Payment is already verified for ₹${(amountMinor / 100).toFixed(2)}.`,
  };
};

// Provider rejects an appointment request
export const rejectAppointmentRequest = async (
  appointmentRequestId: string,
  providerId: string,
): Promise<{ status: string; message: string }> => {
  const appointmentRequest = await prisma.appointmentRequest.findUnique({
    where: { id: appointmentRequestId },
  });

  if (!appointmentRequest) {
    throw new AppError('Appointment request not found', 404);
  }

  const providers = appointmentRequest.providers as any;
  const providerEntry = providers.find((p: any) => p.providerId === providerId);
  if (!providerEntry) {
    throw new AppError('Provider not found in this appointment request', 403);
  }

  // Update this provider's status to REJECTED
  const updatedProviders = providers.map((p: any) => {
    if (p.providerId === providerId) {
      return { ...p, status: 'REJECTED', rejectedAt: new Date() };
    }
    return p;
  });

  // If all providers have rejected, mark request as REJECTED_BY_ALL
  const allRejected = updatedProviders.every((p: any) => p.status === 'REJECTED');
  const newStatus = allRejected ? 'REJECTED_BY_ALL' : appointmentRequest.status;

  await prisma.appointmentRequest.update({
    where: { id: appointmentRequestId },
    data: {
      providers: updatedProviders as any,
      status: newStatus as any,
    },
  });

  if (allRejected) {
    await prisma.notification.create({
      data: {
        userId: String(appointmentRequest.patientId),
        type: 'SMART_MATCH_ALL_REJECTED',
        title: 'No provider accepted yet',
        message: 'All selected providers rejected this request. Please submit a new request with different providers.',
        payload: {
          appointmentRequestId,
          requestStatus: 'REJECTED_BY_ALL',
        },
        sentAt: new Date(),
      },
    }).catch(() => null);
  }

  return {
    status: newStatus,
    message: 'You have rejected this appointment request.',
  };
};

// Auto-cancel requests that have expired payment deadline
export const autoExpirePaymentDeadlines = async (): Promise<void> => {
  const now = new Date();

  const expiredBookings = await prisma.appointmentRequest.findMany({
    where: {
      status: 'ACCEPTED_BY_PROVIDER',
      paymentDeadlineAt: { lt: now },
    },
  });

  for (const booking of expiredBookings) {
    await prisma.appointmentRequest.update({
      where: { id: booking.id },
      data: {
        status: 'EXPIRED',
        cancelledAt: now,
      },
    });

    const acceptedProviderId = booking.acceptedProviderId ? String(booking.acceptedProviderId) : null;

    await prisma.notification.create({
      data: {
        userId: String(booking.patientId),
        type: 'SMART_MATCH_BOOKING_EXPIRED',
        title: 'Payment window expired',
        message: 'Your booking request expired because payment was not completed in time.',
        payload: {
          appointmentRequestId: booking.id,
          requestStatus: 'EXPIRED',
        },
        sentAt: now,
      },
    }).catch(() => null);

    if (acceptedProviderId) {
      await prisma.notification.create({
        data: {
          userId: acceptedProviderId,
          type: 'SMART_MATCH_REQUEST_EXPIRED',
          title: 'Booking expired',
          message: 'The patient did not complete payment in time. This booking has expired.',
          payload: {
            appointmentRequestId: booking.id,
            requestStatus: 'EXPIRED',
          },
          sentAt: now,
        },
      }).catch(() => null);
    }
  }
};

// Get pending appointment requests for a provider (to show in their dashboard)
export const getProviderPendingRequests = async (providerId: string) => {
  const requests = await prisma.appointmentRequest.findMany({
    where: {
      providers: {
        path: ['*'],
        array_contains: [{ providerId }] as any,
      },
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          patientProfile: {
            select: {
              age: true,
              medicalHistory: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return requests.map((req) => ({
    id: req.id,
    patientName: `${req.patient?.firstName} ${req.patient?.lastName}`.trim(),
    availabilityPrefs: req.availabilityPrefs,
    preferredSpecialization: req.preferredSpecialization,
    createdAt: req.createdAt,
    expiresAt: req.expiresAt,
  }));
};

// Get patient's pending appointment requests
export const getPatientPendingRequests = async (patientId: string) => {
  const requests = await prisma.appointmentRequest.findMany({
    where: {
      patientId,
      status: 'PENDING',
    },
    orderBy: { createdAt: 'desc' },
  });

  return requests.map((req) => ({
    id: req.id,
    status: req.status,
    sourceFunnel: (req as any).sourceFunnel || null,
    providers: req.providers,
    expiresAt: req.expiresAt,
  }));
};

// Get patient's currently pending payment after provider acceptance
export const getPatientPaymentPendingRequest = async (patientId: string) => {
  const request = await prisma.appointmentRequest.findFirst({
    where: {
      patientId,
      status: 'ACCEPTED_BY_PROVIDER',
      paymentDeadlineAt: { gt: new Date() },
    },
    include: {
      acceptedProvider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          therapistProfile: {
            select: {
              displayName: true,
              averageRating: true,
            },
          },
        },
      },
    },
  });

  if (!request) return null;

  return {
    id: request.id,
    providerId: request.acceptedProviderId,
    providerName: request.acceptedProvider
      ? `${request.acceptedProvider.firstName} ${request.acceptedProvider.lastName}`.trim()
      : 'Unknown',
    scheduledAt: request.scheduledAt,
    paymentDeadlineAt: request.paymentDeadlineAt,
    amountMinor: Number(request.amountMinor || 0),
    timeRemaining: request.paymentDeadlineAt
      ? Math.max(0, request.paymentDeadlineAt.getTime() - Date.now())
      : 0,
  };
};
