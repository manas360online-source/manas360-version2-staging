import crypto from 'crypto';
import axios from 'axios';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

const PHONEPE_MERCHANT_ID = String(process.env.PHONEPE_MERCHANT_ID || 'PGCHECKOUT').trim();
const PHONEPE_SALT_KEY = String(process.env.PHONEPE_SALT_KEY || '').trim();
const PHONEPE_SALT_INDEX = String(process.env.PHONEPE_SALT_INDEX || '1').trim();
const PHONEPE_ENV = String(process.env.PHONEPE_ENV || (env.nodeEnv === 'production' ? 'production' : 'preprod')).trim().toLowerCase();
const PHONEPE_MODE = String(process.env.PHONEPE_MODE || '').trim().toLowerCase();

// Base URL selection priority:
// 1) Explicit PHONEPE_BASE_URL
// 2) PHONEPE_MODE=pgsandbox (simulator)
// 3) PHONEPE_ENV=production|preprod (standard gateway)
const GET_PHONEPE_BASE_URL = () => {
	if (process.env.PHONEPE_BASE_URL) return String(process.env.PHONEPE_BASE_URL).trim();
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

if (!PHONEPE_SALT_KEY) {
	logger.error('[PhonePe] PHONEPE_SALT_KEY is not set. Payment signing and verification will fail.');
	if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
		throw new Error('Missing PHONEPE_SALT_KEY in production/staging environment');
	}
}

const sha256 = (input: string): string => crypto.createHash('sha256').update(input).digest('hex');

interface PhonePeToken {
	accessToken: string;
	expiresAt: number; // milliseconds since epoch
}

let cachedPhonePeToken: PhonePeToken | null = null;

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
		return {};
	}
	return { Authorization: `O-Bearer ${token}` };
};

