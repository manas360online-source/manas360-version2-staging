import { randomUUID } from 'crypto';
import { prisma } from '../config/db';
import { PATIENT_PLANS } from '../config/patientPlans';
import { getPlatformConfig, upsertPlatformConfig } from './platform-config.service';

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

type CommissionSplit = {
	providerPercent: number;
	platformPercent: number;
};

type PricingMode = 'domestic' | 'nri';

const NRI_PLATFORM_PLANS = [
	{ key: 'saathi', name: 'Saathi', price: 4100, billingCycle: 'monthly', description: 'NRI group-only support plan' },
	{ key: 'bandham', name: 'Bandham', price: 8300, billingCycle: 'monthly', description: 'NRI individual + group support plan' },
	{ key: 'kutumbam', name: 'Kutumbam', price: 15000, billingCycle: 'monthly', description: 'NRI family support plan' },
];

const NRI_SESSION_PRICING = [
	{ providerType: 'nri-therapist', durationMinutes: 50, price: 3599, providerShare: 2159, platformShare: 1440, active: true },
	{ providerType: 'nri-psychologist', durationMinutes: 50, price: 2999, providerShare: 1799, platformShare: 1200, active: true },
	{ providerType: 'nri-psychiatrist', durationMinutes: 30, price: 3499, providerShare: 2099, platformShare: 1400, active: true },
	{ providerType: 'nri-coach', durationMinutes: 50, price: 2999, providerShare: 1799, platformShare: 1200, active: true },
];

const NRI_BASE_PRICE_FALLBACK: Record<string, number> = {
	'nri-coach': 2999,
	'nri-psychologist': 2999,
	'nri-psychiatrist': 3499,
	'nri-therapist': 3599,
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

const normalizePricingPayload = (value: any) => {
	const platformPlans = Array.isArray(value?.platformPlans)
		? value.platformPlans
		: Array.isArray(value?.plans)
			? value.plans
			: [];
	const sessionPricing = Array.isArray(value?.sessionPricing) ? value.sessionPricing : [];
	const premiumBundles = Array.isArray(value?.premiumBundles) ? value.premiumBundles : [];
	const surchargePercent = Number(value?.surchargePercent ?? 0);

	return {
		platformFee: value?.platformFee ?? null,
		plans: platformPlans.map((plan: any) => ({
			id: plan.id ?? null,
			key: plan.planKey ?? plan.key ?? plan.plan_key ?? '',
			name: plan.planName ?? plan.name ?? plan.plan_name ?? '',
			price: Number(plan.price ?? 0),
			billingCycle: plan.billingCycle ?? plan.billing_cycle ?? 'monthly',
			active: plan.active !== false,
			description: plan.description ?? null,
		})),
		sessions: sessionPricing.map((session: any) => ({
			providerType: session.providerType ?? session.provider_type ?? 'therapist',
			duration: Number(session.durationMinutes ?? session.duration ?? 0),
			price: Number(session.price ?? 0),
		})),
		sessionPricing: sessionPricing.map((session: any) => ({
			id: session.id ?? null,
			providerType: session.providerType ?? session.provider_type ?? 'therapist',
			durationMinutes: Number(session.durationMinutes ?? session.duration ?? 0),
			price: Number(session.price ?? 0),
			providerShare: Number(session.providerShare ?? 0),
			platformShare: Number(session.platformShare ?? 0),
			active: session.active !== false,
			effectiveFrom: session.effectiveFrom ?? null,
			effectiveTo: session.effectiveTo ?? null,
		})),
		addons: premiumBundles.map((bundle: any) => ({
			key: bundle.bundleKey ?? bundle.bundle_key ?? bundle.bundleName ?? bundle.bundle_name ?? '',
			name: bundle.bundleName ?? bundle.bundle_name ?? '',
			price: Number(bundle.price ?? 0),
		})),
		premiumBundles: premiumBundles.map((bundle: any) => ({
			id: bundle.id ?? null,
			bundleName: bundle.bundleName ?? bundle.bundle_name ?? '',
			minutes: Number(bundle.minutes ?? 0),
			price: Number(bundle.price ?? 0),
			active: bundle.active !== false,
			effectiveFrom: bundle.effectiveFrom ?? null,
			effectiveTo: bundle.effectiveTo ?? null,
		})),
		surchargePercent: Number.isFinite(surchargePercent) ? surchargePercent : 0,
	};
};

const getPricingConfigFromTables = async () => {
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
			price: s.price,
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
			price: a.price,
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
		surchargePercent,
	};
};

