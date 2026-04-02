export type ProviderLeadPlanId = 'free' | 'basic' | 'standard' | 'premium';
export type ProviderBillingCycle = 'monthly' | 'quarterly';

export interface ProviderAddonSelection {
  hot: number;
  warm: number;
  cold: number;
}

export interface ProviderSubscriptionCart {
  leadPlanId: ProviderLeadPlanId;
  platformCycle: ProviderBillingCycle;
  addons: ProviderAddonSelection;
  updatedAt: string;
}

export const PROVIDER_CART_KEY = 'manas360.provider.subscription.cart.v1';

let inMemoryProviderCart: ProviderSubscriptionCart | null = null;

export const PROVIDER_LEAD_PLANS: Array<{
  id: ProviderLeadPlanId;
  name: string;
  trialDays: number;
  subtitle: string;
  badge?: string;
  features: string[];
}> = [
  {
    id: 'free',
    name: 'Free',
    trialDays: 0,
    subtitle: 'Profile only',
    features: ['0 leads/week', 'Basic profile', 'No marketplace access'],
  },
  {
    id: 'basic',
    name: 'Basic',
    trialDays: 21,
    subtitle: 'For new providers',
    features: ['3 leads/week', 'Warm + Cold leads', 'Verified badge'],
  },
  {
    id: 'standard',
    name: 'Standard',
    trialDays: 21,
    subtitle: 'For active providers',
    badge: 'Most Chosen',
    features: ['6 leads/week', 'Hot + Warm + Cold', 'Preferred badge', '10% marketplace discount'],
  },
  {
    id: 'premium',
    name: 'Premium',
    trialDays: 21,
    subtitle: 'For maximum patient flow',
    features: ['7 leads/week', 'Priority hot leads', 'Premium badge', '20% marketplace discount'],
  },
];

export const DEFAULT_PROVIDER_ADDONS: ProviderAddonSelection = {
  hot: 0,
  warm: 0,
  cold: 0,
};

const PLATFORM_ACCESS_MINOR: Record<ProviderBillingCycle, number> = {
  monthly: 9900,
  quarterly: 27900,
};

const LEAD_PLAN_PRICING_MINOR: Record<ProviderLeadPlanId, Record<ProviderBillingCycle, number>> = {
  free: { monthly: 0, quarterly: 0 },
  basic: { monthly: 19900, quarterly: 54900 },
  standard: { monthly: 29900, quarterly: 82900 },
  premium: { monthly: 39900, quarterly: 109900 },
};

const LEAD_UNIT_MINOR = {
  hot: 29900,
  warm: 19900,
  cold: 9900,
};

export const getPlatformAccessMinor = (cycle: ProviderBillingCycle): number => PLATFORM_ACCESS_MINOR[cycle];

export const getLeadPlanAmountMinor = (planId: ProviderLeadPlanId, cycle: ProviderBillingCycle): number =>
  LEAD_PLAN_PRICING_MINOR[planId][cycle];

export const getProviderAddonMinor = (addons: ProviderAddonSelection): number => {
  return (
    Math.max(0, Math.round(addons.hot || 0)) * LEAD_UNIT_MINOR.hot
    + Math.max(0, Math.round(addons.warm || 0)) * LEAD_UNIT_MINOR.warm
    + Math.max(0, Math.round(addons.cold || 0)) * LEAD_UNIT_MINOR.cold
  );
};

export const getProviderCheckoutSummaryMinor = (cart: ProviderSubscriptionCart) => {
  const platformMinor = getPlatformAccessMinor(cart.platformCycle);
  const leadPlanMinor = getLeadPlanAmountMinor(cart.leadPlanId, cart.platformCycle);
  const addonsMinor = getProviderAddonMinor(cart.addons);
  const subtotalMinor = platformMinor + leadPlanMinor + addonsMinor;
  const gstMinor = Math.round(subtotalMinor * 0.18);
  const totalMinor = subtotalMinor + gstMinor;
  return { platformMinor, leadPlanMinor, addonsMinor, subtotalMinor, gstMinor, totalMinor };
};

export const formatInr = (minor: number): string => {
  const major = minor / 100;
  return Number.isInteger(major) ? `INR ${major.toFixed(0)}` : `INR ${major.toFixed(2)}`;
};

export const saveProviderCart = (cart: ProviderSubscriptionCart): void => {
  inMemoryProviderCart = cart;
  try {
    localStorage.setItem(PROVIDER_CART_KEY, JSON.stringify(cart));
  } catch {
    // localStorage may be blocked in strict browser/privacy modes.
  }
};

export const loadProviderCart = (): ProviderSubscriptionCart | null => {
  try {
    const raw = localStorage.getItem(PROVIDER_CART_KEY);
    if (!raw) return inMemoryProviderCart;
    const parsed = JSON.parse(raw) as ProviderSubscriptionCart;
    if (!parsed || !parsed.leadPlanId || !parsed.platformCycle || !parsed.addons) return null;
    inMemoryProviderCart = parsed;
    return parsed;
  } catch {
    return inMemoryProviderCart;
  }
};

export const clearProviderCart = (): void => {
  inMemoryProviderCart = null;
  try {
    localStorage.removeItem(PROVIDER_CART_KEY);
  } catch {
    // Ignore storage cleanup errors in restricted browser/privacy modes.
  }
};
