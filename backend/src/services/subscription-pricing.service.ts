type ClinicTier = 'solo' | 'small' | 'large';
type BillingCycle = 'monthly' | 'quarterly';

type CalculateSubscriptionPriceInput = {
	clinic_tier: ClinicTier;
	billing_cycle: BillingCycle;
	selected_features: string[];
};

type PricingResponse = {
	monthly_total: number;
	billing_amount: number;
	discount_applied: number;
	breakdown: Array<{
		feature_slug: string;
		unit_price: number;
	}>;
};

const FEATURE_INDEX_MAP: Record<string, number> = {
	'patient-database': 0,
	'session-notes': 1,
	scheduling: 2,
	'auto-purge': 3,
	'bulk-import': 4,
	'progress-tracking': 5,
	prescriptions: 6,
	adherence: 7,
	'multi-therapist': 8,
	'api-access': 9,
	'compliance-pack': 10,
	analytics: 11,
};

const FEATURE_PRICES: Record<ClinicTier, number[]> = {
	solo: [499, 249, 199, 99, 299, 199, 249, 149, 199, 499, 149, 299],
	small: [699, 349, 249, 99, 399, 299, 349, 199, 199, 599, 199, 399],
	large: [999, 449, 299, 99, 599, 399, 449, 299, 199, 799, 249, 599],
};

export const calculateSubscriptionPrice = (input: CalculateSubscriptionPriceInput): PricingResponse => {
	const tierPrices = FEATURE_PRICES[input.clinic_tier];
	let monthlyTotal = 0;

	const breakdown = input.selected_features.map((slug) => {
		const index = FEATURE_INDEX_MAP[slug];
		const unitPrice = Number.isInteger(index) ? tierPrices[index] || 0 : 0;
		monthlyTotal += unitPrice;
		return {
			feature_slug: slug,
			unit_price: unitPrice,
		};
	});

	if (input.billing_cycle === 'quarterly') {
		return {
			monthly_total: monthlyTotal,
			billing_amount: Math.round(monthlyTotal * 3 * 0.9),
			discount_applied: 10,
			breakdown,
		};
	}

	return {
		monthly_total: monthlyTotal,
		billing_amount: monthlyTotal,
		discount_applied: 0,
		breakdown,
	};
};
