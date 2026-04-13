type NodeEnv = 'development' | 'test' | 'production' | 'staging';

const parseNodeEnv = (value: string | undefined): NodeEnv => {
	if (value === 'development' || value === 'test' || value === 'production' || value === 'staging') {
		return value;
	}

	return 'development';
};

const parsePort = (value: string | undefined): number => {
	const parsedPort = Number(value);

	if (Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
		return parsedPort;
	}

	return 3000;
};

const parseBoolean = (value: string | undefined, fallback = false): boolean => {
	if (value === undefined) {
		return fallback;
	}

	return value === 'true';
};

const parseNumber = (value: string | undefined, fallback: number): number => {
	const parsed = Number(value);

	if (Number.isFinite(parsed) && parsed > 0) {
		return parsed;
	}

	return fallback;
};

const parseCorsOrigins = (value: string | undefined): string[] => {
	const raw = value ?? 'http://localhost:5173';
	const parsed = raw
		.split(',')
		.map((origin) => origin.trim())
		.filter((origin) => origin.length > 0)
		.map((origin) => origin.replace(/\/+$/, ''));

	return Array.from(new Set(parsed));
};

const parseFrontendUrl = (value: string | undefined, corsOrigins: string[]): string => {
	const explicit = String(value ?? '').trim();
	if (explicit.length > 0) {
		return explicit.replace(/\/+$/, '');
	}

	const firstCors = String(corsOrigins[0] ?? '').trim();
	if (firstCors.length > 0) {
		return firstCors.replace(/\/+$/, '');
	}

	return 'http://localhost:5173';
};

const parseApiUrl = (value: string | undefined, port: number): string => {
	const explicit = String(value ?? '').trim();
	if (explicit.length > 0) {
		return explicit.replace(/\/+$/, '');
	}

	return `http://localhost:${port}`;
};

const JWT_ACCESS_FALLBACK = 'change-access-secret';
const JWT_REFRESH_FALLBACK = 'change-refresh-secret';

export interface EnvConfig {
	nodeEnv: NodeEnv;
	isDevelopment: boolean;
	port: number;
	apiPrefix: string;
	apiUrl: string;
	corsOrigins: string[];
	frontendUrl: string;
	databaseUrl?: string;
	jwtAccessSecret: string;
	jwtRefreshSecret: string;
	jwtAccessExpiresIn: string;
	jwtRefreshExpiresIn: string;
	cookieDomain?: string;
	cookieSecure: boolean;
	refreshCookieName: string;
	csrfCookieName: string;
	otpTtlMinutes: number;
	resetOtpTtlMinutes: number;
	maxLoginAttempts: number;
	lockoutWindowMinutes: number;
	googleClientId?: string;
	mfaIssuer: string;
	awsRegion: string;
	awsS3Bucket: string;
	awsAccessKeyId?: string;
	awsSecretAccessKey?: string;
	awsS3Endpoint?: string;
	awsS3ForcePathStyle: boolean;
	profilePhotoSignedUrlTtlSeconds: number;
	therapistDocumentSignedUrlTtlSeconds: number;
	exportSignedUrlTtlSeconds: number;
	sessionNotesEncryptionKey: string;
	redisUrl: string;
	analyticsRollupIntervalSeconds?: number;
	// When true, the server should not start the periodic metrics push cron
	disableMetricsCron: boolean;
	disableAuthRateLimit: boolean;
	// When true, disable adding ServerSideEncryption header for S3 uploads (useful for MinIO)
	awsS3DisableServerSideEncryption: boolean;
	phonePeWebhookUsername?: string;
	phonePeWebhookPassword?: string;
	paymentProviderSharePercent: number;
	paymentPlatformSharePercent: number;
	webhookIdempotencyTtlSeconds: number;
	minPayoutMinor: number;
	secretEncryptionKey?: string;
	allowDevVerificationBypass: boolean;
	allowDevPaymentBypass: boolean;
	allowDevPhonePeWebhookProbeBypass: boolean;
	allowPhonePeWebhookIpBypass: boolean;
	subscriptionPaymentBypass: boolean;
	freesoundApiKey?: string;
	// Verification / provider checks
	nmcApiUrl?: string;
	nmcApiKey?: string;
	verificationTimeoutMs: number;
	smcApiMap: Record<string, string>;
}

