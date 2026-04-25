import type { Request, Response } from 'express';
import * as staffService from '../services/mdc-staff.service';

export const createStaff = async (req: Request, res: Response) => {
  const { clinicId } = req.params;
  const staff = await staffService.createStaff({
    ...req.body,
    clinicId,
  });
  res.status(201).json({ data: staff });
};

export const listStaff = async (req: Request, res: Response) => {
  const { clinicId } = req.params;
  const staff = await staffService.getClinicStaff(clinicId);
  res.json({ data: staff });
};

export const deactivateStaff = async (req: Request, res: Response) => {
  const { staffId } = req.params;
  await staffService.deactivateStaff(staffId);
  res.status(204).end();
};
