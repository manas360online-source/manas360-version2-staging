import { randomUUID } from 'crypto';
import { prisma } from '../config/db';

const db = prisma as any;
let initialized = false;

type SessionPricingInput = {
	providerType: string;
	durationMinutes: number;
	price: number;
	providerShare?: number;
	platformShare?: number;
	active?: boolean;
};

type PremiumBundleInput = {
	bundleName: string;
	minutes: number;
	price: number;
	active?: boolean;
};

type UpdatePricingInput = {
	platformFee?: number;
	platform_fee?: number;
	sessionPricing?: SessionPricingInput[];
	session_pricing?: SessionPricingInput[];
	premiumBundles?: PremiumBundleInput[];
	premium_bundles?: PremiumBundleInput[];
	preferredTimeSurcharge?: number;
	preferred_time_surcharge?: number;
};

const toIso = (value: any): string | null => {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const normalizeProviderType = (value: string): string => String(value || '').trim().toLowerCase();

const ensurePricingTables = async (): Promise<void> => {
	if (initialized) return;

	await db.$executeRawUnsafe(`
		CREATE TABLE IF NOT EXISTS platform_subscription (
			id TEXT PRIMARY KEY,
			plan_key VARCHAR(50) NOT NULL UNIQUE,
			plan_name VARCHAR(100) NOT NULL,
			price INTEGER NOT NULL,
			billing_cycle VARCHAR(50) NOT NULL,
			description TEXT,
			active BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW()
		);
	`);

	await db.$executeRawUnsafe(`
		CREATE TABLE IF NOT EXISTS session_pricing (
			id TEXT PRIMARY KEY,
			provider_type VARCHAR(50) NOT NULL,
			duration_minutes INTEGER NOT NULL,
			price INTEGER NOT NULL,
			provider_share INTEGER NOT NULL,
			platform_share INTEGER NOT NULL,
			active BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
			UNIQUE(provider_type, duration_minutes)
		);
	`);

	await db.$executeRawUnsafe(`
		CREATE TABLE IF NOT EXISTS system_settings (
			key VARCHAR(100) PRIMARY KEY,
			value VARCHAR(100) NOT NULL,
			updated_at TIMESTAMP NOT NULL DEFAULT NOW()
		);
	`);

	await db.$executeRawUnsafe(`
		CREATE TABLE IF NOT EXISTS product_addons (
			id TEXT PRIMARY KEY,
			addon_key VARCHAR(50) NOT NULL UNIQUE,
			addon_name VARCHAR(100) NOT NULL,
			price INTEGER NOT NULL,
			active BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW()
		);
	`);

	initialized = true;

	// Seed Subscription Plans
	const platformRows = (await db.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM platform_subscription')) as Array<{ count: number }>;
	if (Number(platformRows?.[0]?.count || 0) === 0) {
		const plans = [
			{ key: 'free', name: 'Free Tier', price: 0, cycle: 'none' },
			{ key: 'monthly', name: 'Monthly Plan', price: 99, cycle: 'monthly' },
			{ key: 'quarterly', name: 'Quarterly Plan', price: 299, cycle: 'quarterly' },
			{ key: 'premium_monthly', name: 'Premium Monthly', price: 299, cycle: 'monthly' },
			{ key: 'premium_annual', name: 'Premium Annual', price: 2999, cycle: 'yearly' },
		];
		for (const plan of plans) {
			await db.$executeRawUnsafe(
				`INSERT INTO platform_subscription (id, plan_key, plan_name, price, billing_cycle, active)
				 VALUES ($1, $2, $3, $4, $5, TRUE) ON CONFLICT DO NOTHING`,
				randomUUID(), plan.key, plan.name, plan.price, plan.cycle
			);
		}
	}

	// Seed Session Pricing
	const sessionRows = (await db.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM session_pricing')) as Array<{ count: number }>;
	if (Number(sessionRows?.[0]?.count || 0) === 0) {
		const sessionSeed = [
			{ type: 'therapist', duration: 45, price: 500 },
			{ type: 'therapist', duration: 60, price: 1000 },
			{ type: 'clinical-psychologist', duration: 45, price: 699 },
			{ type: 'clinical-psychologist', duration: 60, price: 1500 },
			{ type: 'psychiatrist', duration: 45, price: 999 },
			{ type: 'psychiatrist', duration: 60, price: 2000 },
			{ type: 'nlp-coach', duration: 45, price: 500 },
			{ type: 'nlp-coach', duration: 60, price: 1000 },
			{ type: 'executive-coach', duration: 45, price: 1500 },
			{ type: 'executive-coach', duration: 60, price: 2500 },
		];
		for (const row of sessionSeed) {
			const providerShare = Math.round(row.price * 0.7);
			await db.$executeRawUnsafe(
				`INSERT INTO session_pricing (id, provider_type, duration_minutes, price, provider_share, platform_share, active)
				 VALUES ($1, $2, $3, $4, $5, $6, TRUE) ON CONFLICT DO NOTHING`,
				randomUUID(), row.type, row.duration, row.price, providerShare, row.price - providerShare
			);
		}
	}

	// Seed Add-ons
	const addonRows = (await db.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM product_addons')) as Array<{ count: number }>;
	if (Number(addonRows?.[0]?.count || 0) === 0) {
		const addons = [
			{ key: 'anytime_buddy', name: 'Anytime Buddy', price: 99 },
			{ key: 'pet_hub', name: 'Digital Pet Hub', price: 99 },
			{ key: 'ivr_therapy', name: 'IVR Therapy', price: 499 },
			{ key: 'vent_buddy', name: 'Vent Buddy', price: 99 },
			{ key: 'sound_track', name: 'Sound Track', price: 30 },
			{ key: 'sound_bundle', name: 'Sound Bundle', price: 250 },
		];
		for (const addon of addons) {
			await db.$executeRawUnsafe(
				`INSERT INTO product_addons (id, addon_key, addon_name, price)
				 VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
				randomUUID(), addon.key, addon.name, addon.price
			);
		}
	}
};

export const getPricingConfig = async () => {
	await ensurePricingTables();
	const plans = await db.$queryRawUnsafe(`SELECT * FROM platform_subscription WHERE active = TRUE`);
	const sessions = await db.$queryRawUnsafe(`SELECT * FROM session_pricing WHERE active = TRUE`);
	const addons = await db.$queryRawUnsafe(`SELECT * FROM product_addons WHERE active = TRUE`);
	const settings = await db.$queryRawUnsafe(`SELECT * FROM system_settings WHERE key = 'preferred_time_surcharge'`);
	
	const surchargePercent = Number(settings?.[0]?.value || 20);

	return {
		plans: plans.map((p: any) => ({
			key: p.plan_key,
			name: p.plan_name,
			price: p.price,
			billingCycle: p.billing_cycle
		})),
		sessions: sessions.map((s: any) => ({
			providerType: s.provider_type,
			duration: s.duration_minutes,
			price: s.price
		})),
		addons: addons.map((a: any) => ({
			key: a.addon_key,
			name: a.addon_name,
			price: a.price
		})),
		surchargePercent
	};
};

export const updatePricingConfig = async (input: any) => {
	await ensurePricingTables();
	
	if (input.preferredTimeSurcharge !== undefined || input.surchargePercent !== undefined) {
        const val = input.preferredTimeSurcharge ?? input.surchargePercent;
		await db.$executeRawUnsafe(
			`UPDATE system_settings SET value = $1 WHERE key = 'preferred_time_surcharge'`,
			String(val)
		);
	}

    if (input.sessionPricing && Array.isArray(input.sessionPricing)) {
        for (const session of input.sessionPricing) {
            if (!session.providerType || !session.duration) continue;
            
            const price = Number(session.price);
            if (Number.isNaN(price)) continue;

            const providerShare = Math.round(price * 0.7);
            const platformShare = price - providerShare;
            await db.$executeRawUnsafe(
                `UPDATE session_pricing SET price = $1, provider_share = $2, platform_share = $3 WHERE provider_type = $4 AND duration_minutes = $5`,
                price, providerShare, platformShare, session.providerType, session.duration
            );
        }
    }

    if (input.platformFee !== undefined) {
        let val = input.platformFee;
        if (typeof val === 'object') {
             val = val.monthlyFee || val.monthly_fee;
        }
        if (val !== undefined && !Number.isNaN(Number(val))) {
            await db.$executeRawUnsafe(`UPDATE platform_subscription SET price = $1 WHERE plan_key = 'monthly'`, Number(val));
        }
    }

	return getPricingConfig();
};

export const getSessionQuote = async (input: { providerType?: string; durationMinutes?: number; preferredTime?: boolean }) => {
	await ensurePricingTables();
	const type = normalizeProviderType(input.providerType || 'therapist');
	const duration = input.durationMinutes || 45;
	const row = (await db.$queryRawUnsafe(`SELECT price FROM session_pricing WHERE provider_type = $1 AND duration_minutes = $2 AND active = TRUE`, type, duration)) as any[];
	const basePrice = row?.[0]?.price || (type.includes('psychiatrist') ? 999 : 500);
	const settingRows = (await db.$queryRawUnsafe(`SELECT value FROM system_settings WHERE key = 'preferred_time_surcharge'`)) as any[];
	const surchargePercent = Number(settingRows?.[0]?.value || 20);
	const finalPrice = input.preferredTime ? Math.round(basePrice * (1 + surchargePercent / 100)) : basePrice;

	return { providerType: type, durationMinutes: duration, basePrice, surchargePercent, preferredTime: !!input.preferredTime, finalPrice };
};

export const getActivePlatformPlan = async (planKey?: string) => {
	await ensurePricingTables();
	const resolvedPlanKey = String(planKey || 'monthly');
	const row = (await db.$queryRawUnsafe(`SELECT * FROM platform_subscription WHERE plan_key = $1 AND active = TRUE`, resolvedPlanKey)) as any[];
	if (!row?.[0]) {
		// Keep legacy fallback only for default lookups; explicit keys should fail validation upstream.
		if (planKey) return null;
		return { key: 'free', name: 'Free Tier', price: 0 };
	}
	return { key: row[0].plan_key, name: row[0].plan_name, price: row[0].price };
};

export const getAdminPricingConfigWithImpact = async () => {
	const config = await getPricingConfig();
	const activePrice = Number(config.plans.find((p: any) => p.key === 'monthly')?.price || 99);

	let summaryRows: any[] = [];

	try {
		summaryRows = (await db.$queryRawUnsafe(
			`SELECT
				COUNT(*)::int AS total,
				COUNT(*) FILTER (WHERE "status" = 'active')::int AS active,
				COUNT(*) FILTER (
					WHERE "status" = 'active' AND COALESCE("price", 0) <> $1
				)::int AS locked_count,
				COUNT(*) FILTER (
					WHERE "status" = 'active' AND COALESCE("price", 0) = $1
				)::int AS aligned_count,
				COUNT(*) FILTER (
					WHERE "status" = 'active' AND "renewalDate" <= NOW() + INTERVAL '7 days'
				)::int AS renewals_next_7_days,
				COUNT(*) FILTER (
					WHERE "status" = 'active' AND "renewalDate" <= NOW() + INTERVAL '30 days'
				)::int AS renewals_next_30_days
			 FROM "patient_subscriptions"`,
			activePrice,
		)) as any[];
	} catch {
		// Backward-compatible fallback for legacy schemas that use snake_case column names.
		summaryRows = (await db.$queryRawUnsafe(
			`SELECT
				COUNT(*)::int AS total,
				COUNT(*) FILTER (WHERE status = 'active')::int AS active,
				COUNT(*) FILTER (
					WHERE status = 'active' AND COALESCE(price, 0) <> $1
				)::int AS locked_count,
				COUNT(*) FILTER (
					WHERE status = 'active' AND COALESCE(price, 0) = $1
				)::int AS aligned_count,
				COUNT(*) FILTER (
					WHERE status = 'active' AND renewal_date <= NOW() + INTERVAL '7 days'
				)::int AS renewals_next_7_days,
				COUNT(*) FILTER (
					WHERE status = 'active' AND renewal_date <= NOW() + INTERVAL '30 days'
				)::int AS renewals_next_30_days
			 FROM patient_subscriptions`,
			activePrice,
		)) as any[];
	}

	const row = summaryRows?.[0] || {};
	return {
		...config,
		impactSummary: {
			totalSubscriptions: Number(row.total || 0),
			activeSubscriptions: Number(row.active || 0),
			lockedToPreviousPrice: Number(row.locked_count || 0),
			alignedWithCurrentPrice: Number(row.aligned_count || 0),
			renewalsNext7Days: Number(row.renewals_next_7_days || 0),
			renewalsNext30Days: Number(row.renewals_next_30_days || 0),
		},
	};
};
