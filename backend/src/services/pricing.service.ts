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
			plan_name VARCHAR(100) NOT NULL,
			monthly_fee INTEGER NOT NULL,
			description TEXT,
			active BOOLEAN NOT NULL DEFAULT TRUE,
			effective_from TIMESTAMP NOT NULL DEFAULT NOW(),
			effective_to TIMESTAMP,
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
			effective_from TIMESTAMP NOT NULL DEFAULT NOW(),
			effective_to TIMESTAMP,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
			UNIQUE(provider_type, duration_minutes)
		);
	`);

	await db.$executeRawUnsafe(`
		CREATE TABLE IF NOT EXISTS premium_bundles (
			id TEXT PRIMARY KEY,
			bundle_name VARCHAR(100) NOT NULL,
			minutes INTEGER NOT NULL,
			price INTEGER NOT NULL,
			active BOOLEAN NOT NULL DEFAULT TRUE,
			effective_from TIMESTAMP NOT NULL DEFAULT NOW(),
			effective_to TIMESTAMP,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
			UNIQUE(bundle_name, minutes)
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
		CREATE TABLE IF NOT EXISTS user_subscriptions (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			plan_id TEXT REFERENCES platform_subscription(id) ON DELETE SET NULL,
			start_date DATE NOT NULL,
			end_date DATE,
			status VARCHAR(50) NOT NULL,
			price_snapshot INTEGER,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW()
		);
	`);

	await db.$executeRawUnsafe(`
		CREATE TABLE IF NOT EXISTS premium_minutes (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			minutes_total INTEGER NOT NULL,
			minutes_used INTEGER NOT NULL DEFAULT 0,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW()
		);
	`);

	await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_platform_subscription_active ON platform_subscription(active, effective_from DESC);');
	await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_session_pricing_active ON session_pricing(active, provider_type, duration_minutes);');
	await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_premium_bundles_active ON premium_bundles(active, minutes);');

	const platformRows = (await db.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM platform_subscription')) as Array<{ count: number }>;
	if (Number(platformRows?.[0]?.count || 0) === 0) {
		await db.$executeRawUnsafe(
			`INSERT INTO platform_subscription (id, plan_name, monthly_fee, description, active, effective_from, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW(), NOW())`,
			randomUUID(),
			'Standard Access',
			199,
			'MANAS360 platform access plan',
		);
	}

	const sessionRows = (await db.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM session_pricing')) as Array<{ count: number }>;
	if (Number(sessionRows?.[0]?.count || 0) === 0) {
		const seedRows: SessionPricingInput[] = [
			{ providerType: 'clinical-psychologist', durationMinutes: 45, price: 999 },
			{ providerType: 'clinical-psychologist', durationMinutes: 60, price: 1499 },
			{ providerType: 'psychiatrist', durationMinutes: 45, price: 1499 },
			{ providerType: 'psychiatrist', durationMinutes: 60, price: 2499 },
			{ providerType: 'specialized-therapist', durationMinutes: 45, price: 1299 },
			{ providerType: 'specialized-therapist', durationMinutes: 60, price: 1999 },
		];
		for (const row of seedRows) {
			const providerShare = Math.round(row.price * 0.6);
			await db.$executeRawUnsafe(
				`INSERT INTO session_pricing
				 (id, provider_type, duration_minutes, price, provider_share, platform_share, active, effective_from, created_at, updated_at)
				 VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW(), NOW())`,
				randomUUID(),
				normalizeProviderType(row.providerType),
				row.durationMinutes,
				row.price,
				providerShare,
				row.price - providerShare,
			);
		}
	}

	const bundleRows = (await db.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM premium_bundles')) as Array<{ count: number }>;
	if (Number(bundleRows?.[0]?.count || 0) === 0) {
		const seedBundles: PremiumBundleInput[] = [
			{ bundleName: '1 Hour Bundle', minutes: 60, price: 499 },
			{ bundleName: '2 Hour Bundle', minutes: 120, price: 899 },
			{ bundleName: '3 Hour Bundle', minutes: 180, price: 1450 },
		];
		for (const row of seedBundles) {
			await db.$executeRawUnsafe(
				`INSERT INTO premium_bundles
				 (id, bundle_name, minutes, price, active, effective_from, created_at, updated_at)
				 VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW(), NOW())`,
				randomUUID(),
				row.bundleName,
				row.minutes,
				row.price,
			);
		}
	}

	await db.$executeRawUnsafe(
		`INSERT INTO system_settings (key, value, updated_at)
		 VALUES ('preferred_time_surcharge', '20', NOW())
		 ON CONFLICT (key)
		 DO NOTHING`,
	);

	initialized = true;
};

export const getPricingConfig = async () => {
	await ensurePricingTables();

	const platformRows = (await db.$queryRawUnsafe(
		`SELECT id, plan_name, monthly_fee, description, active, effective_from, effective_to
		 FROM platform_subscription
		 WHERE active = TRUE
		 ORDER BY updated_at DESC
		 LIMIT 1`,
	)) as any[];

	const sessionRows = (await db.$queryRawUnsafe(
		`SELECT id, provider_type, duration_minutes, price, provider_share, platform_share, active, effective_from, effective_to
		 FROM session_pricing
		 WHERE active = TRUE
		 ORDER BY provider_type ASC, duration_minutes ASC`,
	)) as any[];

	const bundleRows = (await db.$queryRawUnsafe(
		`SELECT id, bundle_name, minutes, price, active, effective_from, effective_to
		 FROM premium_bundles
		 WHERE active = TRUE
		 ORDER BY minutes ASC`,
	)) as any[];

	const settingRows = (await db.$queryRawUnsafe(
		`SELECT key, value FROM system_settings WHERE key = 'preferred_time_surcharge' LIMIT 1`,
	)) as any[];

	const activePlan = platformRows?.[0] || null;
	const surchargePercent = Number(settingRows?.[0]?.value || 20);

	return {
		platformFee: activePlan
			? {
				id: String(activePlan.id),
				planName: String(activePlan.plan_name),
				monthlyFee: Number(activePlan.monthly_fee || 0),
				description: activePlan.description ? String(activePlan.description) : null,
				active: Boolean(activePlan.active),
				effectiveFrom: toIso(activePlan.effective_from),
				effectiveTo: toIso(activePlan.effective_to),
			}
			: null,
		sessionPricing: sessionRows.map((row) => ({
			id: String(row.id),
			providerType: String(row.provider_type),
			durationMinutes: Number(row.duration_minutes || 0),
			price: Number(row.price || 0),
			providerShare: Number(row.provider_share || 0),
			platformShare: Number(row.platform_share || 0),
			active: Boolean(row.active),
			effectiveFrom: toIso(row.effective_from),
			effectiveTo: toIso(row.effective_to),
		})),
		premiumBundles: bundleRows.map((row) => ({
			id: String(row.id),
			bundleName: String(row.bundle_name),
			minutes: Number(row.minutes || 0),
			price: Number(row.price || 0),
			active: Boolean(row.active),
			effectiveFrom: toIso(row.effective_from),
			effectiveTo: toIso(row.effective_to),
		})),
		surchargePercent,
	};
};

export const updatePricingConfig = async (input: UpdatePricingInput, _adminUserId?: string) => {
	await ensurePricingTables();

	const platformFee = input.platformFee ?? input.platform_fee;
	if (platformFee !== undefined && Number.isFinite(Number(platformFee)) && Number(platformFee) >= 0) {
		const existingRows = (await db.$queryRawUnsafe(
			`SELECT id FROM platform_subscription WHERE active = TRUE ORDER BY updated_at DESC LIMIT 1`,
		)) as any[];
		const existingId = existingRows?.[0]?.id ? String(existingRows[0].id) : null;

		if (existingId) {
			await db.$executeRawUnsafe(
				`UPDATE platform_subscription SET monthly_fee = $1, updated_at = NOW() WHERE id = $2`,
				Number(platformFee),
				existingId,
			);
		}
	}

	const sessionPricing = Array.isArray(input.sessionPricing)
		? input.sessionPricing
		: Array.isArray(input.session_pricing)
			? input.session_pricing
			: [];

	for (const item of sessionPricing) {
		const providerType = normalizeProviderType(item.providerType);
		const durationMinutes = Number(item.durationMinutes || 0);
		const price = Number(item.price || 0);
		if (!providerType || !durationMinutes || !Number.isFinite(price) || price < 0) continue;

		const providerShare = Number.isFinite(Number(item.providerShare))
			? Number(item.providerShare)
			: Math.round(price * 0.6);
		const platformShare = Number.isFinite(Number(item.platformShare))
			? Number(item.platformShare)
			: price - providerShare;
		const active = item.active === undefined ? true : Boolean(item.active);

		await db.$executeRawUnsafe(
			`INSERT INTO session_pricing (id, provider_type, duration_minutes, price, provider_share, platform_share, active, effective_from, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW())
			 ON CONFLICT (provider_type, duration_minutes)
			 DO UPDATE SET
				price = EXCLUDED.price,
				provider_share = EXCLUDED.provider_share,
				platform_share = EXCLUDED.platform_share,
				active = EXCLUDED.active,
				updated_at = NOW()`,
			randomUUID(),
			providerType,
			durationMinutes,
			price,
			providerShare,
			platformShare,
			active,
		);
	}

	const premiumBundles = Array.isArray(input.premiumBundles)
		? input.premiumBundles
		: Array.isArray(input.premium_bundles)
			? input.premium_bundles
			: [];

	for (const item of premiumBundles) {
		const bundleName = String(item.bundleName || '').trim();
		const minutes = Number(item.minutes || 0);
		const price = Number(item.price || 0);
		if (!bundleName || !minutes || !Number.isFinite(price) || price < 0) continue;
		const active = item.active === undefined ? true : Boolean(item.active);

		await db.$executeRawUnsafe(
			`INSERT INTO premium_bundles (id, bundle_name, minutes, price, active, effective_from, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())
			 ON CONFLICT (bundle_name, minutes)
			 DO UPDATE SET
				price = EXCLUDED.price,
				active = EXCLUDED.active,
				updated_at = NOW()`,
			randomUUID(),
			bundleName,
			minutes,
			price,
			active,
		);
	}

	const surcharge = input.preferredTimeSurcharge ?? input.preferred_time_surcharge;
	if (surcharge !== undefined && Number.isFinite(Number(surcharge))) {
		await db.$executeRawUnsafe(
			`INSERT INTO system_settings (key, value, updated_at)
			 VALUES ('preferred_time_surcharge', $1, NOW())
			 ON CONFLICT (key)
			 DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
			String(Number(surcharge)),
		);
	}

	return getPricingConfig();
};

