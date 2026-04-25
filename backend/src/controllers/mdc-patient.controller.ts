import { Request, Response, NextFunction } from 'express';
import * as mdcPatientService from '../services/mdc-patient.service';
import { AppError } from '../middleware/error.middleware';

export const createPatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = String(req.params.clinicId);
    const patient = await mdcPatientService.createPatient({ ...req.body, clinicId });
    res.status(201).json(patient);
  } catch (error) {
    next(error);
  }
};

export const bulkUploadPatients = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = String(req.params.clinicId);
    const { patients } = req.body;
    
    if (!Array.isArray(patients)) {
      throw new AppError('Patients must be an array', 400);
    }

    const results = await mdcPatientService.bulkCreatePatients(clinicId, patients);
    res.json(results);
  } catch (error) {
    next(error);
  }
};

export const listPatients = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = String(req.params.clinicId);
    const patients = await mdcPatientService.getClinicPatients(clinicId);
    res.json(patients);
  } catch (error) {
    next(error);
  }
};
