import type { Request, Response } from 'express';
import * as sessionService from '../services/mdc-session.service';

export const createSession = async (req: Request, res: Response) => {
  const clinicId = String(req.params.clinicId);
  const session = await sessionService.createSession({
    ...req.body,
    clinicId,
  });
  res.status(201).json({ data: session });
};

export const listClinicSessions = async (req: Request, res: Response) => {
  const clinicId = String(req.params.clinicId);
  const sessions = await sessionService.getClinicSessions(clinicId);
  res.json({ data: sessions });
};

export const listProviderSessions = async (req: Request, res: Response) => {
  const therapistId = String(req.params.therapistId);
  const sessions = await sessionService.getProviderSessions(therapistId);
  res.json({ data: sessions });
};

export const listPatientSessions = async (req: Request, res: Response) => {
  const patientId = String(req.params.patientId);
  const sessions = await sessionService.getPatientSessions(patientId);
  res.json({ data: sessions });
};
