export const PATIENT_PLANS = {
  free: { price: 0, duration: 0 },
  monthly: { price: 99, duration: 30 },
  quarterly: { price: 299, duration: 90 },
  premium_monthly: { price: 299, duration: 30 },
  premium_annual: { price: 2999, duration: 365 }
};

export function calculateExpiry(plan: string) {
  const now = new Date();

  const days: Record<string, number> = {
    monthly: 30,
    quarterly: 90,
    premium_monthly: 30,
    premium_annual: 365
  };

  return days[plan]
    ? new Date(now.getTime() + days[plan] * 24 * 60 * 60 * 1000)
    : null;
}
