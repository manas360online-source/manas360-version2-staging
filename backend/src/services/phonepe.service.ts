import crypto from 'crypto';
import axios from 'axios';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

const PHONEPE_MERCHANT_ID = String(process.env.PHONEPE_MERCHANT_ID || 'PGCHECKOUT').trim();
const PHONEPE_SALT_KEY = String(process.env.PHONEPE_SALT_KEY || '').trim();
const PHONEPE_SALT_INDEX = String(process.env.PHONEPE_SALT_INDEX || '1').trim();
const PHONEPE_WEBHOOK_SECRET = String(process.env.PHONEPE_WEBHOOK_SECRET || process.env.PHONEPE_SALT_KEY || '').trim();
const PHONEPE_ENV = String(process.env.PHONEPE_ENV || (env.nodeEnv === 'production' ? 'production' : 'preprod')).trim().toLowerCase();
const PHONEPE_MODE = String(process.env.PHONEPE_MODE || '').trim().toLowerCase();

// Base URL selection priority:
// 1) Explicit PHONEPE_BASE_URL
// 2) PHONEPE_MODE=pgsandbox (simulator)
// 3) PHONEPE_ENV=production|preprod (standard gateway)
const GET_PHONEPE_BASE_URL = () => {
	if (process.env.PHONEPE_BASE_URL) {
		return String(process.env.PHONEPE_BASE_URL).trim();
	}
	if (PHONEPE_MODE === 'pgsandbox' || PHONEPE_MODE === 'simulator') {
		return 'https://api-preprod.phonepe.com/apis/pg-sandbox';
	}
	
	if (PHONEPE_ENV === 'production' || PHONEPE_ENV === 'prod' || PHONEPE_ENV === 'live') {
		return 'https://api.phonepe.com/apis/hermes';
	}
	return 'https://api-preprod.phonepe.com/apis/hermes';
};

const PHONEPE_BASE_URL = GET_PHONEPE_BASE_URL().replace(/\/+$/, '');
const PHONEPE_CLIENT_ID = String(process.env.PHONEPE_CLIENT_ID || '').trim();
const PHONEPE_CLIENT_SECRET = String(process.env.PHONEPE_CLIENT_SECRET || '').trim();
const PHONEPE_CLIENT_VERSION = String(process.env.PHONEPE_CLIENT_VERSION || '1').trim();
const PHONEPE_OAUTH_URL = String(process.env.PHONEPE_OAUTH_URL || '').trim();
// Prefer V2 checkout status endpoint by default; allow override via env
const PHONEPE_STATUS_ENDPOINT_TEMPLATE = String(
	process.env.PHONEPE_STATUS_ENDPOINT_TEMPLATE || '/checkout/v2/order/{merchantTransactionId}/status'
).trim();

if (!PHONEPE_SALT_KEY) {
	if (PHONEPE_CLIENT_ID && PHONEPE_CLIENT_SECRET) {
		logger.info('[PhonePe] PHONEPE_SALT_KEY not set; operating in OAuth-only (V2) mode using client credentials.');
	} else {
		logger.error('[PhonePe] PHONEPE_SALT_KEY is not set and OAuth credentials are not configured. Payment signing and verification will fail.');
		if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
			throw new Error('Missing PHONEPE_SALT_KEY or OAuth credentials in production/staging environment');
		}
	}
}

const sha256 = (input: string): string => crypto.createHash('sha256').update(input).digest('hex');

interface PhonePeToken {
	accessToken: string;
	expiresAt: number; // milliseconds since epoch
}

let cachedPhonePeToken: PhonePeToken | null = null;
let tokenRefreshTimeout: NodeJS.Timeout | null = null;

const scheduleTokenRefresh = (expiresAt: number): void => {
	if (tokenRefreshTimeout) {
		clearTimeout(tokenRefreshTimeout);
	}

	const now = Date.now();
	const refreshLeadTime = 60 * 1000; // 60 seconds before expiry
	const timeUntilRefresh = expiresAt - now - refreshLeadTime;

	if (timeUntilRefresh > 0) {
		tokenRefreshTimeout = setTimeout(async () => {
			logger.info('[PhonePe] Auto-refreshing OAuth token (proactive refresh)');
			await fetchPhonePeToken();
		}, timeUntilRefresh);
	}
};

