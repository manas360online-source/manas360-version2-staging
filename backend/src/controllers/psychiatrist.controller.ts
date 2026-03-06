import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import {
  listPsychiatristPatients,
  getPsychiatristDashboard,
  createPsychiatricAssessment,
  listPsychiatricAssessments,
  createPrescription,
  listPrescriptions,
  checkDrugInteractions,
  recordMedicationAdjustment,
  listMedicationHistory,
  getParameterTracking,
  scheduleFollowUp,
  getSelfModeDashboard,
} from '../services/psychiatrist.service';

const authUserId = (req: Request): string => {
  const userId = req.auth?.userId;
  if (!userId) throw new AppError('Authentication required', 401);
  return userId;
};

export const getMyPsychiatristDashboardController = async (req: Request, res: Response): Promise<void> => {
  const patientId = typeof req.query.patientId === 'string' ? req.query.patientId : undefined;
  const data = await getPsychiatristDashboard(authUserId(req), patientId);
  sendSuccess(res, data, 'Psychiatrist dashboard fetched');
};

export const getMyPsychiatristSelfModeController = async (req: Request, res: Response): Promise<void> => {
  const data = await getSelfModeDashboard(authUserId(req));
  sendSuccess(res, data, 'Psychiatrist self mode dashboard fetched');
};

export const getMyPsychiatristPatientsController = async (req: Request, res: Response): Promise<void> => {
  const data = await listPsychiatristPatients(authUserId(req));
  sendSuccess(res, data, 'Psychiatrist patients fetched');
};

export const postMyPsychiatricAssessmentController = async (req: Request, res: Response): Promise<void> => {
  const data = await createPsychiatricAssessment(authUserId(req), req.body || {});
  sendSuccess(res, data, 'Psychiatric assessment created', 201);
};

export const getMyPsychiatricAssessmentsController = async (req: Request, res: Response): Promise<void> => {
  const patientId = typeof req.query.patientId === 'string' ? req.query.patientId : undefined;
  const data = await listPsychiatricAssessments(authUserId(req), patientId);
  sendSuccess(res, data, 'Psychiatric assessments fetched');
};

export const postMyPrescriptionController = async (req: Request, res: Response): Promise<void> => {
  const data = await createPrescription(authUserId(req), req.body || {});
  sendSuccess(res, data, 'Prescription created', 201);
};

export const getMyPrescriptionsController = async (req: Request, res: Response): Promise<void> => {
  const patientId = typeof req.query.patientId === 'string' ? req.query.patientId : undefined;
  const data = await listPrescriptions(authUserId(req), patientId);
  sendSuccess(res, data, 'Prescriptions fetched');
};

export const postMyDrugInteractionCheckController = async (req: Request, res: Response): Promise<void> => {
  const data = await checkDrugInteractions(authUserId(req), req.body || {});
  sendSuccess(res, data, 'Drug interaction check completed');
};

export const postMyMedicationHistoryController = async (req: Request, res: Response): Promise<void> => {
  const data = await recordMedicationAdjustment(authUserId(req), req.body || {});
  sendSuccess(res, data, 'Medication history entry created', 201);
};

export const getMyMedicationHistoryController = async (req: Request, res: Response): Promise<void> => {
  const patientId = typeof req.query.patientId === 'string' ? req.query.patientId : undefined;
  const data = await listMedicationHistory(authUserId(req), patientId);
  sendSuccess(res, data, 'Medication history fetched');
};

export const getMyParameterTrackingController = async (req: Request, res: Response): Promise<void> => {
  const patientId = String(req.params.patientId || '').trim();
  if (!patientId) throw new AppError('patientId is required', 400);
  const data = await getParameterTracking(authUserId(req), patientId);
  sendSuccess(res, data, 'Parameter tracking fetched');
};

export const postMyFollowUpController = async (req: Request, res: Response): Promise<void> => {
  const data = await scheduleFollowUp(authUserId(req), req.body || {});
  sendSuccess(res, data, 'Follow-up scheduled', 201);
};
