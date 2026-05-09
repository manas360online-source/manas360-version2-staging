import type { Request, Response } from 'express';
import { sendSuccess } from '../utils/response';
import { getAdminModuleSummary } from '../services/admin-module.service';

export const getAdminModuleSummaryController = async (req: Request, res: Response): Promise<void> => {
  const module = String(req.params.module || '').trim().toLowerCase();
  const summary = await getAdminModuleSummary(module || 'dashboard');
  sendSuccess(res, summary, 'Admin module summary fetched successfully');
};
