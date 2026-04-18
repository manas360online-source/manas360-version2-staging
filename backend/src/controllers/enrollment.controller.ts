import { Request, Response } from 'express';
import { sendSuccess } from '../utils/response.util';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { initiatePhonePePayment } from '../services/phonepe.service';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const db = prisma as any;

export const registerEnrollmentController = async (req: Request, res: Response): Promise<void> => {
	const { fullName, email, mobile, city, education, motivation, certName, certSlug, price } = req.body;

	if (!email || !mobile || !fullName) {
		throw new AppError('Full name, email, and mobile are required', 400);
	}

    // In Manas360, prices are handled in Paise (Minor units). 
    // If the frontend sends INR, we must convert.
    const amountInPaise = Math.round(Number(price || 0) * 100);
    if (amountInPaise < 100) {
        throw new AppError('Invalid payment amount. Minimum ₹1.00 required.', 400);
    }

	const transactionId = `CERT_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const callbackUrl = `${env.apiUrl}${env.apiPrefix}/v1/payments/phonepe/webhook`;
    const redirectUrlBase = `${env.frontendUrl}/#/payment/status`;

    try {
        // 1. Create a pending payment record to track this intent
        await db.financialPayment.create({
            data: {
                merchantTransactionId: transactionId,
                status: 'INITIATED',
                amountMinor: amountInPaise,
                paymentType: 'PROVIDER_FEE', // Using this as a general type for now
                metadata: {
                    fullName,
                    email,
                    mobile,
                    city,
                    education,
                    motivation,
                    certName,
                    certSlug,
                    isCertification: true
                }
            }
        });

        // 2. Initiate PhonePe Payment
        const phonePeRedirectUrl = await initiatePhonePePayment({
            transactionId,
            userId: email, // Using email as a temporary userId for tracking
            amountInPaise,
            callbackUrl,
            redirectUrl: `${redirectUrlBase}?transactionId=${transactionId}`
        });

        sendSuccess(res, { 
            transactionId,
            redirectUrl: phonePeRedirectUrl
        }, 'Certification payment initiated');

    } catch (error: any) {
        logger.error('[Enrollment] Failed to initiate certification payment', { error: error.message, email });
        throw new AppError(error.message || 'Failed to initiate payment', 500);
    }
};