export const initializePhonePeTokenRefresh = async (): Promise<void> => {
	if (!PHONEPE_CLIENT_ID || !PHONEPE_CLIENT_SECRET) {
		logger.info('[PhonePe] OAuth credentials not configured; skipping token initialization');
		return;
	}

	try {
		logger.info('[PhonePe] Initializing OAuth token on startup');
		const token = await fetchPhonePeToken();
		if (token && cachedPhonePeToken) {
			scheduleTokenRefresh(cachedPhonePeToken.expiresAt);
			logger.info('[PhonePe] Token refresh scheduled', {
				expiresIn: Math.round((cachedPhonePeToken.expiresAt - Date.now()) / 1000),
				seconds: 's',
			});
		}
	} catch (error: any) {
		logger.error('[PhonePe] Token initialization failed', { error: error?.message });
	}
};

export const cleanupPhonePeTokenRefresh = (): void => {
	if (tokenRefreshTimeout) {
		clearTimeout(tokenRefreshTimeout);
		tokenRefreshTimeout = null;
		logger.info('[PhonePe] Token refresh cleanup complete');
	}
};

const getPhonePeOAuthUrl = (): string => {
	if (PHONEPE_OAUTH_URL) return PHONEPE_OAUTH_URL;
	if (PHONEPE_BASE_URL.includes('pgsandbox') || PHONEPE_BASE_URL.includes('pg-sandbox')) {
		return 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token';
	}
	if (PHONEPE_ENV === 'preprod' || PHONEPE_ENV === 'uat') {
		return 'https://api-preprod.phonepe.com/apis/identity-manager/v1/oauth/token';
	}
	return 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token';
};

const isPhonePeTokenExpired = (): boolean => {
	if (!cachedPhonePeToken) return true;
	return Date.now() >= cachedPhonePeToken.expiresAt - 5 * 60 * 1000;
};

const fetchPhonePeToken = async (): Promise<string | null> => {
	if (!PHONEPE_CLIENT_ID || !PHONEPE_CLIENT_SECRET) {
		logger.info('[PhonePe] OAuth credentials not configured; skipping token fetch.');
		return null;
	}

	try {
		const oauthUrl = getPhonePeOAuthUrl();
		const payload = new URLSearchParams();
		payload.append('client_id', PHONEPE_CLIENT_ID);
		payload.append('client_version', PHONEPE_CLIENT_VERSION);
		payload.append('client_secret', PHONEPE_CLIENT_SECRET);
		payload.append('grant_type', 'client_credentials');

		const response = await axios.post(oauthUrl, payload.toString(), {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			timeout: 15000,
		});

		const token = response.data?.access_token;
		const expiresAt = Number(response.data?.expires_at || response.data?.expiresAt || 0) * 1000;
		if (!token || !expiresAt) {
			throw new Error('Invalid PhonePe OAuth response');
		}

		cachedPhonePeToken = { accessToken: token, expiresAt };
		logger.info('[PhonePe] OAuth token fetched', { expiresAt });
		scheduleTokenRefresh(expiresAt);
		return token;
	} catch (error: any) {
		logger.error('[PhonePe] OAuth token fetch failed', {
			message: error?.message,
			response: error?.response?.data,
		});
		return null;
	}
};

const getPhonePeAuthToken = async (): Promise<string | null> => {
	if (isPhonePeTokenExpired()) {
		await fetchPhonePeToken();
	}
	return cachedPhonePeToken?.accessToken ?? null;
};

const getPhonePeAuthorizationHeader = async (): Promise<Record<string, string>> => {
	const token = await getPhonePeAuthToken();
	if (!token) {
		throw new AppError('PhonePe OAuth token unavailable. Check PHONEPE_CLIENT_ID/PHONEPE_CLIENT_SECRET and PHONEPE_OAUTH_URL.', 502);
	}
	return { Authorization: `O-Bearer ${token}` };
};

interface PhonePePaymentRequest {
	merchantId: string;
	merchantTransactionId: string;
	merchantUserId: string;
	amount: number;
	redirectUrl: string;
	redirectMode: 'POST' | 'GET';
	callbackUrl: string;
	mobileNumber?: string;
	paymentInstrument: {
		type: 'PAY_PAGE';
	};
	metadata?: any;
}

