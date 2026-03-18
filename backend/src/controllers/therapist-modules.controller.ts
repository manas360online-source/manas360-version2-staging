import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import {
  listTherapistStructuredSessionNotes,
  upsertTherapistStructuredSessionNote,
  generateTherapistAiSessionNote,
  listTherapistExercises,
  createTherapistExercise,
  updateTherapistExercise,
  bumpTherapistExerciseCompletion,
  deleteTherapistExercise,
  listTherapistAssessmentRecords,
  createTherapistAssessmentRecord,
  listTherapistResources,
  createTherapistResource,
  bumpTherapistResourceView,
  deleteTherapistResource,
  listTherapistCareTeamMembers,
  createTherapistCareTeamMember,
  updateTherapistCareTeamMember,
  deleteTherapistCareTeamMember,
} from '../services/therapist-modules.service';

const authUserId = (req: Request): string => {
  const userId = req.auth?.userId;
  if (!userId) throw new AppError('Authentication required', 401);
  return userId;
};

export const getMyTherapistStructuredSessionNotesController = async (req: Request, res: Response): Promise<void> => {
  const data = await listTherapistStructuredSessionNotes(authUserId(req));
  sendSuccess(res, data, 'Therapist structured session notes fetched');
};

export const putMyTherapistStructuredSessionNoteController = async (req: Request, res: Response): Promise<void> => {
  const sessionId = String(req.params.sessionId || '').trim();
  if (!sessionId) throw new AppError('sessionId is required', 400);

  const data = await upsertTherapistStructuredSessionNote(authUserId(req), sessionId, req.body || {});
  sendSuccess(res, data, 'Therapist structured session note saved');
};

export const postGenerateAiSessionNoteController = async (req: Request, res: Response): Promise<void> => {
  const sessionId = String(req.params.sessionId || '').trim();
  if (!sessionId) throw new AppError('sessionId is required', 400);

  const data = await generateTherapistAiSessionNote(authUserId(req), sessionId);
  sendSuccess(res, data, 'AI clinical note generated');
};

export const getMyTherapistExercisesController = async (req: Request, res: Response): Promise<void> => {
  const data = await listTherapistExercises(authUserId(req));
  sendSuccess(res, data, 'Therapist exercises fetched');
};

export const postMyTherapistExerciseController = async (req: Request, res: Response): Promise<void> => {
  const data = await createTherapistExercise(authUserId(req), req.body || {});
  sendSuccess(res, data, 'Therapist exercise created', 201);
};

export const patchMyTherapistExerciseController = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id || '').trim();
  if (!id) throw new AppError('id is required', 400);

  const data = await updateTherapistExercise(authUserId(req), id, req.body || {});
  sendSuccess(res, data, 'Therapist exercise updated');
};

export const postMyTherapistExerciseTrackController = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id || '').trim();
  if (!id) throw new AppError('id is required', 400);

  const amount = Number(req.body?.amount || 10);
  const data = await bumpTherapistExerciseCompletion(authUserId(req), id, amount);
  sendSuccess(res, data, 'Therapist exercise completion tracked');
};

export const deleteMyTherapistExerciseController = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id || '').trim();
  if (!id) throw new AppError('id is required', 400);

  const data = await deleteTherapistExercise(authUserId(req), id);
  sendSuccess(res, data, 'Therapist exercise deleted');
};

export const getMyTherapistAssessmentsController = async (req: Request, res: Response): Promise<void> => {
  const data = await listTherapistAssessmentRecords(authUserId(req));
  sendSuccess(res, data, 'Therapist assessments fetched');
};

export const postMyTherapistAssessmentController = async (req: Request, res: Response): Promise<void> => {
  const data = await createTherapistAssessmentRecord(authUserId(req), req.body || {});
  sendSuccess(res, data, 'Therapist assessment created', 201);
};

export const getMyTherapistResourcesController = async (req: Request, res: Response): Promise<void> => {
  const data = await listTherapistResources(authUserId(req));
  sendSuccess(res, data, 'Therapist resources fetched');
};

export const postMyTherapistResourceController = async (req: Request, res: Response): Promise<void> => {
  const data = await createTherapistResource(authUserId(req), req.body || {});
  sendSuccess(res, data, 'Therapist resource created', 201);
};

export const postMyTherapistResourceTrackController = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id || '').trim();
  if (!id) throw new AppError('id is required', 400);

  const data = await bumpTherapistResourceView(authUserId(req), id);
  sendSuccess(res, data, 'Therapist resource view tracked');
};

export const deleteMyTherapistResourceController = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id || '').trim();
  if (!id) throw new AppError('id is required', 400);

  const data = await deleteTherapistResource(authUserId(req), id);
  sendSuccess(res, data, 'Therapist resource deleted');
};

export const getMyTherapistCareTeamController = async (req: Request, res: Response): Promise<void> => {
  const patientId = typeof req.query.patientId === 'string' ? req.query.patientId : undefined;
  const data = await listTherapistCareTeamMembers(authUserId(req), patientId);
  sendSuccess(res, data, 'Therapist care team fetched');
};

export const postMyTherapistCareTeamController = async (req: Request, res: Response): Promise<void> => {
  const data = await createTherapistCareTeamMember(authUserId(req), req.body || {});
  sendSuccess(res, data, 'Therapist care team member created', 201);
};

export const patchMyTherapistCareTeamController = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id || '').trim();
  if (!id) throw new AppError('id is required', 400);

  const data = await updateTherapistCareTeamMember(authUserId(req), id, req.body || {});
  sendSuccess(res, data, 'Therapist care team member updated');
};

export const deleteMyTherapistCareTeamController = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id || '').trim();
  if (!id) throw new AppError('id is required', 400);

  const data = await deleteTherapistCareTeamMember(authUserId(req), id);
  sendSuccess(res, data, 'Therapist care team member deleted');
};
