import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import {
	getTherapistDashboardData,
	listTherapistMessagesData,
	listTherapistPatientsData,
	listTherapistPayoutHistoryData,
	listTherapistSessionNotesData,
} from '../services/therapist-dashboard.service';
import { getProviderPendingRequests } from '../services/smart-match.service';

const authUserId = (req: Request): string => {
	const userId = req.auth?.userId;
	if (!userId) throw new AppError('Authentication required', 401);
	return userId;
};

export const getMyTherapistDashboardController = async (req: Request, res: Response): Promise<void> => {
	const data = await getTherapistDashboardData(authUserId(req));
	sendSuccess(res, data, 'Therapist dashboard fetched');
};

export const getMyTherapistPatientsController = async (req: Request, res: Response): Promise<void> => {
	const status = typeof req.query.status === 'string' ? req.query.status : undefined;
	const search = typeof req.query.search === 'string' ? req.query.search : undefined;
	const data = await listTherapistPatientsData(authUserId(req), status, search);
	sendSuccess(res, data, 'Therapist patients fetched');
};

export const getMyTherapistSessionNotesController = async (req: Request, res: Response): Promise<void> => {
	const data = await listTherapistSessionNotesData(authUserId(req));
	sendSuccess(res, data, 'Therapist session notes fetched');
};

export const getMyTherapistMessagesController = async (req: Request, res: Response): Promise<void> => {
	const data = await listTherapistMessagesData(authUserId(req));
	sendSuccess(res, data, 'Therapist messages fetched');
};

export const getMyTherapistPayoutHistoryController = async (req: Request, res: Response): Promise<void> => {
	const data = await listTherapistPayoutHistoryData(authUserId(req));
	sendSuccess(res, data, 'Therapist payout history fetched');
};

export const getMyTherapistPendingAppointmentRequestsController = async (req: Request, res: Response): Promise<void> => {
	const data = await getProviderPendingRequests(authUserId(req));
	sendSuccess(res, data, 'Therapist pending appointment requests fetched');
};