export const initiatePhonePePayment = async (input: {
	transactionId: string;
	userId: string;
	amountInPaise: number;
	callbackUrl: string;
	redirectUrl: string;
	metadata?: any;
}) => {
	logger.info('[PhonePe] Initiating payment', {
		transactionId: input.transactionId,
		userId: input.userId,
		amountInPaise: input.amountInPaise,
	});

	const payload: PhonePePaymentRequest = {
		merchantId: PHONEPE_MERCHANT_ID,
		merchantTransactionId: input.transactionId,
		merchantUserId: input.userId,
		amount: input.amountInPaise,
		redirectUrl: input.redirectUrl,
		redirectMode: 'POST',
		callbackUrl: input.callbackUrl,
		metadata: input.metadata,
		paymentInstrument: {
			type: 'PAY_PAGE',
		},
	};

	const endpoint = '/checkout/v2/pay';
	const v2Payload = {
		merchantOrderId: input.transactionId,
		amount: input.amountInPaise,
		paymentFlow: {
			type: 'PG_CHECKOUT',
			merchantUrls: {
				redirectUrl: input.redirectUrl,
			},
		},
		metaInfo: {
			udf1: input.userId,
		},
	};

	try {
		const authHeaders = await getPhonePeAuthorizationHeader();
		const response = await axios.post(
			`${PHONEPE_BASE_URL}${endpoint}`,
			v2Payload,
			{
				headers: {
					'Content-Type': 'application/json',
					'X-CLIENT-ID': PHONEPE_CLIENT_ID,
					'X-MERCHANT-ID': PHONEPE_MERCHANT_ID,
					accept: 'application/json',
					...authHeaders,
				},
				timeout: 15000,
			}
		);

		// PhonePe payloads can arrive in multiple shapes. Prefer top-level first, then nested wrappers.
		const rawResponse = response.data;
		const responseData = rawResponse?.responseData || rawResponse?.data || rawResponse?.response || rawResponse;
		const nestedData = responseData?.data;

		const redirectUrl = rawResponse?.redirectUrl
			|| responseData?.redirectUrl
			|| nestedData?.redirectUrl
			|| rawResponse?.instrumentResponse?.redirectInfo?.url
			|| responseData?.instrumentResponse?.redirectInfo?.url
			|| nestedData?.instrumentResponse?.redirectInfo?.url
			|| rawResponse?.instrument_response?.redirect_info?.url
			|| responseData?.instrument_response?.redirect_info?.url
			|| nestedData?.instrument_response?.redirect_info?.url;

		if (!redirectUrl) {
			logger.error('[PhonePe] No redirect URL in response', {
				transactionId: input.transactionId,
				fullResponse: rawResponse,
			});
			throw new AppError('PhonePe did not return a redirect URL', 502);
		}

		logger.info('[PhonePe] Payment initiated successfully', { transactionId: input.transactionId, redirectUrl });
		return redirectUrl;
	} catch (error: any) {
		if (error instanceof AppError) throw error;

		const upstreamCode = String(error?.response?.data?.code || '').trim();
		const upstreamMessage = String(error?.response?.data?.message || error?.message || 'PhonePe request failed').trim();

		logger.error('[PhonePe] Payment Initiation Failed', {
			transactionId: input.transactionId,
			status: error?.response?.status,
			data: error?.response?.data,
			message: error?.message,
		});

		const detailed = upstreamCode
			? `PhonePe Payment Initiation Failed (${upstreamCode}): ${upstreamMessage}`
			: `PhonePe Payment Initiation Failed: ${upstreamMessage}`;
		const withHint = upstreamCode === 'KEY_NOT_CONFIGURED'
			? `${detailed}. Verify merchant activation and env alignment: PHONEPE_MERCHANT_ID=${PHONEPE_MERCHANT_ID}, PHONEPE_SALT_INDEX=${PHONEPE_SALT_INDEX}, PHONEPE_BASE_URL=${PHONEPE_BASE_URL} (or set PHONEPE_ENV/PHONEPE_MODE).`
			: detailed;
		throw new AppError(withHint, 502);
	}
};

