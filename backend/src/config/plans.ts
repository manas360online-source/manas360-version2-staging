/**
 * Provider Subscription Plan Configuration
 * LOCKED: User-defined requirements for lead distribution system
 */

export const PLAN_CONFIG = {
  STARTER: {
    name: 'Starter',
    tier: 'STARTER',
    leadsPerWeek: 3,
    bonusLeads: 0,
    monthlyPrice: 99900, // ₹999 in paise
    verificationRequired: 'email',
    exclusivity: 'shared', // 5-10 therapists per lead
    responseWindow: 48, // hours
    priority: 1, // Lowest priority
  },
  GROWTH: {
    name: 'Growth',
    tier: 'GROWTH',
    leadsPerWeek: 5,
    bonusLeads: 1, // Automatic +1 bonus lead
    monthlyPrice: 249900, // ₹2,499 in paise
    verificationRequired: 'phone',
    exclusivity: 'semi-exclusive', // max 3 therapists per lead
    responseWindow: 36, // hours
    priority: 2,
  },
  SCALE: {
    name: 'Scale',
    tier: 'SCALE',
    leadsPerWeek: 7,
    bonusLeads: 0,
    monthlyPrice: 499900, // ₹4,999 in paise
    verificationRequired: 'complete', // phone + detailed profile
    exclusivity: 'exclusive', // ONLY 1 therapist
    responseWindow: 12, // hours
    priority: 3, // Highest priority
    earlyAccessHours: 12, // 12-hour exclusive window before others see lead
    dedicatedSupport: true,
  },
};

/**
 * Lead Quality Score Configuration
 * LOCKED: Formula per user specification
 */
export const LEAD_QUALITY_CONFIG = {
  verificationWeights: {
    complete: 40, // Full verification (phone + profile)
    phone: 25, // Phone verified
    email: 10, // Email only
  },
  profileCompletenessWeight: 30,
  urgencyWeight: 30,
  maxScore: 100,
};

/**
 * Therapist Expertise Tags
 * Used for issue-expertise matching
 */
export const THERAPIST_EXPERTISE_TAGS = [
  'anxiety',
  'depression',
  'stress',
  'relationships',
  'trauma',
  'PTSD',
  'grief',
  'career-counseling',
  'addiction',
  'eating-disorders',
  'insomnia',
  'parenting',
  'academic-support',
  'self-esteem',
];

/**
 * Lead Distribution Configuration
 * Controls how leads cascade through tiers
 */
export const LEAD_DISTRIBUTION_CONFIG = {
  // Exclusivity rules: how many therapists get each lead per tier
  exclusivityRules: {
    STARTER: { min: 5, max: 10 },
    GROWTH: { max: 3 },
    SCALE: { max: 1 },
  },

  // Lead lifespan in hours
  leadLifespanHours: 48,

  // Stage timings (relative to lead creation)
  stages: {
    scaleExclusive: { start: 0, end: 12 }, // Hours 0-12: SCALE only
    growthJoin: { start: 12, end: 36 }, // Hours 12-36: SCALE + GROWTH
    starterJoin: { start: 12, end: 48 }, // Hours 12-48: all tiers
    expired: 48, // After 48h: EXPIRED
  },

  // Dead lead detection
  deadLeadThresholdHours: 24, // No response after 24h = dead lead

  // Weekly quota reset timing (UTC)
  weeklyResetDay: 0, // 0 = Sunday
  weeklyResetHour: 0,
  weeklyResetMinute: 0,
};

/**
 * Verification Levels
 * Determines what level of verification a lead has
 */
export const VERIFICATION_LEVELS = {
  EMAIL: 'email', // Email only
  PHONE: 'phone', // Email + phone verified
  COMPLETE: 'complete', // Email + phone + detailed profile info
};

/**
 * Lead Assignment Status
 * Tracks the lifecycle of a single therapist-lead assignment
 */
export const LEAD_ASSIGNMENT_STATUS = {
  ASSIGNED: 'assigned', // Initial state
  RESPONDED: 'responded', // Therapist saw + responded to lead
  CONVERTED: 'converted', // Patient booked session
  EXPIRED: 'expired', // Lead lifetime exceeded
  DECLINED: 'declined', // Therapist explicitly declined
};

/**
 * Subscription Status
 * Subscription plan states
 */
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  PAST_DUE: 'past-due',
};

/**
 * Conversion Definition (LOCKED)
 * Therapist must book first PAID session with patient
 * NOT just "responding" or "accepting" lead
 */
export const CONVERSION_DEFINITION = {
  description: 'Patient books first paid therapy session with therapist',
  trackingField: 'convertedAt',
  criteria: ['sessionBooked', 'paymentCaptured'],
};

export default {
  PLAN_CONFIG,
  LEAD_QUALITY_CONFIG,
  THERAPIST_EXPERTISE_TAGS,
  LEAD_DISTRIBUTION_CONFIG,
  VERIFICATION_LEVELS,
  LEAD_ASSIGNMENT_STATUS,
  SUBSCRIPTION_STATUS,
  CONVERSION_DEFINITION,
};
