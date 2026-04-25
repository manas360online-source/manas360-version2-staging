export type PatientPlanId = 'free' | 'monthly' | 'quarterly' | 'premium_monthly';

export interface PatientAddonSelection {
  premiumLibraryPack: 'none' | '1h' | '3h' | '5h';
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
    name: 'Premium Library',
    displayPrice: 'INR 299 / month',
    gatewayPlanKey: 'premium_monthly',
    trialDays: 21,
    cta: 'Start 21-Day Trial',
    amountMinor: 29900,
    features: [
      'Everything in Quarterly',
      'Premium library access packs',
      'Screen-time based library usage',
      'Advanced mood analytics',
    ],
  },
];

export const DEFAULT_ADDONS: PatientAddonSelection = {
  premiumLibraryPack: 'none',
};

const PREMIUM_LIBRARY_PACK_PRICING: Record<PatientAddonSelection['premiumLibraryPack'], number> = {
  none: 0,
  '1h': 39900,
  '3h': 99900,
  '5h': 169900,
};

export const formatInr = (minor: number): string => {
  const major = minor / 100;
  return Number.isInteger(major) ? `INR ${major.toFixed(0)}` : `INR ${major.toFixed(2)}`;
};

export const getPlanById = (id: PatientPlanId) => PATIENT_PLANS.find((plan) => plan.id === id) || PATIENT_PLANS[0];

export const getPlanAmountMinor = (id: PatientPlanId): number => getPlanById(id).amountMinor;

export const getAddonSubtotalMinor = (cart: PatientSubscriptionCart): number => {
  const { addons } = cart;
  const pack = addons?.premiumLibraryPack || 'none';
  return PREMIUM_LIBRARY_PACK_PRICING[pack] || 0;
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
    const parsed = JSON.parse(raw) as any;
    if (!parsed || !parsed.planId || !parsed.addons) return null;

    const premiumLibraryPack = parsed?.addons?.premiumLibraryPack || parsed?.addons?.anytimeBuddyPack || 'none';

    return {
      planId: parsed.planId,
      addons: {
        premiumLibraryPack: premiumLibraryPack === '1h' || premiumLibraryPack === '3h' || premiumLibraryPack === '5h'
          ? premiumLibraryPack
          : 'none',
      },
      updatedAt: String(parsed.updatedAt || new Date().toISOString()),
    };
  } catch {
    return null;
  }
};

export const clearCart = (): void => {
  localStorage.removeItem(PATIENT_CART_KEY);
};