const parsedCorsOrigins = parseCorsOrigins(process.env.CORS_ORIGIN);

export const env: EnvConfig = Object.freeze({
	nodeEnv: parseNodeEnv(process.env.NODE_ENV),
	isDevelopment: parseNodeEnv(process.env.NODE_ENV) === 'development',
	port: parsePort(process.env.PORT),
	apiPrefix: process.env.API_PREFIX ?? '/api',
	apiUrl: parseApiUrl(process.env.API_URL, parsePort(process.env.PORT)),
	corsOrigins: parsedCorsOrigins,
	frontendUrl: parseFrontendUrl(process.env.FRONTEND_URL, parsedCorsOrigins),
	databaseUrl: process.env.DATABASE_URL,
	jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? JWT_ACCESS_FALLBACK,
	jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? JWT_REFRESH_FALLBACK,
	jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
	jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
	cookieDomain: process.env.COOKIE_DOMAIN,
	cookieSecure: parseBoolean(process.env.COOKIE_SECURE),
	refreshCookieName: process.env.REFRESH_COOKIE_NAME ?? 'refresh_token',
	csrfCookieName: process.env.CSRF_COOKIE_NAME ?? 'csrf_token',
	otpTtlMinutes: parseNumber(process.env.OTP_TTL_MINUTES, 10),
	resetOtpTtlMinutes: parseNumber(process.env.RESET_OTP_TTL_MINUTES, 15),
	maxLoginAttempts: parseNumber(process.env.MAX_LOGIN_ATTEMPTS, 5),
	lockoutWindowMinutes: parseNumber(process.env.LOCKOUT_WINDOW_MINUTES, 15),
	googleClientId: process.env.GOOGLE_CLIENT_ID,
	mfaIssuer: process.env.MFA_ISSUER ?? 'manas360',
	awsRegion: process.env.AWS_REGION ?? 'ap-south-1',
	awsS3Bucket: process.env.AWS_S3_BUCKET ?? '',
	awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
	awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	awsS3Endpoint: process.env.AWS_S3_ENDPOINT,
	awsS3ForcePathStyle: parseBoolean(process.env.AWS_S3_FORCE_PATH_STYLE, false),
	// When true, disable adding ServerSideEncryption header for S3 uploads (useful for MinIO)
	awsS3DisableServerSideEncryption: parseBoolean(process.env.AWS_S3_DISABLE_SERVER_SIDE_ENCRYPTION, false),
	profilePhotoSignedUrlTtlSeconds: parseNumber(process.env.PROFILE_PHOTO_SIGNED_URL_TTL_SECONDS, 900),
	therapistDocumentSignedUrlTtlSeconds: parseNumber(process.env.THERAPIST_DOCUMENT_SIGNED_URL_TTL_SECONDS, 900),
	exportSignedUrlTtlSeconds: parseNumber(process.env.EXPORT_SIGNED_URL_TTL_SECONDS, 3600),
	sessionNotesEncryptionKey: process.env.SESSION_NOTES_ENCRYPTION_KEY ?? '',
	redisUrl: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
	analyticsRollupIntervalSeconds: parseNumber(process.env.ANALYTICS_ROLLUP_INTERVAL_SECONDS, 3600),
	// When true, disable the periodic metrics push cron (useful during migrations)
	disableMetricsCron: parseBoolean(process.env.DISABLE_METRICS_CRON, false),
	disableAuthRateLimit: parseBoolean(process.env.DISABLE_AUTH_RATE_LIMIT, false),
	phonePeWebhookUsername: process.env.PHONEPE_WEBHOOK_USERNAME,
	phonePeWebhookPassword: process.env.PHONEPE_WEBHOOK_PASSWORD,
	paymentProviderSharePercent: parseNumber(process.env.PAYMENT_PROVIDER_SHARE_PERCENT, 60),
	paymentPlatformSharePercent: parseNumber(process.env.PAYMENT_PLATFORM_SHARE_PERCENT, 40),
	webhookIdempotencyTtlSeconds: parseNumber(process.env.WEBHOOK_IDEMPOTENCY_TTL_SECONDS, 3600),
	minPayoutMinor: parseNumber(process.env.MIN_PAYOUT_MINOR, 10000),
	secretEncryptionKey: process.env.SECRET_ENCRYPTION_KEY ?? undefined,
	allowDevVerificationBypass: parseBoolean(process.env.DEV_VERIFICATION_BYPASS, parseNodeEnv(process.env.NODE_ENV) === 'development'),
	allowDevPaymentBypass: parseBoolean(process.env.DEV_PAYMENT_BYPASS, parseNodeEnv(process.env.NODE_ENV) === 'development'),
	allowDevPhonePeWebhookProbeBypass: parseBoolean(process.env.PHONEPE_WEBHOOK_PROBE_BYPASS, false),
	allowPhonePeWebhookIpBypass: parseBoolean(process.env.PHONEPE_WEBHOOK_IP_BYPASS, false),
	subscriptionPaymentBypass: parseBoolean(process.env.SUBSCRIPTION_PAYMENT_BYPASS, false),
	freesoundApiKey: process.env.FREESOUND_API_KEY,
	// Verification endpoints and timeouts
	nmcApiUrl: process.env.NMC_API_URL ?? 'https://www.nmc.org.in/MCIRest/open/getDataFromService?service=searchDoctor',
	nmcApiKey: process.env.NMC_API_KEY ?? undefined,
	verificationTimeoutMs: parseNumber(process.env.VERIFICATION_TIMEOUT_MS, 10000),
	smcApiMap: (() => {
		const raw = String(process.env.SMC_API_MAP || '').trim();
		if (!raw) return {} as Record<string, string>;
		try {
			return JSON.parse(raw);
		} catch (e) {
			return raw.split(',').map(s => s.trim()).filter(Boolean).reduce((acc: Record<string,string>, pair) => {
				const [k, v] = pair.split('=');
				if (k && v) acc[k.trim()] = v.trim();
				return acc;
			}, {} as Record<string,string>);
		}
	})(),
});

