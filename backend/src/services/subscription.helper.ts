type SubscriptionLike = {
  status?: string | null;
  plan?: string | null;
  planName?: string | null;
  price?: number | null;
  expiryDate?: Date | string | null;
  renewalDate?: Date | string | null;
  metadata?: any;
};

const ACTIVE_STATES = new Set(['active', 'trial', 'trialing', 'grace', 'renewal_pending']);

const asDate = (value: unknown): Date | null => {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
};

const isFreeLike = (sub: SubscriptionLike): boolean => {
  const plan = String(sub.plan || sub.planName || '').toLowerCase();
  if (plan.includes('free')) return true;
  return Number(sub.price || 0) <= 0;
};

export const calculateGraceEndDate = (): Date => {
  const now = Date.now();
  const graceMs = (2 * 24 + 30) * 60 * 60 * 1000;
  return new Date(now + graceMs);
};

export const getEffectiveSubscriptionStatus = (sub: SubscriptionLike): 'active' | 'trial' | 'grace' | 'locked' => {
  const raw = String(sub.status || '').toLowerCase();
  if (raw === 'locked' || raw === 'expired' || raw === 'cancelled') return 'locked';

  const now = new Date();
  const graceEnd = asDate(sub.metadata?.graceEndDate);
  if (raw === 'grace') {
    if (graceEnd && now > graceEnd) return 'locked';
    return 'grace';
  }

  if (raw === 'trial' || raw === 'trialing') {
    const trialEnd = asDate(sub.metadata?.trialEndDate);
    if (trialEnd && now > trialEnd) return 'locked';
    return 'trial';
  }

  if (ACTIVE_STATES.has(raw)) {
    const expiry = asDate(sub.expiryDate || sub.renewalDate);
    if (expiry && now > expiry) return 'locked';
    return 'active';
  }

  return 'locked';
};

export const isSubscriptionValidForMatching = (sub: SubscriptionLike | null | undefined): boolean => {
  if (!sub) return false;
  if (isFreeLike(sub)) return false;
  const effective = getEffectiveSubscriptionStatus(sub);
  return effective === 'active' || effective === 'trial' || effective === 'grace';
};
