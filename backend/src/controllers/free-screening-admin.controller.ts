import type { Request, Response } from 'express';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middleware/error.middleware';
import {
    listAllProviderExtraQuestionsAdmin,
    createScreeningTemplateAdmin,
    listTemplateQuestionsAdmin,
    createTemplateQuestionAdmin,
} from '../services/free-screening-admin.service';

export const listAllProviderExtraQuestionsAdminController = async (req: Request, res: Response): Promise<void> => {
    const params = {
        providerId: req.query.providerId ? String(req.query.providerId) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    } as any;
    const data = await listAllProviderExtraQuestionsAdmin(params);
    sendSuccess(res, data, 'Provider extra questions (admin) fetched');
};

export const createScreeningTemplateAdminController = async (req: Request, res: Response): Promise<void> => {
    if (!req.body || typeof req.body !== 'object') throw new AppError('Invalid body', 422);
    const payload = {
        key: String(req.body.key || ''),
        title: String(req.body.title || ''),
        description: req.body.description !== undefined ? String(req.body.description) : undefined,
        estimatedMinutes: req.body.estimatedMinutes !== undefined ? Number(req.body.estimatedMinutes) : undefined,
        isPublic: req.body.isPublic,
        randomizeOrder: req.body.randomizeOrder,
    } as any;
    const data = await createScreeningTemplateAdmin(payload);
    sendSuccess(res, data, 'Screening template created', 201);
};

export const listTemplateQuestionsAdminController = async (req: Request, res: Response): Promise<void> => {
    const templateId = String(req.params.templateId || '').trim();
    if (!templateId) throw new AppError('templateId is required', 422);
    const data = await listTemplateQuestionsAdmin(templateId);
    sendSuccess(res, data, 'Template questions fetched');
};

export const createTemplateQuestionAdminController = async (req: Request, res: Response): Promise<void> => {
    const templateId = String(req.params.templateId || '').trim();
    if (!templateId) throw new AppError('templateId is required', 422);
    const body = req.body || {};
    const payload = {
        prompt: String(body.prompt || ''),
        sectionKey: body.sectionKey !== undefined ? String(body.sectionKey) : undefined,
        orderIndex: body.orderIndex !== undefined ? Number(body.orderIndex) : undefined,
        options: Array.isArray(body.options) ? body.options.map((o: any) => ({ label: String(o.label || ''), optionIndex: Number(o.optionIndex), points: Number(o.points) })) : undefined,
    } as any;
    const data = await createTemplateQuestionAdmin(templateId, payload);
    sendSuccess(res, data, 'Template question created', 201);
};