const buildPlatformPricingPayload = (value: any) => ({
	platformFee: value.platformFee ?? null,
	platformPlans: (value.plans || []).map((plan: any) => ({
		planKey: plan.key ?? plan.planKey ?? '',
		planName: plan.name ?? plan.planName ?? '',
		price: Number(plan.price ?? 0),
		billingCycle: plan.billingCycle ?? 'monthly',
		description: plan.description ?? null,
		active: plan.active !== false,
	})),
	sessionPricing: value.sessionPricing ?? [],
	premiumBundles: value.premiumBundles ?? [],
	surchargePercent: Number(value.surchargePercent ?? 0),
});

const normalizeCommissionSplit = (input: any): CommissionSplit | null => {
	const providerPercent = Number(input?.providerPercent ?? input?.provider ?? input?.provider_share);
	const platformPercent = Number(input?.platformPercent ?? input?.platform ?? input?.platform_share);

	if (!Number.isFinite(providerPercent) || !Number.isFinite(platformPercent)) {
		return null;
	}
	if (providerPercent < 0 || providerPercent > 100 || platformPercent < 0 || platformPercent > 100) {
		return null;
	}
	if (Math.round(providerPercent + platformPercent) !== 100) {
		return null;
	}

	return { providerPercent, platformPercent };
};

const buildNriPricingPayload = () => ({
	mode: 'nri',
	pricingMode: 'nri',
	platformFee: NRI_PLATFORM_PLANS.find((plan) => plan.key === 'bandham') ?? null,
	plans: NRI_PLATFORM_PLANS.map((plan) => ({
		id: plan.key,
		key: plan.key,
		name: plan.name,
		price: plan.price,
		billingCycle: plan.billingCycle,
		active: true,
		description: plan.description,
	})),
	platformPlans: NRI_PLATFORM_PLANS.map((plan) => ({
		id: plan.key,
		planKey: plan.key,
		planName: plan.name,
		price: plan.price,
		billingCycle: plan.billingCycle,
		description: plan.description,
		active: true,
	})),
	sessionPricing: NRI_SESSION_PRICING.map((row) => ({
		providerType: row.providerType,
		durationMinutes: row.durationMinutes,
		price: row.price,
		providerShare: row.providerShare,
		platformShare: row.platformShare,
		active: row.active,
	})),
	premiumBundles: [
		{ bundleName: 'Family Care Gift Session', minutes: 60, price: 1999, active: true },
		{ bundleName: 'Timezone Priority Scheduling', minutes: 0, price: 999, active: true },
	],
	specialtyServices: [
		{ key: 'nri_coach', title: 'NRI Coach', standardPrice: 2999, videoPrice: 3299, durationMinutes: 50 },
		{ key: 'nri_psychologist', title: 'NRI - Psychologist', standardPrice: 2999, videoPrice: 3299, durationMinutes: 50 },
		{ key: 'nri_psychiatrist', title: 'NRI - Psychiatrist', standardPrice: 3499, videoPrice: 3849, durationMinutes: 30 },
		{ key: 'nri_therapist', title: 'NRI - Therapist', standardPrice: 3599, videoPrice: 3959, durationMinutes: 50 },
	],
	videoSurchargePercent: 10,
	surchargePercent: 0,
	timezoneWindows: {
		US_EST: { local: '18:00-21:00', ist: '03:30-06:30' },
		US_PST: { local: '18:00-21:00', ist: '06:30-09:30' },
		UK_GMT: { local: '18:00-21:00', ist: '23:30-02:30' },
		AU_AEST: { local: '18:00-21:00', ist: '12:30-15:30' },
		SG_SGT: { local: '19:00-22:00', ist: '16:30-19:30' },
		UAE_GST: { local: '19:00-22:00', ist: '20:30-23:30' },
	},
});

const getDefaultCommissionSplit = async (): Promise<CommissionSplit | null> => {
	const config = await getPlatformConfig('commission', { allowMissing: true });
	if (!config?.value || typeof config.value !== 'object') {
		return null;
	}

	const value = config.value as any;
	return normalizeCommissionSplit(value.default || value.base || value);
};