const initiatePhonePePaymentViaSdk = async (input: {
	transactionId: string;
	amountInPaise: number;
	redirectUrl: string;
}): Promise<string | null> => {
	try {
		const sdk: any = await import('@phonepe-pg/pg-sdk-node');
		const StandardCheckoutClient = sdk?.StandardCheckoutClient;
		const Env = sdk?.Env;
		if (!StandardCheckoutClient || !Env) {
			return null;
		}

		const sdkEnv = PHONEPE_ENV === 'production' || PHONEPE_ENV === 'prod' || PHONEPE_ENV === 'live'
			? Env.PRODUCTION
			: Env.SANDBOX;
		const clientVersion = Number(PHONEPE_CLIENT_VERSION || '1');
		const client = StandardCheckoutClient.getInstance(PHONEPE_CLIENT_ID, PHONEPE_CLIENT_SECRET, clientVersion, sdkEnv);

		const createOrderBuilder = sdk?.CreateSdkOrderRequest?.StandardCheckoutBuilder?.();
		if (createOrderBuilder) {
			const request = createOrderBuilder
				.merchantOrderId(input.transactionId)
				.amount(input.amountInPaise)
				.redirectUrl(input.redirectUrl)
				.disablePaymentRetry(true)
				.build();

			if (typeof client?.pay === 'function') {
				const response = await client.pay(request);
				const sdkRedirect = String(response?.redirectUrl || response?.redirect_url || '').trim();
				if (sdkRedirect) return sdkRedirect;
			}

			if (typeof client?.createSdkOrder === 'function') {
				const response = await client.createSdkOrder(request);
				const sdkRedirect = String(response?.redirectUrl || response?.redirect_url || '').trim();
				if (sdkRedirect) return sdkRedirect;
			}
		}

		const payBuilder = sdk?.StandardCheckoutPayRequest?.builder?.();
		if (payBuilder && typeof client?.pay === 'function') {
			const request = payBuilder
				.merchantOrderId(input.transactionId)
				.amount(input.amountInPaise)
				.redirectUrl(input.redirectUrl)
				.build();
			const response = await client.pay(request);
			const sdkRedirect = String(response?.redirectUrl || response?.redirect_url || '').trim();
			if (sdkRedirect) return sdkRedirect;
		}

		return null;
	} catch (error: any) {
		logger.error('[PhonePe] SDK fallback failed', { message: error?.message, stack: error?.stack });
		return null;
	}
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

	const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
	const endpoint = PHONEPE_BASE_URL.includes('pg-sandbox') ? '/pg/v1/pay' : '/pg/v1/pay'; // Both use same endpoint path suffix
	const checksum = sha256(base64Payload + '/pg/v1/pay' + PHONEPE_SALT_KEY) + '###' + PHONEPE_SALT_INDEX;

	try {
		const authHeaders = await getPhonePeAuthorizationHeader();
		const response = await axios.post(
			`${PHONEPE_BASE_URL}/pg/v1/pay`,
			{ request: base64Payload },
			{
				headers: {
					'Content-Type': 'application/json',
					'X-VERIFY': checksum,
					'X-MERCHANT-ID': PHONEPE_MERCHANT_ID,
					accept: 'application/json',
					...authHeaders,
				},
				timeout: 15000,
			}
		);

		const redirectUrl = response.data?.data?.instrumentResponse?.redirectInfo?.url;

		if (!redirectUrl) {
			logger.error('[PhonePe] No redirect URL in response', { transactionId: input.transactionId, responseData: response.data });
			throw new AppError('PhonePe did not return a redirect URL', 502);
		}

		logger.info('[PhonePe] Payment initiated successfully', { transactionId: input.transactionId, redirectUrl });
		return redirectUrl;
	} catch (error: any) {
		if (error instanceof AppError) throw error;

		const upstreamCode = String(error?.response?.data?.code || '').trim();
		const upstreamMessage = String(error?.response?.data?.message || error?.message || 'PhonePe request failed').trim();
		const isMappingError = upstreamMessage.toLowerCase().includes('api mapping not found');

		if (isMappingError && PHONEPE_CLIENT_ID && PHONEPE_CLIENT_SECRET) {
			const sdkRedirectUrl = await initiatePhonePePaymentViaSdk({
				transactionId: input.transactionId,
				amountInPaise: input.amountInPaise,
				redirectUrl: input.redirectUrl,
			});
			if (sdkRedirectUrl) {
				logger.info('[PhonePe] SDK fallback payment initiated successfully', {
					transactionId: input.transactionId,
					redirectUrl: sdkRedirectUrl,
				});
				return sdkRedirectUrl;
			}
		}

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

	const expected = sha256(reqBody + PHONEPE_SALT_KEY) + '###' + PHONEPE_SALT_INDEX;

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
	const endpoint = `/pg/v1/status/${PHONEPE_MERCHANT_ID}/${merchantTransactionId}`;
	const checksum = sha256(endpoint + PHONEPE_SALT_KEY) + '###' + PHONEPE_SALT_INDEX;

	try {
		const authHeaders = await getPhonePeAuthorizationHeader();
		const response = await axios.get(`${PHONEPE_BASE_URL}${endpoint}`, {
			headers: {
				'Content-Type': 'application/json',
				'X-VERIFY': checksum,
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

	// Check against PhonePe IP whitelist
	return PHONEPE_WEBHOOK_IPS.includes(clientIp);
};

/**
 * Verify webhook authorization header using SHA256(username:password)
 * Per PhonePe doc: "Authorization: SHA256(username:password)"
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
		// PhonePe sends: "Authorization: SHA256(username:password)"
		// Extract the hash portion from header
		const headerValue = authHeader.replace(/^SHA256\s*\(\s*|\s*\)$/g, '').trim();
		
		// Compute expected hash
		const credentials = `${expectedUsername}:${expectedPassword}`;
		const expectedHash = crypto.createHash('sha256').update(credentials).digest('hex');

		// Timing-safe comparison
		const headerBuf = Buffer.from(headerValue);
		const expectedBuf = Buffer.from(expectedHash);

		if (headerBuf.length !== expectedBuf.length) {
			logger.error('[PhonePe] Webhook auth header length mismatch');
			return false;
		}

		const isValid = crypto.timingSafeEqual(headerBuf, expectedBuf);
		if (!isValid) {
			logger.error('[PhonePe] Webhook auth signature mismatch', {
				received: headerValue.substring(0, 20) + '...',
				expectedHash: expectedHash.substring(0, 20) + '...',
			});
		}

		return isValid;
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

	const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
	const endpoint = '/payments/v2/refund';
	const checksum = sha256(base64Payload + endpoint + PHONEPE_SALT_KEY) + '###' + PHONEPE_SALT_INDEX;

	try {
		const authHeaders = await getPhonePeAuthorizationHeader();
		const response = await axios.post(
			`${PHONEPE_BASE_URL}${endpoint}`,
			{ request: base64Payload },
			{
				headers: {
					'Content-Type': 'application/json',
					'X-VERIFY': checksum,
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
	const checksum = sha256(endpoint + PHONEPE_SALT_KEY) + '###' + PHONEPE_SALT_INDEX;

	try {
		const authHeaders = await getPhonePeAuthorizationHeader();
		const response = await axios.get(`${PHONEPE_BASE_URL}${endpoint}`, {
			headers: {
				'Content-Type': 'application/json',
				'X-VERIFY': checksum,
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
