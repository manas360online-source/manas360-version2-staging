import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import {
  createPsychologistAssessment,
  createPsychologistReport,
  getPsychologistDashboard,
  getPsychologistMessages,
  getPsychologistPatientOverview,
  getPsychologistProfile,
  getPsychologistSchedule,
  getPsychologistSettings,
  listPsychologistAssessments,
  listPsychologistPatients,
  listPsychologistReports,
  listPsychologistTests,
  updatePsychologistReport,
  upsertPsychologistSettings,
} from '../services/psychologist.service';
import {
  cloneProviderReportToPatientReport,
  listProviderPatientReportClones,
  shareProviderPatientReportClone,
} from '../services/patient-shared-report.service';

const authUserId = (req: Request): string => {
  const userId = req.auth?.userId;
  if (!userId) throw new AppError('Authentication required', 401);
  return userId;
};

export const getMyPsychologistDashboardController = async (req: Request, res: Response): Promise<void> => {
  const data = await getPsychologistDashboard(authUserId(req));
  sendSuccess(res, data, 'Psychologist dashboard fetched');
};

export const getMyPsychologistPatientsController = async (req: Request, res: Response): Promise<void> => {
  const data = await listPsychologistPatients(authUserId(req));
  sendSuccess(res, data, 'Psychologist patients fetched');
};

export const getMyPsychologistPatientOverviewController = async (req: Request, res: Response): Promise<void> => {
  const patientId = String(req.params.patientId || '').trim();
  if (!patientId) throw new AppError('patientId is required', 400);
  const data = await getPsychologistPatientOverview(authUserId(req), patientId);
  sendSuccess(res, data, 'Psychologist patient overview fetched');
};

export const getMyPsychologistAssessmentsController = async (req: Request, res: Response): Promise<void> => {
  const patientId = typeof req.query.patientId === 'string' ? req.query.patientId : undefined;
  const data = await listPsychologistAssessments(authUserId(req), patientId);
  sendSuccess(res, data, 'Psychologist assessments fetched');
};

export const postMyPsychologistAssessmentController = async (req: Request, res: Response): Promise<void> => {
  const data = await createPsychologistAssessment(authUserId(req), req.body || {});
  sendSuccess(res, data, 'Psychologist assessment created', 201);
};

export const getMyPsychologistReportsController = async (req: Request, res: Response): Promise<void> => {
  const patientId = typeof req.query.patientId === 'string' ? req.query.patientId : undefined;
  const data = await listPsychologistReports(authUserId(req), patientId);
  sendSuccess(res, data, 'Psychologist reports fetched');
};

export const postMyPsychologistReportController = async (req: Request, res: Response): Promise<void> => {
  const data = await createPsychologistReport(authUserId(req), req.body || {});
  sendSuccess(res, data, 'Psychologist report created', 201);
};

export const putMyPsychologistReportController = async (req: Request, res: Response): Promise<void> => {
  const reportId = String(req.params.id || '').trim();
  if (!reportId) throw new AppError('id is required', 400);
  const data = await updatePsychologistReport(authUserId(req), reportId, req.body || {});
  sendSuccess(res, data, 'Psychologist report updated');
};

export const postCloneMyPsychologistReportController = async (req: Request, res: Response): Promise<void> => {
  const reportId = String(req.params.id || '').trim();
  if (!reportId) throw new AppError('id is required', 400);
  const data = await cloneProviderReportToPatientReport(authUserId(req), reportId);
  sendSuccess(res, data, 'Patient-facing report clone created', 201);
};

export const getMyPsychologistPatientReportsController = async (req: Request, res: Response): Promise<void> => {
  const patientId = typeof req.query.patientId === 'string' ? req.query.patientId : undefined;
  const data = await listProviderPatientReportClones(authUserId(req), patientId);
  sendSuccess(res, data, 'Patient-facing report clones fetched');
};

export const postShareMyPsychologistPatientReportController = async (req: Request, res: Response): Promise<void> => {
  const patientReportId = String(req.params.id || '').trim();
  if (!patientReportId) throw new AppError('id is required', 400);
  const data = await shareProviderPatientReportClone(authUserId(req), patientReportId);
  sendSuccess(res, data, 'Patient-facing report shared');
};

export const getMyPsychologistTestsController = async (req: Request, res: Response): Promise<void> => {
  const patientId = typeof req.query.patientId === 'string' ? req.query.patientId : undefined;
  const data = await listPsychologistTests(authUserId(req), patientId);
  sendSuccess(res, data, 'Psychologist tests fetched');
};

export const getMyPsychologistScheduleController = async (req: Request, res: Response): Promise<void> => {
  const data = await getPsychologistSchedule(authUserId(req));
  sendSuccess(res, data, 'Psychologist schedule fetched');
};

export const getMyPsychologistMessagesController = async (req: Request, res: Response): Promise<void> => {
  const data = await getPsychologistMessages(authUserId(req));
  sendSuccess(res, data, 'Psychologist messages fetched');
};

export const getMyPsychologistProfileController = async (req: Request, res: Response): Promise<void> => {
  const data = await getPsychologistProfile(authUserId(req));
  sendSuccess(res, data, 'Psychologist profile fetched');
};

export const getMyPsychologistSettingsController = async (req: Request, res: Response): Promise<void> => {
  const data = await getPsychologistSettings(authUserId(req));
  sendSuccess(res, data, 'Psychologist settings fetched');
};

export const putMyPsychologistSettingsController = async (req: Request, res: Response): Promise<void> => {
  const data = await upsertPsychologistSettings(authUserId(req), req.body || {});
  sendSuccess(res, data, 'Psychologist settings saved');
};