export const getPricingConfig = async (input?: { mode?: PricingMode }) => {
	if (String(input?.mode || '').toLowerCase() === 'nri') {
		return buildNriPricingPayload();
	}

	const platformConfig = await getPlatformConfig('pricing', { allowMissing: true });
	if (platformConfig?.value && typeof platformConfig.value === 'object') {
		return {
			...normalizePricingPayload(platformConfig.value as any),
			pricingMode: 'domestic',
		};
	}

	return {
		...(await getPricingConfigFromTables()),
		pricingMode: 'domestic',
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

export const updatePricingConfig = async (input: any, updatedById?: string | null) => {
	await ensurePricingTables();
	const defaultCommissionSplit = await getDefaultCommissionSplit();

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
			`INSERT INTO system_settings (key, value)
			 VALUES ('preferred_time_surcharge', $1)
			 ON CONFLICT (key) DO UPDATE SET
			   value = EXCLUDED.value,
			   updated_at = NOW()`,
			String(val),
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
			if (!Number.isFinite(price) || price < 0) continue;

			const explicitProviderShare = Number((session as any).providerShare);
			const explicitPlatformShare = Number((session as any).platformShare);
			const hasExplicitProvider = Number.isFinite(explicitProviderShare);
			const hasExplicitPlatform = Number.isFinite(explicitPlatformShare);

			let providerShare = 0;
			let platformShare = 0;

			if (hasExplicitProvider || hasExplicitPlatform) {
				if (hasExplicitProvider && hasExplicitPlatform) {
					providerShare = explicitProviderShare;
					platformShare = explicitPlatformShare;
				} else if (hasExplicitProvider) {
					providerShare = explicitProviderShare;
					platformShare = price - providerShare;
				} else {
					platformShare = explicitPlatformShare;
					providerShare = price - platformShare;
				}

				if (providerShare < 0 || platformShare < 0 || Math.round(providerShare + platformShare) !== price) {
					throw new Error(`Invalid explicit session split for ${session.providerType}/${duration}`);
				}
			} else {
				if (!defaultCommissionSplit) {
					throw new Error('Missing default commission config. Configure key "commission" before updating session pricing without explicit shares.');
				}
				platformShare = Math.round((price * defaultCommissionSplit.platformPercent) / 100);
				providerShare = price - platformShare;
			}

			await db.$executeRawUnsafe(
				`INSERT INTO session_pricing (id, provider_type, duration_minutes, price, provider_share, platform_share, active)
				 VALUES ($1, $2, $3, $4, $5, $6, $7)
				 ON CONFLICT (provider_type, duration_minutes) DO UPDATE SET
				   price = EXCLUDED.price,
				   provider_share = EXCLUDED.provider_share,
				   platform_share = EXCLUDED.platform_share,
				   active = EXCLUDED.active,
				   updated_at = NOW()`,
				randomUUID(),
				session.providerType,
				duration,
				price,
				providerShare,
				platformShare,
				session.active !== false,
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

	const latest = await getPricingConfigFromTables();
	await upsertPlatformConfig({
		key: 'pricing',
		value: buildPlatformPricingPayload(latest),
		updatedById: updatedById ?? null,
	});

	return getPricingConfig();
};

export const getSessionQuote = async (input: { providerType?: string; durationMinutes?: number; preferredTime?: boolean }) => {
	await ensurePricingTables();
	const type = normalizeProviderType(input.providerType || 'therapist');
	const duration = input.durationMinutes || 45;
	const row = (await db.$queryRawUnsafe(`SELECT price FROM session_pricing WHERE provider_type = $1 AND duration_minutes = $2 AND active = TRUE`, type, duration)) as any[];
	const nriFallbackPrice = NRI_BASE_PRICE_FALLBACK[type];
	const basePrice = row?.[0]?.price || nriFallbackPrice || (type.includes('psychiatrist') ? 999 : 500);
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
		if (planKey) {
			const fallback = (PATIENT_PLANS as Record<string, { price: number }>)[resolvedPlanKey];
			if (fallback) {
				return {
					key: resolvedPlanKey,
					name: resolvedPlanKey.replace(/_/g, ' '),
					price: Number(fallback.price || 0),
				};
			}
			return null;
		}
		return { key: 'free', name: 'Free Tier', price: 0 };
	}
	return { key: row[0].plan_key, name: row[0].plan_name, price: row[0].price };
};

export const getPricingConfigVersion = async (): Promise<number> => {
	const config = await getPlatformConfig('pricing', { allowMissing: true });
	return Number(config?.version || 1);
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
