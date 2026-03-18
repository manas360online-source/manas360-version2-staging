import { Request, Response, NextFunction } from 'express';
import { getSystemStatus } from '../services/system-status.service';

export const launchGuard = async (req: Request, res: Response, next: NextFunction) => {
  // 1. Allow health check and metrics
  if (req.path === '/health' || req.path === '/metrics') {
    return next();
  }

  // 2. Allow system-status routes (so we can check status and activate)
  if (req.path.includes('/system-status')) {
    return next();
  }

  try {
    const status = await getSystemStatus();
    
    // 3. If live, allow all requests
    if (status.isLive) {
      return next();
    }

    // 4. If not live, block access
    // We allow /v1/auth/login just in case, but the frontend will show the launch screen anyway.
    // Actually, per user request: "The backend must reject all Patient/Provider logins if isLive is false."
    
    return res.status(403).json({
      status: 'error',
      message: 'Clinical Infrastructure Preparing. External Access Restricted.',
      code: 'SYSTEM_NOT_LIVE'
    });
  } catch (error) {
    // If DB check fails, we err on the side of caution
    console.error('Launch guard check failed:', error);
    return res.status(403).json({
      status: 'error',
      message: 'System initialization in progress...'
    });
  }
};
