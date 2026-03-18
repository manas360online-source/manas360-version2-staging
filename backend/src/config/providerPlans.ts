/**
 * Provider Subscription Plans — Centralized config
 * Mirrors the Hybrid SaaS + Marketplace model
 */

export type ProviderPlanKey = 'free' | 'basic' | 'standard' | 'premium';

export interface ProviderPlanDetail {
	price: number;            // Monthly price in ₹
	quarterlyPrice: number;   // Quarterly price in ₹ (8% off)
	leadsPerWeek: number;
	leadsPerMonth: number;
	discount: number;         // Marketplace discount %
	claimWindowHours: number;
	deliveryDays: string[];
	leadQualityMix: string;
	profileListing: string;
	dashboardAccess: string;
	marketplaceAccess: boolean;
	certificationBadge: string;
	support: string;
	durationDays: number;
}

export const PROVIDER_PLANS: Record<ProviderPlanKey, ProviderPlanDetail> = {
	free: {
		price: 0,
		quarterlyPrice: 0,
		leadsPerWeek: 0,
		leadsPerMonth: 0,
		discount: 0,
		claimWindowHours: 0,
		deliveryDays: [],
		leadQualityMix: 'None',
		profileListing: 'Basic (text only)',
		dashboardAccess: 'Basic stats only',
		marketplaceAccess: false,
		certificationBadge: 'None',
		support: 'Self-serve FAQ',
		durationDays: 0,
	},
	basic: {
		price: 199,
		quarterlyPrice: 549,
		leadsPerWeek: 3,
		leadsPerMonth: 12,
		discount: 0,
		claimWindowHours: 48,
		deliveryDays: ['Mon', 'Thu', 'Sat'],
		leadQualityMix: 'Warm + Cold only',
		profileListing: 'Enhanced (photo + video intro)',
		dashboardAccess: 'Full analytics + conversion tracking',
		marketplaceAccess: true,
		certificationBadge: 'Verified Provider',
		support: 'Email support (48h response)',
		durationDays: 30,
	},
	standard: {
		price: 299,
		quarterlyPrice: 829,
		leadsPerWeek: 6,
		leadsPerMonth: 24,
		discount: 10,
		claimWindowHours: 48,
		deliveryDays: ['Mon', 'Wed', 'Fri'],
		leadQualityMix: 'Hot + Warm + Cold',
		profileListing: 'Featured (search priority)',
		dashboardAccess: 'Full analytics + patient insights',
		marketplaceAccess: true,
		certificationBadge: 'Verified + Preferred',
		support: 'Priority email (24h response)',
		durationDays: 30,
	},
	premium: {
		price: 399,
		quarterlyPrice: 1099,
		leadsPerWeek: 7,
		leadsPerMonth: 28,
		discount: 20,
		claimWindowHours: 72,
		deliveryDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
		leadQualityMix: 'Priority Hot leads (first access)',
		profileListing: 'Spotlight (top of results + badge)',
		dashboardAccess: 'Full analytics + AI recommendations',
		marketplaceAccess: true,
		certificationBadge: 'Verified + Premium',
		support: 'Dedicated manager + WhatsApp',
		durationDays: 30,
	},
};

/** Marketplace lead pricing by type */
export const LEAD_MARKETPLACE_PRICES: Record<string, number> = {
	hot: 500,
	warm: 300,
	cold: 150,
};

/** Calculate discounted marketplace price */
export const getDiscountedLeadPrice = (leadType: string, planKey: ProviderPlanKey): number => {
	const basePrice = LEAD_MARKETPLACE_PRICES[leadType] || 300;
	const discount = PROVIDER_PLANS[planKey]?.discount || 0;
	return Math.round(basePrice * (1 - discount / 100));
};
