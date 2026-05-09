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
  listPsychiatristMedicationLibrary,
  createPsychiatristMedicationLibraryItem,
  listPsychiatristAssessmentTemplates,
  createPsychiatristAssessmentTemplate,
  getPsychiatristAssessmentDraft,
  upsertPsychiatristAssessmentDraft,
  clearPsychiatristAssessmentDraft,
  getPsychiatristSettings,
  upsertPsychiatristSettings,
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
  // generate prescription PDF and notify patient (async)
  void (async () => {
    try {
      const { publishPrescriptionDocument } = await import('../services/documents.service');
      if (data?.id) await publishPrescriptionDocument(String(data.id));
    } catch (e) {
      console.warn('prescription publish failed', e);
    }
  })();
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

export const getMyPsychiatristMedicationLibraryController = async (req: Request, res: Response): Promise<void> => {
  const data = await listPsychiatristMedicationLibrary(authUserId(req));
  sendSuccess(res, data, 'Psychiatrist medication library fetched');
};

export const postMyPsychiatristMedicationLibraryController = async (req: Request, res: Response): Promise<void> => {
  const data = await createPsychiatristMedicationLibraryItem(authUserId(req), req.body || {});
  sendSuccess(res, data, 'Psychiatrist medication library item created', 201);
};

export const getMyPsychiatristAssessmentTemplatesController = async (req: Request, res: Response): Promise<void> => {
  const data = await listPsychiatristAssessmentTemplates(authUserId(req));
  sendSuccess(res, data, 'Psychiatrist assessment templates fetched');
};

export const postMyPsychiatristAssessmentTemplateController = async (req: Request, res: Response): Promise<void> => {
  const data = await createPsychiatristAssessmentTemplate(authUserId(req), req.body || {});
  sendSuccess(res, data, 'Psychiatrist assessment template created', 201);
};

export const getMyPsychiatristAssessmentDraftController = async (req: Request, res: Response): Promise<void> => {
  const patientId = String(req.params.patientId || '').trim();
  if (!patientId) throw new AppError('patientId is required', 400);
  const data = await getPsychiatristAssessmentDraft(authUserId(req), patientId);
  sendSuccess(res, data, 'Psychiatrist assessment draft fetched');
};

export const putMyPsychiatristAssessmentDraftController = async (req: Request, res: Response): Promise<void> => {
  const patientId = String(req.params.patientId || '').trim();
  if (!patientId) throw new AppError('patientId is required', 400);
  const data = await upsertPsychiatristAssessmentDraft(authUserId(req), patientId, req.body || {});
  sendSuccess(res, data, 'Psychiatrist assessment draft saved');
};

export const deleteMyPsychiatristAssessmentDraftController = async (req: Request, res: Response): Promise<void> => {
  const patientId = String(req.params.patientId || '').trim();
  if (!patientId) throw new AppError('patientId is required', 400);
  const data = await clearPsychiatristAssessmentDraft(authUserId(req), patientId);
  sendSuccess(res, data, 'Psychiatrist assessment draft cleared');
};

export const getMyPsychiatristSettingsController = async (req: Request, res: Response): Promise<void> => {
  const data = await getPsychiatristSettings(authUserId(req));
  sendSuccess(res, data, 'Psychiatrist settings fetched');
};

export const putMyPsychiatristSettingsController = async (req: Request, res: Response): Promise<void> => {
  const data = await upsertPsychiatristSettings(authUserId(req), req.body || {});
  sendSuccess(res, data, 'Psychiatrist settings saved');
};
