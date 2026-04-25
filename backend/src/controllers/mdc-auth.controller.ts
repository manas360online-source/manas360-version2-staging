import type { Request, Response } from 'express';
import * as mdcAuthService from '../services/mdc-auth.service';

export const requestOtp = async (req: Request, res: Response) => {
  const { loginCode, phone } = req.body;
  const result = await mdcAuthService.requestLoginOtp(loginCode, phone);
  res.json(result);
};

export const verifyOtp = async (req: Request, res: Response) => {
  const { loginCode, otp } = req.body;
  const result = await mdcAuthService.verifyLoginOtp(loginCode, otp);
  res.json(result);
};
