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

type PlatformPlanInput = {
	planKey: string;
	planName: string;
	price: number;
	billingCycle: string;
	description?: string | null;
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
	plans?: PlatformPlanInput[];
	platformPlans?: PlatformPlanInput[];
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
			minutes INTEGER NOT NULL DEFAULT 0,
			price INTEGER NOT NULL,
			active BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW()
		);
	`);

	await db.$executeRawUnsafe(`ALTER TABLE product_addons ADD COLUMN IF NOT EXISTS minutes INTEGER NOT NULL DEFAULT 0`);

	initialized = true;
};

export const getPricingConfig = async () => {
	await ensurePricingTables();
	const plans = await db.$queryRawUnsafe(`SELECT * FROM platform_subscription WHERE active = TRUE`);
	const sessions = await db.$queryRawUnsafe(`SELECT * FROM session_pricing WHERE active = TRUE`);
	const addons = await db.$queryRawUnsafe(`SELECT * FROM product_addons WHERE active = TRUE`);
	const settings = await db.$queryRawUnsafe(`SELECT * FROM system_settings WHERE key = 'preferred_time_surcharge'`);
	
	const surchargePercent = Number(settings?.[0]?.value || 20);

	return {
		platformFee: plans
			.filter((p: any) => String(p.plan_key) === 'monthly')
			.map((p: any) => ({
				id: p.id,
				planName: p.plan_name,
				monthlyFee: p.price,
				description: p.description ?? null,
				active: Boolean(p.active),
				effectiveFrom: null,
				effectiveTo: null,
			}))[0] || null,
		plans: plans.map((p: any) => ({
			id: p.id,
			key: p.plan_key,
			name: p.plan_name,
			price: p.price,
			billingCycle: p.billing_cycle,
			active: Boolean(p.active),
			description: p.description ?? null,
		})),
		sessions: sessions.map((s: any) => ({
			providerType: s.provider_type,
			duration: s.duration_minutes,
			price: s.price
		})),
		sessionPricing: sessions.map((s: any) => ({
			id: s.id,
			providerType: s.provider_type,
			durationMinutes: s.duration_minutes,
			price: s.price,
			providerShare: s.provider_share,
			platformShare: s.platform_share,
			active: Boolean(s.active),
			effectiveFrom: toIso(s.created_at),
			effectiveTo: null,
		})),
		addons: addons.map((a: any) => ({
			key: a.addon_key,
			name: a.addon_name,
			price: a.price
		})),
		premiumBundles: addons.map((a: any) => ({
			id: a.id,
			bundleName: a.addon_name,
			minutes: Number(a.minutes || 0),
			price: a.price,
			active: Boolean(a.active),
			effectiveFrom: toIso(a.created_at),
			effectiveTo: null,
		})),
		surchargePercent
	};
};

const toAddonKey = (bundleName: string): string => {
	return String(bundleName || '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, 50);
};

export const updatePricingConfig = async (input: any) => {
	await ensurePricingTables();

	const normalizedInput: UpdatePricingInput = {
		platformFee: input.platformFee ?? input.platform_fee,
		plans: Array.isArray(input.plans) ? input.plans : Array.isArray(input.platformPlans) ? input.platformPlans : [],
		sessionPricing: Array.isArray(input.sessionPricing) ? input.sessionPricing : Array.isArray(input.session_pricing) ? input.session_pricing : [],
		premiumBundles: Array.isArray(input.premiumBundles) ? input.premiumBundles : Array.isArray(input.premium_bundles) ? input.premium_bundles : [],
		preferredTimeSurcharge: input.preferredTimeSurcharge ?? input.preferred_time_surcharge ?? input.surchargePercent,
	};

	if (normalizedInput.preferredTimeSurcharge !== undefined) {
        const val = normalizedInput.preferredTimeSurcharge;
		await db.$executeRawUnsafe(
			`UPDATE system_settings SET value = $1 WHERE key = 'preferred_time_surcharge'`,
			String(val)
		);
	}

	const planRows = normalizedInput.plans || [];
	for (const plan of planRows) {
		const planKey = String(plan.planKey || '').trim();
		const planName = String(plan.planName || '').trim();
		const billingCycle = String(plan.billingCycle || '').trim();
		const price = Number(plan.price);
		if (!planKey || !planName || !billingCycle || !Number.isFinite(price) || price < 0) continue;

		await db.$executeRawUnsafe(
			`INSERT INTO platform_subscription (id, plan_key, plan_name, price, billing_cycle, description, active)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)
			 ON CONFLICT (plan_key) DO UPDATE SET
			   plan_name = EXCLUDED.plan_name,
			   price = EXCLUDED.price,
			   billing_cycle = EXCLUDED.billing_cycle,
			   description = EXCLUDED.description,
			   active = EXCLUDED.active,
			   updated_at = NOW()`,
			randomUUID(),
			planKey,
			planName,
			price,
			billingCycle,
			plan.description ?? null,
			plan.active !== false,
		);
	}

    if (normalizedInput.sessionPricing && Array.isArray(normalizedInput.sessionPricing)) {
        for (const session of normalizedInput.sessionPricing) {
            const duration = Number((session as any).durationMinutes ?? (session as any).duration);
            if (!session.providerType || !Number.isFinite(duration)) continue;
            
            const price = Number(session.price);
            if (Number.isNaN(price)) continue;

            const providerShare = Math.round(price * 0.7);
            const platformShare = price - providerShare;
            await db.$executeRawUnsafe(
                `UPDATE session_pricing SET price = $1, provider_share = $2, platform_share = $3 WHERE provider_type = $4 AND duration_minutes = $5`,
                price, providerShare, platformShare, session.providerType, duration
            );
        }
    }

	if (normalizedInput.premiumBundles && Array.isArray(normalizedInput.premiumBundles)) {
		for (const bundle of normalizedInput.premiumBundles) {
			const bundleName = String(bundle.bundleName || '').trim();
			const minutes = Number(bundle.minutes || 0);
			const price = Number(bundle.price);
			if (!bundleName || !Number.isFinite(price) || price < 0 || !Number.isFinite(minutes) || minutes < 0) continue;

			const addonKey = toAddonKey(bundleName);
			if (!addonKey) continue;

			await db.$executeRawUnsafe(
				`INSERT INTO product_addons (id, addon_key, addon_name, minutes, price, active)
				 VALUES ($1, $2, $3, $4, $5, $6)
				 ON CONFLICT (addon_key) DO UPDATE SET
				   addon_name = EXCLUDED.addon_name,
				   minutes = EXCLUDED.minutes,
				   price = EXCLUDED.price,
				   active = EXCLUDED.active,
				   updated_at = NOW()`,
				randomUUID(),
				addonKey,
				bundleName,
				minutes,
				price,
				bundle.active !== false,
			);
		}
	}

	if (normalizedInput.platformFee !== undefined) {
		const rawPlatformFee: any = normalizedInput.platformFee as any;
		const resolvedPlatformFee =
			rawPlatformFee && typeof rawPlatformFee === 'object'
				? rawPlatformFee.monthlyFee ?? rawPlatformFee.monthly_fee
				: rawPlatformFee;

		if (resolvedPlatformFee !== undefined && !Number.isNaN(Number(resolvedPlatformFee))) {
			await db.$executeRawUnsafe(`UPDATE platform_subscription SET price = $1 WHERE plan_key = 'monthly'`, Number(resolvedPlatformFee));
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
	const allPlans = await db.$queryRawUnsafe(`SELECT * FROM platform_subscription ORDER BY plan_key ASC`);

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
		platformPlans: (allPlans as any[]).map((p: any) => ({
			id: p.id,
			planKey: p.plan_key,
			planName: p.plan_name,
			price: p.price,
			billingCycle: p.billing_cycle,
			description: p.description ?? null,
			active: Boolean(p.active),
		})),
		platformFee:
			(allPlans as any[])
				.filter((p: any) => String(p.plan_key) === 'monthly')
				.map((p: any) => ({
					id: p.id,
					planName: p.plan_name,
					monthlyFee: p.price,
					description: p.description ?? null,
					active: Boolean(p.active),
					effectiveFrom: null,
					effectiveTo: null,
				}))[0] || null,
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