export const verifyPhonePeWebhook = (reqBody: string, xVerify: string): boolean => {
	if (!reqBody || !xVerify) {
		logger.error('[PhonePe] Webhook signature verification missing data', { reqBody, xVerify });
		return false;
	}

	if (!PHONEPE_WEBHOOK_SECRET) {
		logger.warn('[PhonePe] PHONEPE_WEBHOOK_SECRET not configured; cannot verify webhook signature.');
		return false;
	}

	const expected = sha256(reqBody + PHONEPE_WEBHOOK_SECRET) + '###' + PHONEPE_SALT_INDEX;

	try {
		const expectedBuf = Buffer.from(expected);
		const actualBuf = Buffer.from(xVerify);
		if (expectedBuf.length !== actualBuf.length) {
			throw new Error('signature length mismatch');
		}

		const isValid = crypto.timingSafeEqual(expectedBuf, actualBuf);
		if (!isValid) {
			logger.error('[PhonePe] Webhook signature verification FAILED', {
				expected: expected.slice(0, 30) + '...',
				received: xVerify.slice(0, 30) + '...',
			});
		}

		return isValid;
	} catch (error: any) {
		logger.error('[PhonePe] Webhook signature verification failed', { error: error?.message, expected, received: xVerify });
		return false;
	}
};

export const checkPhonePeStatus = async (merchantTransactionId: string) => {
	// Support multiple template variable patterns for backward compatibility.
	let resolvedStatusEndpoint = PHONEPE_STATUS_ENDPOINT_TEMPLATE;
	if (resolvedStatusEndpoint.includes('{merchantTransactionId}')) {
		resolvedStatusEndpoint = resolvedStatusEndpoint.replace('{merchantTransactionId}', merchantTransactionId);
	} else if (resolvedStatusEndpoint.includes('{merchantId}') && resolvedStatusEndpoint.includes('{transactionId}')) {
		resolvedStatusEndpoint = resolvedStatusEndpoint
			.replace('{merchantId}', PHONEPE_MERCHANT_ID)
			.replace('{transactionId}', merchantTransactionId);
	} else {
		// Fallback to common V2 path
		resolvedStatusEndpoint = `/checkout/v2/order/${merchantTransactionId}/status`;
	}

	let endpoint = resolvedStatusEndpoint.startsWith('/') ? resolvedStatusEndpoint : `/${resolvedStatusEndpoint}`;

	// Guard against stale env templates accidentally pointing to old subscriptions API.
	if (endpoint.includes('/subscriptions/v2/')) {
		endpoint = `/checkout/v2/order/${merchantTransactionId}/status`;
	}
	const fallbackEndpoint = `/checkout/v2/order/${merchantTransactionId}/status`;

	try {
		const authHeaders = await getPhonePeAuthorizationHeader();
		const response = await axios.get(`${PHONEPE_BASE_URL}${endpoint}`, {
			headers: {
				'Content-Type': 'application/json',
				'X-CLIENT-ID': PHONEPE_CLIENT_ID,
				'X-MERCHANT-ID': PHONEPE_MERCHANT_ID,
				accept: 'application/json',
				...authHeaders,
			},
			timeout: 10000,
		});

		logger.info('[PhonePe] Status check completed', {
			merchantTransactionId,
			success: response.data?.success,
			code: response.data?.code,
			state: response.data?.data?.state,
		});

		return response.data;
	} catch (error: any) {
		const upstreamCode = String(error?.response?.data?.code || '').toUpperCase();
		const shouldRetryWithFallback = upstreamCode === 'API_MAPPING_NOT_FOUND' || upstreamCode === 'API MAPPING NOT FOUND';

		if (shouldRetryWithFallback && endpoint !== fallbackEndpoint) {
			try {
				const authHeaders = await getPhonePeAuthorizationHeader();
				const retryResponse = await axios.get(`${PHONEPE_BASE_URL}${fallbackEndpoint}`, {
					headers: {
						'Content-Type': 'application/json',
						'X-CLIENT-ID': PHONEPE_CLIENT_ID,
						'X-MERCHANT-ID': PHONEPE_MERCHANT_ID,
						accept: 'application/json',
						...authHeaders,
					},
					timeout: 10000,
				});

				logger.info('[PhonePe] Status check fallback succeeded', {
					merchantTransactionId,
					endpoint: fallbackEndpoint,
					code: retryResponse.data?.code,
					state: retryResponse.data?.data?.state,
				});

				return retryResponse.data;
			} catch (retryError: any) {
				logger.error('[PhonePe] Status check fallback failed', {
					merchantTransactionId,
					endpoint: fallbackEndpoint,
					status: retryError?.response?.status,
					data: retryError?.response?.data,
					message: retryError?.message,
				});
			}
		}

		logger.error('[PhonePe] Status Check Failed', {
			merchantTransactionId,
			status: error?.response?.status,
			data: error?.response?.data,
			message: error?.message,
		});
		return null;
	}
};

// ===== WEBHOOK VALIDATION =====

