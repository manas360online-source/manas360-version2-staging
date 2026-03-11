import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import {
	createQuestionOptionAdmin,
	createScreeningTemplateAdmin,
	createTemplateQuestionAdmin,
	ensureScreeningTemplateDefaultAdmin,
	listAllProviderExtraQuestionsAdmin,
	listScoringBandsAdmin,
	listScreeningTemplatesAdmin,
	listTemplateQuestionsAdmin,
	replaceScoringBandsAdmin,
	simulateTemplateScoring,
	updateQuestionOptionAdmin,
	updateScreeningTemplateAdmin,
	updateTemplateQuestionAdmin,
} from '../services/free-screening-admin.service';

const templateId = (req: Request): string => {
	const value = String(req.params.templateId || '').trim();
	if (!value) throw new AppError('templateId is required', 422);
	return value;
};

const questionId = (req: Request): string => {
	const value = String(req.params.questionId || '').trim();
	if (!value) throw new AppError('questionId is required', 422);
	return value;
};

const optionId = (req: Request): string => {
	const value = String(req.params.optionId || '').trim();
	if (!value) throw new AppError('optionId is required', 422);
	return value;
};

export const listScreeningTemplatesAdminController = async (_req: Request, res: Response): Promise<void> => {
	const data = await listScreeningTemplatesAdmin();
	sendSuccess(res, data, 'Screening templates fetched');
};

export const createScreeningTemplateAdminController = async (req: Request, res: Response): Promise<void> => {
	const data = await createScreeningTemplateAdmin(req.body || {});
	sendSuccess(res, data, 'Screening template created', 201);
};

export const ensureScreeningTemplateDefaultAdminController = async (req: Request, res: Response): Promise<void> => {
	const templateKey = typeof req.body?.templateKey === 'string'
		? req.body.templateKey
		: typeof req.params?.templateKey === 'string'
			? req.params.templateKey
			: undefined;
	const data = await ensureScreeningTemplateDefaultAdmin(templateKey);
	sendSuccess(res, data, 'Default screening template ensured');
};

export const updateScreeningTemplateAdminController = async (req: Request, res: Response): Promise<void> => {
	const data = await updateScreeningTemplateAdmin(templateId(req), req.body || {});
	sendSuccess(res, data, 'Screening template updated');
};

export const listTemplateQuestionsAdminController = async (req: Request, res: Response): Promise<void> => {
	const data = await listTemplateQuestionsAdmin(templateId(req));
	sendSuccess(res, data, 'Template questions fetched');
};

export const createTemplateQuestionAdminController = async (req: Request, res: Response): Promise<void> => {
	const data = await createTemplateQuestionAdmin(templateId(req), req.body || {});
	sendSuccess(res, data, 'Question created', 201);
};

export const updateTemplateQuestionAdminController = async (req: Request, res: Response): Promise<void> => {
	const data = await updateTemplateQuestionAdmin(questionId(req), req.body || {});
	sendSuccess(res, data, 'Question updated');
};

export const createQuestionOptionAdminController = async (req: Request, res: Response): Promise<void> => {
	const data = await createQuestionOptionAdmin(questionId(req), req.body || {});
	sendSuccess(res, data, 'Option created', 201);
};

export const updateQuestionOptionAdminController = async (req: Request, res: Response): Promise<void> => {
	const data = await updateQuestionOptionAdmin(optionId(req), req.body || {});
	sendSuccess(res, data, 'Option updated');
};

export const listScoringBandsAdminController = async (req: Request, res: Response): Promise<void> => {
	const data = await listScoringBandsAdmin(templateId(req));
	sendSuccess(res, data, 'Scoring bands fetched');
};

export const replaceScoringBandsAdminController = async (req: Request, res: Response): Promise<void> => {
	const bands = Array.isArray(req.body?.bands) ? req.body.bands : [];
	const data = await replaceScoringBandsAdmin(templateId(req), bands);
	sendSuccess(res, data, 'Scoring bands updated');
};

export const simulateTemplateScoringController = async (req: Request, res: Response): Promise<void> => {
	const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
	const data = await simulateTemplateScoring(templateId(req), { answers });
	sendSuccess(res, data, 'Simulation complete');
};

export const listAllProviderExtraQuestionsAdminController = async (req: Request, res: Response): Promise<void> => {
	const data = await listAllProviderExtraQuestionsAdmin({
		providerId: req.query.providerId ? String(req.query.providerId) : undefined,
		status: req.query.status ? String(req.query.status) : undefined,
		page: req.query.page ? Number(req.query.page) : undefined,
		pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
	});
	sendSuccess(res, data, 'Provider extra questions fetched');
};
