import crypto from 'crypto';
import axios from 'axios';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

const PHONEPE_MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || 'PGCHECKOUT';
const PHONEPE_SALT_KEY = process.env.PHONEPE_SALT_KEY || '';
const PHONEPE_SALT_INDEX = process.env.PHONEPE_SALT_INDEX || '1';

// Automated Base URL selection: Use pg-sandbox (simulator) for PGCHECKOUT, otherwise assume UAT/Prod (hermes)
const GET_PHONEPE_BASE_URL = () => {
	if (process.env.PHONEPE_BASE_URL) return process.env.PHONEPE_BASE_URL;
	return PHONEPE_MERCHANT_ID === 'PGCHECKOUT' 
		? 'https://api-preprod.phonepe.com/apis/pg-sandbox' 
		: 'https://api-preprod.phonepe.com/apis/hermes';
};

const PHONEPE_BASE_URL = GET_PHONEPE_BASE_URL();

if (!PHONEPE_SALT_KEY) {
	logger.warn('[PhonePe] PHONEPE_SALT_KEY is not set. Payment signing will fail in production.');
}

const sha256 = (input: string): string => crypto.createHash('sha256').update(input).digest('hex');

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
		const response = await axios.post(
			`${PHONEPE_BASE_URL}/pg/v1/pay`,
			{ request: base64Payload },
			{
				headers: {
					'Content-Type': 'application/json',
					'X-VERIFY': checksum,
					accept: 'application/json',
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

		logger.error('[PhonePe] Payment Initiation Failed', {
			transactionId: input.transactionId,
			status: error?.response?.status,
			data: error?.response?.data,
			message: error?.message,
		});
		throw new AppError('PhonePe Payment Initiation Failed', 502);
	}
};

export const verifyPhonePeWebhook = (reqBody: any, xVerify: string): boolean => {
	const expected = sha256(reqBody + PHONEPE_SALT_KEY) + '###' + PHONEPE_SALT_INDEX;
	const isValid = expected === xVerify;

	if (!isValid) {
		logger.error('[PhonePe] Webhook signature verification FAILED', {
			expected: expected.substring(0, 20) + '...',
			received: xVerify.substring(0, 20) + '...',
		});
	}

	return isValid;
};

export const checkPhonePeStatus = async (merchantTransactionId: string) => {
	const endpoint = `/pg/v1/status/${PHONEPE_MERCHANT_ID}/${merchantTransactionId}`;
	const checksum = sha256(endpoint + PHONEPE_SALT_KEY) + '###' + PHONEPE_SALT_INDEX;

	try {
		const response = await axios.get(`${PHONEPE_BASE_URL}${endpoint}`, {
			headers: {
				'Content-Type': 'application/json',
				'X-VERIFY': checksum,
				'X-MERCHANT-ID': PHONEPE_MERCHANT_ID,
				accept: 'application/json',
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