// PhonePe Webhook IPs (from documentation)
const PHONEPE_WEBHOOK_IPS = [
	'103.116.33.8',
	'103.116.33.9',
	'103.116.33.10',
	'103.116.33.11',
	'103.116.33.136',
	'103.116.33.137',
	'103.116.33.138',
	'103.116.33.139',
	'103.116.32.16',
	'103.116.32.17',
	'103.116.32.18',
	'103.116.32.19',
	'103.116.32.20',
	'103.116.32.21',
	'103.116.32.22',
	'103.116.32.23',
	'103.116.32.24',
	'103.116.32.25',
	'103.116.32.26',
	'103.116.32.27',
	'103.116.32.28',
	'103.116.32.29',
	'103.116.34.1',
	'103.116.34.16',
	'103.116.34.17',
	'103.116.34.18',
	'103.116.34.19',
	'103.116.34.20',
	'103.116.34.21',
	'103.116.34.22',
	'103.116.34.23',
	'103.243.35.242',
];

// Allow additional, deployment-specific webhook source IPs via env var
// Comma-separated list, e.g. "1.2.3.4,5.6.7.8"
const PHONEPE_WEBHOOK_ALLOWED_IPS = String(process.env.PHONEPE_WEBHOOK_ALLOWED_IPS || '').split(',')
	.map((s) => String(s || '').trim())
	.filter(Boolean);

// Combined whitelist used at runtime
const PHONEPE_COMBINED_WEBHOOK_IPS = Array.from(new Set([...PHONEPE_WEBHOOK_IPS, ...PHONEPE_WEBHOOK_ALLOWED_IPS]));

/**
 * Verify webhook IP is from PhonePe
 * PhonePe sends webhooks from their proxy IPs
 */
export const isPhonePeWebhookIP = (clientIp: string): boolean => {
	if (!clientIp) return false;
	
	// For local development, allow localhost
	if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost') {
		return process.env.NODE_ENV === 'development';
	}

	// Normalize IPv4-mapped IPv6 addresses ("::ffff:1.2.3.4")
	const normalizedIp = String(clientIp).startsWith('::ffff:') ? String(clientIp).replace('::ffff:', '') : String(clientIp);

	// Check against combined whitelist (official PhonePe IPs + any deployment overrides)
	return PHONEPE_COMBINED_WEBHOOK_IPS.includes(normalizedIp);
};

/**
 * Verify webhook authorization header.
 * Supports:
 * - PhonePe format: Authorization: SHA256(<hex sha256(username:password)>)
 * - Basic auth format: Authorization: Basic <base64(username:password)>
 */
export const verifyPhonePeWebhookAuth = (
	authHeader: string,
	expectedUsername: string,
	expectedPassword: string
): boolean => {
	if (!authHeader || !expectedUsername || !expectedPassword) {
		logger.warn('[PhonePe] Missing webhook auth header or credentials');
		return false;
	}

	try {
		const credentials = `${expectedUsername}:${expectedPassword}`;
		const expectedHash = crypto.createHash('sha256').update(credentials).digest('hex');
		const normalizedAuthHeader = String(authHeader || '').trim();

		const compareTimingSafe = (received: string, expected: string): boolean => {
			const receivedBuf = Buffer.from(received);
			const expectedBuf = Buffer.from(expected);
			if (receivedBuf.length !== expectedBuf.length) {
				return false;
			}
			return crypto.timingSafeEqual(receivedBuf, expectedBuf);
		};

		// PhonePe hash format: Authorization: SHA256(<hash>)
		const sha256Match = normalizedAuthHeader.match(/^SHA256\s*\(\s*([a-fA-F0-9]{64})\s*\)\s*$/);
		if (sha256Match) {
			const receivedHash = String(sha256Match[1] || '').toLowerCase();
			const isValid = compareTimingSafe(receivedHash, expectedHash);
			if (!isValid) {
				logger.error('[PhonePe] Webhook auth signature mismatch', {
					received: receivedHash.substring(0, 20) + '...',
					expectedHash: expectedHash.substring(0, 20) + '...',
				});
			} else {
				logger.info('[PhonePe] Webhook auth accepted', { mode: 'sha256' });
			}
			return isValid;
		}

		// Basic auth format: Authorization: Basic <base64(username:password)>
		if (/^Basic\s+/i.test(normalizedAuthHeader)) {
			const encoded = normalizedAuthHeader.replace(/^Basic\s+/i, '').trim();
			let decoded = '';
			try {
				decoded = Buffer.from(encoded, 'base64').toString('utf8');
			} catch {
				logger.error('[PhonePe] Invalid basic auth encoding in webhook authorization');
				return false;
			}

			const isValid = compareTimingSafe(decoded, credentials);
			if (!isValid) {
				logger.error('[PhonePe] Webhook basic auth credentials mismatch');
			} else {
				logger.info('[PhonePe] Webhook auth accepted', { mode: 'basic' });
			}
			return isValid;
		}

		logger.error('[PhonePe] Unsupported webhook authorization format');
		return false;
	} catch (error: any) {
		logger.error('[PhonePe] Webhook auth verification failed', { error: error?.message });
		return false;
	}
};