if (
	(env.nodeEnv === 'production' || env.nodeEnv === 'staging')
	&& (env.jwtAccessSecret === JWT_ACCESS_FALLBACK || env.jwtRefreshSecret === JWT_REFRESH_FALLBACK)
) {
	throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be configured for staging/production');
}

if (env.nodeEnv === 'production' || env.nodeEnv === 'staging') {
	const hasMerchantId = Boolean(String(process.env.PHONEPE_MERCHANT_ID || '').trim());
	const hasOAuth = Boolean(String(process.env.PHONEPE_CLIENT_ID || '').trim())
		&& Boolean(String(process.env.PHONEPE_CLIENT_SECRET || '').trim());
	const hasSaltFlow = Boolean(String(process.env.PHONEPE_SALT_KEY || '').trim())
		&& Boolean(String(process.env.PHONEPE_SALT_INDEX || '').trim());

	if (!hasMerchantId) {
		throw new Error('PHONEPE_MERCHANT_ID must be configured for staging/production');
	}

	if (!hasOAuth && !hasSaltFlow) {
		throw new Error('PhonePe config invalid: set PHONEPE_CLIENT_ID + PHONEPE_CLIENT_SECRET (OAuth V2) or PHONEPE_SALT_KEY + PHONEPE_SALT_INDEX');
	}
}