export const getSessionQuote = async (input: {
	providerType?: string;
	durationMinutes?: number;
	preferredTime?: boolean;
}) => {
	await ensurePricingTables();
	const providerType = normalizeProviderType(input.providerType || 'clinical-psychologist');
	const duration = input.durationMinutes && input.durationMinutes > 0 ? Math.floor(input.durationMinutes) : 45;
	const preferredTime = Boolean(input.preferredTime);

	const row = (await db.$queryRawUnsafe(
		`SELECT provider_type, duration_minutes, price
		 FROM session_pricing
		 WHERE active = TRUE AND provider_type = $1 AND duration_minutes = $2
		 LIMIT 1`,
		providerType,
		duration,
	)) as any[];

	const fallbackRow = (await db.$queryRawUnsafe(
		`SELECT provider_type, duration_minutes, price
		 FROM session_pricing
		 WHERE active = TRUE AND provider_type = $1
		 ORDER BY ABS(duration_minutes - $2) ASC
		 LIMIT 1`,
		providerType,
		duration,
	)) as any[];

	const selectedRow = row?.[0] || fallbackRow?.[0] || null;
	const basePrice = Number(selectedRow?.price || 999);

	const settingRows = (await db.$queryRawUnsafe(
		`SELECT value FROM system_settings WHERE key = 'preferred_time_surcharge' LIMIT 1`,
	)) as any[];
	const surchargePercent = Number(settingRows?.[0]?.value || 20);
	const finalPrice = preferredTime ? Math.round(basePrice * (1 + surchargePercent / 100)) : basePrice;

	return {
		providerType: String(selectedRow?.provider_type || providerType),
		durationMinutes: Number(selectedRow?.duration_minutes || duration),
		basePrice,
		surchargePercent,
		preferredTime,
		finalPrice,
	};
};

export const getActivePlatformPlan = async () => {
	const config = await getPricingConfig();
	const plan = config.platformFee;
	if (!plan) {
		return {
			id: null,
			planName: 'Standard Access',
			monthlyFee: 199,
		};
	}

	return {
		id: plan.id,
		planName: plan.planName,
		monthlyFee: Number(plan.monthlyFee || 199),
	};
};

export const getAdminPricingConfigWithImpact = async () => {
	const config = await getPricingConfig();
	const activePrice = Number(config.platformFee?.monthlyFee || 0);

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
