import { Request, Response, NextFunction } from 'express';
import * as mdcClinicService from '../services/mdc-clinic.service';
import { mdcPricingService } from '../services/mdc-pricing.service';

export const registerClinic = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinic = await mdcClinicService.createClinic(req.body);
    res.status(201).json(clinic);
  } catch (error) {
    next(error);
  }
};

export const getFeatures = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const features = await mdcPricingService.getFeatures();
    res.json(features);
  } catch (error) {
    next(error);
  }
};

export const calculatePricing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pricing = await mdcPricingService.calculatePrice(req.body);
    res.json(pricing);
  } catch (error) {
    next(error);
  }
};
