import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import { createAgreement } from '../services/agreementService';
import { checkStatus, sendForSignature } from '../services/eSignService';
import {
  listAgreementTemplates,
  listInstitutionalAgreements,
} from '../services/institutional-agreement.service';

const parseAgreementId = (value: unknown): number => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('Agreement id must be a positive integer', 400);
  }
  return id;
};

export const createInstitutionalAgreementController = async (req: Request, res: Response): Promise<void> => {
  const payload = req.body || {};
  const created = await createAgreement({
    template_id: Number(payload.template_id),
    agreement_type: String(payload.agreement_type || ''),
    partner_name: String(payload.partner_name || ''),
    partner_type: String(payload.partner_type || ''),
    partner_contact_name: String(payload.partner_contact_name || ''),
    partner_contact_email: String(payload.partner_contact_email || ''),
    partner_contact_phone: String(payload.partner_contact_phone || ''),
    start_date: payload.start_date,
    end_date: payload.end_date,
    annual_value: payload.annual_value == null ? null : Number(payload.annual_value),
    payment_terms: payload.payment_terms,
    billing_cycle: payload.billing_cycle,
    template_data: payload.template_data ?? {},
    generated_pdf_path: payload.generated_pdf_path,
  });

  sendSuccess(res, created, 'Institutional agreement created successfully', 201);
};

export const sendInstitutionalAgreementController = async (req: Request, res: Response): Promise<void> => {
  const agreementId = parseAgreementId(req.params.id);
  const updated = await sendForSignature(agreementId);
  sendSuccess(res, updated, 'Institutional agreement sent successfully');
};

export const getInstitutionalAgreementStatusController = async (req: Request, res: Response): Promise<void> => {
  const agreementId = parseAgreementId(req.params.id);
  const status = await checkStatus(agreementId);
  sendSuccess(res, status, 'Institutional agreement status fetched successfully');
};

export const listInstitutionalAgreementsController = async (req: Request, res: Response): Promise<void> => {
  const data = await listInstitutionalAgreements({
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    partner_type: typeof req.query.partner_type === 'string' ? req.query.partner_type : undefined,
    limit: typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined,
    offset: typeof req.query.offset === 'string' ? Number(req.query.offset) : undefined,
  });

  sendSuccess(res, data, 'Institutional agreements fetched successfully');
};

export const listAgreementTemplatesController = async (req: Request, res: Response): Promise<void> => {
  const includeInactive = String(req.query.include_inactive || '').toLowerCase() === 'true';
  const data = await listAgreementTemplates({
    is_active: includeInactive ? undefined : true,
  });

  sendSuccess(res, data, 'Agreement templates fetched successfully');
};
