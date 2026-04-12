export type PatientPlanId = 'free' | 'monthly' | 'quarterly' | 'premium_monthly';

export interface PatientAddonSelection {
  anytimeBuddyPack: 'none' | '1h' | '3h' | '5h';
  digitalPetHubUnlock: boolean;
  soundTrackCount: number;
  soundBundleCount: number;
}

export interface PatientSubscriptionCart {
  planId: PatientPlanId;
  addons: PatientAddonSelection;
  updatedAt: string;
}

export const PATIENT_CART_KEY = 'manas360.patient.subscription.cart.v1';

export const PATIENT_PLANS: Array<{
  id: PatientPlanId;
  name: string;
  displayPrice: string;
  gatewayPlanKey: string;
  trialDays: number;
  cta: string;
  badge?: string;
  amountMinor: number;
  features: string[];
}> = [
  {
    id: 'free',
    name: 'Free',
    displayPrice: 'INR 0',
    gatewayPlanKey: 'free',
    trialDays: 0,
    cta: 'Start Free',
    amountMinor: 0,
    features: [
      '3 sound tracks per day',
      'Basic AI chatbot',
      'Basic self-help content',
      'No therapist matching',
    ],
  },
  {
    id: 'monthly',
    name: 'Monthly',
    displayPrice: 'INR 99 / month',
    gatewayPlanKey: 'monthly',
    trialDays: 21,
    cta: 'Start 21-Day Trial',
    amountMinor: 9900,
    features: [
      'Full platform access',
      'PHQ-9 and GAD-7 assessments',
      'Therapist matching',
      'Mood tracking + analytics',
    ],
  },
  {
    id: 'quarterly',
    name: 'Quarterly',
    displayPrice: 'INR 279 / quarter',
    gatewayPlanKey: 'quarterly',
    trialDays: 21,
    cta: 'Start 21-Day Trial',
    badge: 'Most Chosen',
    amountMinor: 27900,
    features: [
      'Everything in Monthly',
      'Priority therapist matching',
      'All assessments in multiple languages',
      'Unlimited AI insights',
    ],
  },
  {
    id: 'premium_monthly',
    name: 'Premium',
    displayPrice: 'INR 299 / month',
    gatewayPlanKey: 'premium_monthly',
    trialDays: 21,
    cta: 'Start 21-Day Trial',
    amountMinor: 29900,
    features: [
      'Everything in Quarterly',
      'Unlimited streaming',
      'Offline downloads',
      'Advanced mood analytics',
    ],
  },
];

export const DEFAULT_ADDONS: PatientAddonSelection = {
  anytimeBuddyPack: 'none',
  digitalPetHubUnlock: false,
  soundTrackCount: 0,
  soundBundleCount: 0,
};

const ANYTIME_BUDDY_PRICING: Record<PatientAddonSelection['anytimeBuddyPack'], number> = {
  none: 0,
  '1h': 39900,
  '3h': 99900,
  '5h': 169900,
};

const DIGITAL_PET_HUB_UNLOCK_MINOR = 9900;
const SOUND_TRACK_MINOR = 3000;
const SOUND_BUNDLE_MINOR = 25000;

export const formatInr = (minor: number): string => {
  const major = minor / 100;
  return Number.isInteger(major) ? `INR ${major.toFixed(0)}` : `INR ${major.toFixed(2)}`;
};

export const getPlanById = (id: PatientPlanId) => PATIENT_PLANS.find((plan) => plan.id === id) || PATIENT_PLANS[0];

export const getPlanAmountMinor = (id: PatientPlanId): number => getPlanById(id).amountMinor;

export const getAddonSubtotalMinor = (cart: PatientSubscriptionCart): number => {
  const { addons, planId } = cart;
  const petHubMinor = planId === 'premium_monthly' ? 0 : (addons.digitalPetHubUnlock ? DIGITAL_PET_HUB_UNLOCK_MINOR : 0);

  return (
    ANYTIME_BUDDY_PRICING[addons.anytimeBuddyPack]
    + petHubMinor
    + Math.max(0, Math.round(addons.soundTrackCount || 0)) * SOUND_TRACK_MINOR
    + Math.max(0, Math.round(addons.soundBundleCount || 0)) * SOUND_BUNDLE_MINOR
  );
};

export const getCheckoutSummaryMinor = (cart: PatientSubscriptionCart) => {
  const planMinor = getPlanAmountMinor(cart.planId);
  const addonsMinor = getAddonSubtotalMinor(cart);
  const subtotalMinor = planMinor + addonsMinor;
  const gstMinor = Math.round(subtotalMinor * 0.18);
  const totalMinor = subtotalMinor + gstMinor;
  return { planMinor, addonsMinor, subtotalMinor, gstMinor, totalMinor };
};

export const saveCart = (cart: PatientSubscriptionCart): void => {
  localStorage.setItem(PATIENT_CART_KEY, JSON.stringify(cart));
};

export const loadCart = (): PatientSubscriptionCart | null => {
  try {
    const raw = localStorage.getItem(PATIENT_CART_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PatientSubscriptionCart;
    if (!parsed || !parsed.planId || !parsed.addons) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const clearCart = (): void => {
  localStorage.removeItem(PATIENT_CART_KEY);
};