/**
 * Get client IP from request (handling proxies)
 */
export const getClientIpFromRequest = (req: any): string => {
	// Check headers in order of preference
	const ip = 
		req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
		req.headers['x-real-ip'] ||
		req.headers['cf-connecting-ip'] ||
		req.ip ||
		req.socket?.remoteAddress ||
		req.connection?.remoteAddress ||
		'unknown';

	return String(ip).trim();
};

export const initiatePhonePeRefund = async (input: {
	merchantRefundId: string;
	originalMerchantOrderId: string;
	amountInPaise: number;
}) => {
	logger.info('[PhonePe] Initiating refund', {
		merchantRefundId: input.merchantRefundId,
		originalMerchantOrderId: input.originalMerchantOrderId,
		amountInPaise: input.amountInPaise,
	});

	const payload = {
		merchantId: PHONEPE_MERCHANT_ID,
		merchantRefundId: input.merchantRefundId,
		originalMerchantOrderId: input.originalMerchantOrderId,
		amount: input.amountInPaise,
		originalTransactionId: input.originalMerchantOrderId,
	};

	const endpoint = '/payments/v2/refund';

	try {
		const authHeaders = await getPhonePeAuthorizationHeader();
		const response = await axios.post(
			`${PHONEPE_BASE_URL}${endpoint}`,
			payload,
			{
				headers: {
					'Content-Type': 'application/json',
					'X-CLIENT-ID': PHONEPE_CLIENT_ID,
					'X-MERCHANT-ID': PHONEPE_MERCHANT_ID,
					accept: 'application/json',
					...authHeaders,
				},
				timeout: 15000,
			}
		);

		const refundId = response.data?.data?.refundId;
		const state = response.data?.data?.state;

		logger.info('[PhonePe] Refund initiated successfully', {
			merchantRefundId: input.merchantRefundId,
			refundId,
			state,
		});

		return {
			refundId,
			amount: input.amountInPaise,
			state: state || 'PENDING',
			responseData: response.data,
		};
	} catch (error: any) {
		const upstreamCode = String(error?.response?.data?.code || '').trim();
		const upstreamMessage = String(error?.response?.data?.message || error?.message || 'PhonePe request failed').trim();

		logger.error('[PhonePe] Refund Initiation Failed', {
			merchantRefundId: input.merchantRefundId,
			status: error?.response?.status,
			data: error?.response?.data,
			message: error?.message,
		});

		const detailed = upstreamCode
			? `PhonePe Refund Initiation Failed (${upstreamCode}): ${upstreamMessage}`
			: `PhonePe Refund Initiation Failed: ${upstreamMessage}`;
		throw new AppError(detailed, 502);
	}
};

export const checkPhonePeRefundStatus = async (merchantRefundId: string) => {
	const endpoint = `/payments/v2/refund/${merchantRefundId}/status`;

	try {
		const authHeaders = await getPhonePeAuthorizationHeader();
		const response = await axios.get(`${PHONEPE_BASE_URL}${endpoint}`, {
			headers: {
				'Content-Type': 'application/json',
				'X-CLIENT-ID': PHONEPE_CLIENT_ID,
				'X-MERCHANT-ID': PHONEPE_MERCHANT_ID,
				accept: 'application/json',
				...authHeaders,
			},
			timeout: 10000,
		});

		logger.info('[PhonePe] Refund status check completed', {
			merchantRefundId,
			success: response.data?.success,
			code: response.data?.code,
			state: response.data?.data?.state,
		});

		return response.data;
	} catch (error: any) {
		logger.error('[PhonePe] Refund Status Check Failed', {
			merchantRefundId,
			status: error?.response?.status,
			data: error?.response?.data,
			message: error?.message,
		});
		return null;
	}
};
