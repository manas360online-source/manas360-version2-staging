import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import {
	confirmMyTherapistLeadPurchase,
	getMyTherapistLeads,
	initiateMyTherapistLeadPurchase,
	purchaseMyTherapistLead,
} from '../services/lead.service';
import {
	dispatchPriorityTierLeadNotifications,
	publishInstitutionalEngagementLeads,
} from '../services/b2b-institutional-lead.service';

const getAuthUserId = (req: Request): string => {
	const userId = req.auth?.userId;

	if (!userId) {
		throw new AppError('Authentication required', 401);
	}

	return userId;
};

export const getMyTherapistLeadsController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const query = req.validatedTherapistLeadsQuery ?? { page: 1, limit: 10 };

	const leads = await getMyTherapistLeads(userId, query);

	sendSuccess(res, leads, 'Therapist leads fetched');
};

export const purchaseMyTherapistLeadController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const leadId = String(req.params.id);

	const result = await purchaseMyTherapistLead(userId, leadId);

	sendSuccess(res, result, 'Lead purchased successfully');
};

export const initiateMyTherapistLeadPurchaseController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const leadId = String(req.params.id);

	const result = await initiateMyTherapistLeadPurchase(userId, leadId);

	sendSuccess(res, result, 'Lead purchase payment initiated', 201);
};

export const confirmMyTherapistLeadPurchaseController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const leadId = String(req.params.id);
	const merchantTransactionId = String(req.body.merchantTransactionId ?? '').trim();
	const transactionId = String(req.body.transactionId ?? '').trim();
	const signature = String(req.body.signature ?? '').trim();

	if (!merchantTransactionId || !transactionId || !signature) {
		throw new AppError('merchantTransactionId, transactionId and signature are required', 422);
	}

	const result = await confirmMyTherapistLeadPurchase(userId, leadId, {
		merchantTransactionId,
		transactionId,
		signature,
	});

	sendSuccess(res, result, 'Lead purchase confirmed');
};

export const publishInstitutionalEngagementLeadsController = async (req: Request, res: Response): Promise<void> => {
	const requestorUserId = getAuthUserId(req);
	const engagementId = String(req.body.engagementId ?? '').trim();

	if (!engagementId) {
		throw new AppError('engagementId is required', 422);
	}

	const requiredLanguageProficiencyRaw = req.body.requiredLanguageProficiency
		? String(req.body.requiredLanguageProficiency).trim().toLowerCase()
		: undefined;
	const requiredLanguageProficiency =
		requiredLanguageProficiencyRaw === 'native' ||
		requiredLanguageProficiencyRaw === 'professional' ||
		requiredLanguageProficiencyRaw === 'conversational'
			? requiredLanguageProficiencyRaw
			: undefined;

	const result = await publishInstitutionalEngagementLeads({
		engagementId,
		requestorUserId,
		requiredCert: req.body.requiredCert ? String(req.body.requiredCert).trim() : null,
		requiredLanguageProficiency,
		languages: Array.isArray(req.body.languages)
			? req.body.languages.map((item: unknown) => String(item).trim()).filter(Boolean)
			: [],
		location:
			typeof req.body.location?.latitude === 'number' && typeof req.body.location?.longitude === 'number'
				? {
					latitude: Number(req.body.location.latitude),
					longitude: Number(req.body.location.longitude),
				}
				: null,
		deliveryMode: req.body.deliveryMode ? String(req.body.deliveryMode) : null,
		cityTrafficIndex:
			typeof req.body.cityTrafficIndex === 'number' || typeof req.body.cityTrafficIndex === 'string'
				? Number(req.body.cityTrafficIndex)
				: undefined,
		targetStartMinute:
			typeof req.body.targetStartMinute === 'number' || typeof req.body.targetStartMinute === 'string'
				? Number(req.body.targetStartMinute)
				: undefined,
		durationMinutes:
			typeof req.body.durationMinutes === 'number' || typeof req.body.durationMinutes === 'string'
				? Number(req.body.durationMinutes)
				: undefined,
		requiredLeadCount:
			typeof req.body.requiredLeadCount === 'number' || typeof req.body.requiredLeadCount === 'string'
				? Number(req.body.requiredLeadCount)
				: undefined,
		availabilityPrefs:
			Array.isArray(req.body.availabilityPrefs?.daysOfWeek) && Array.isArray(req.body.availabilityPrefs?.timeSlots)
				? {
					daysOfWeek: req.body.availabilityPrefs.daysOfWeek.map((day: unknown) => Number(day)),
					timeSlots: req.body.availabilityPrefs.timeSlots
						.map((slot: any) => ({
							startMinute: Number(slot?.startMinute),
							endMinute: Number(slot?.endMinute),
						}))
						.filter((slot: any) => Number.isFinite(slot.startMinute) && Number.isFinite(slot.endMinute)),
				}
				: undefined,
		amountMinor:
			typeof req.body.amountMinor === 'number' || typeof req.body.amountMinor === 'string'
				? Number(req.body.amountMinor)
				: undefined,
		currency: req.body.currency ? String(req.body.currency).trim() : undefined,
		title: req.body.title ? String(req.body.title).trim() : undefined,
		institutionName: req.body.institutionName ? String(req.body.institutionName).trim() : undefined,
	});

	sendSuccess(res, result, 'Institutional leads published', 201);
};

export const dispatchPriorityTierLeadNotificationsController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	getAuthUserId(req);
	const result = await dispatchPriorityTierLeadNotifications();
	sendSuccess(res, result, 'Priority tier notifications dispatched');
};
