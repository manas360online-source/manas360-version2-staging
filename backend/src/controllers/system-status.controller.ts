import { Request, Response } from 'express';
import * as systemStatusService from '../services/system-status.service';

export const getStatus = async (req: Request, res: Response) => {
  try {
    const status = await systemStatusService.getSystemStatus();
    res.status(200).json({
      status: 'success',
      data: status
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

export const activate = async (req: Request, res: Response) => {
  const { pin, signature, actor } = req.body;
  
  if (!pin || !signature) {
    return res.status(400).json({
      status: 'error',
      message: 'PIN and signature are required'
    });
  }

  try {
    const status = await systemStatusService.activateSystem(pin, signature, actor || 'ADMIN_TRIGGER');
    res.status(200).json({
      status: 'success',
      message: 'Practice Activated Successfully',
      data: status
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};
