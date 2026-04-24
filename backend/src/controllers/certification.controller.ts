import type { Request, Response } from 'express';
import { sendSuccess } from '../utils/response';
import { getCertificationById, getMyCertificationState, listCertifications, markCertificationCompleted, recordInstallmentPayment } from '../services/certification.service';
import { findOrCreateProviderForCertification } from '../services/enrollment.service';

export const getCertificationsController = async (_req: Request, res: Response): Promise<void> => {
	const result = await listCertifications();
	sendSuccess(res, result, 'Certifications fetched');
};

export const getCertificationByIdController = async (req: Request, res: Response): Promise<void> => {
	const id = String(req.params.id ?? '').trim();
	const certification = await getCertificationById(id);
	sendSuccess(res, certification, 'Certification fetched');
};

export const registerEnrollmentController = async (req: any, res: Response): Promise<void> => {
	const result = await findOrCreateProviderForCertification({
    userId: req.auth?.userId,
    fullName: req.body.fullName,
    mobile: req.body.mobile,
    certSlug: req.body.certSlug,
	paymentPlan: req.body.paymentPlan,
	installmentCount: req.body.installmentCount,
	bypassPayment: req.body.bypassPayment,
  });
	sendSuccess(res, result, 'Enrollment initiated');
};

export const getMyCertificationStateController = async (req: any, res: Response): Promise<void> => {
	const userId = String(req.auth?.userId || '').trim();
	const result = await getMyCertificationState(userId);
	sendSuccess(res, result, 'Certification state fetched');
};

export const completeCertificationController = async (req: any, res: Response): Promise<void> => {
	const userId = String(req.auth?.userId || '').trim();
	const certSlug = String(req.body?.certSlug || '').trim();
	const result = await markCertificationCompleted(userId, certSlug);
	sendSuccess(res, result, 'Certification marked completed');
};

export const markInstallmentPaidController = async (req: any, res: Response): Promise<void> => {
	const userId = String(req.auth?.userId || '').trim();
	const enrollmentId = String(req.body?.enrollmentId || '').trim();
	const result = await recordInstallmentPayment(userId, enrollmentId);
	sendSuccess(res, result, 'Installment payment recorded');
};
