import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import {
	createTherapistProfile,
	getMyTherapistProfile,
	updateMyTherapistNriPool,
	uploadMyTherapistDocument,
} from '../services/therapist.service';

const getAuthUserId = (req: Request): string => {
	const userId = req.auth?.userId;

	if (!userId) {
		throw new AppError('Authentication required', 401);
	}

	return userId;
};

export const createTherapistProfileController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);

	if (!req.validatedTherapistProfilePayload) {
		throw new AppError('Invalid therapist profile payload', 400);
	}

	const profile = await createTherapistProfile(userId, req.validatedTherapistProfilePayload);

	sendSuccess(res, profile, 'Therapist profile created', 201);
};

export const getMyTherapistProfileController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const profile = await getMyTherapistProfile(userId);

	sendSuccess(res, profile, 'Therapist profile fetched');
};

export const uploadMyTherapistDocumentController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);

	if (!req.validatedTherapistDocumentPayload) {
		throw new AppError('Invalid therapist document payload', 400);
	}

	if (!req.file) {
		throw new AppError('Document file is required', 400);
	}

	const result = await uploadMyTherapistDocument(
		userId,
		req.validatedTherapistDocumentPayload,
		{
			buffer: req.file.buffer,
			mimetype: req.file.mimetype,
			size: req.file.size,
		},
	);

	sendSuccess(res, result, 'Therapist document uploaded', 201);
};

export const patchMyTherapistNriPoolController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const nriPoolCertified = Boolean(req.body?.nriPoolCertified);
	const nriTimezoneShifts = Array.isArray(req.body?.nriTimezoneShifts)
		? req.body.nriTimezoneShifts.map((value: unknown) => String(value || '').trim()).filter(Boolean)
		: [];

	const profile = await updateMyTherapistNriPool(userId, {
		nriPoolCertified,
		nriTimezoneShifts,
	});

	sendSuccess(res, profile, 'Therapist NRI pool settings updated');
};
