import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';
import { mdcPricingService } from '../services/mdc-pricing.service';

export interface MdcRequest extends Request {
  mdcContext?: {
    clinicId: string;
    role: 'admin' | 'therapist' | 'patient';
    loginCode: string;
  };
}

export const requireMdcTenant = async (req: MdcRequest, res: Response, next: NextFunction) => {
  // MDC tokens should have clinicId and mdcRole in their payload
  // This expects the auth middleware to have already run and populated req.auth
  const auth = (req as any).auth;

  if (!auth || !auth.clinicId) {
    return next(new AppError('MDC context required', 403));
  }

  req.mdcContext = {
    clinicId: auth.clinicId,
    role: auth.mdcRole,
    loginCode: auth.loginCode,
  };

  next();
};

export const requireMdcFeature = (featureSlug: string) => {
  return async (req: MdcRequest, res: Response, next: NextFunction) => {
    if (!req.mdcContext) {
      return next(new AppError('MDC context required', 403));
    }

    const hasAccess = await mdcPricingService.validateFeatureAccess(
      req.mdcContext.clinicId,
      featureSlug
    );

    if (!hasAccess) {
      return next(new AppError(`Feature '${featureSlug}' not available in your plan`, 403));
    }

    next();
  };
};
