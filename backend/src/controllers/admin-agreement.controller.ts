import type { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';

type AdminAgreementTier = 'startup' | 'growth' | 'enterprise' | 'custom';

type InstitutionalAgreementRecord = {
  id: number;
  agreement_number: string;
  partner_name: string;
  partner_contact_email: string;
  partner_contact_phone: string;
  annual_value: number | null;
  status: string;
  template_data: Record<string, unknown> | null;
  generated_pdf_path: string | null;
  created_at: Date;
};

type AdminAgreementView = {
  id: string;
  agreement_number: string;
  company_legal_name: string;
  signatory_email: string;
  signatory_phone: string;
  selected_tier: AdminAgreementTier;
  employee_count: number;
  annual_fee: number;
  per_employee_rate: number;
  status: string;
  signed_document_url: string | null;
  share_url: string | null;
  share_token: string | null;
  createdAt: Date;
};

const inMemoryAgreements: AdminAgreementView[] = [];
let inMemoryAgreementCounter = 1;

const normalizeTier = (value: unknown): AdminAgreementTier => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'growth' || normalized === 'enterprise' || normalized === 'custom') {
    return normalized;
  }
  return 'startup';
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseAgreementId = (value: unknown): number => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('Agreement id must be a positive integer', 400);
  }
  return id;
};

const parseStatus = (value: unknown): string => {
  const normalized = String(value || '').trim().toLowerCase();
  const allowed = ['draft', 'sent', 'client_reviewing', 'signed_uploaded', 'active', 'rejected'];
  if (!allowed.includes(normalized)) {
    throw new AppError('Invalid agreement status', 400);
  }
  return normalized;
};

const mapInstitutionalToAdmin = (record: InstitutionalAgreementRecord): AdminAgreementView => {
  const templateData = record.template_data || {};
  const annualFee = toNumber(templateData.annual_fee, record.annual_value ?? 0);
  const employeeCount = Math.max(0, Math.trunc(toNumber(templateData.employee_count, 0)));
  const perEmployeeRate = toNumber(templateData.per_employee_rate, employeeCount > 0 ? annualFee / employeeCount : 0);

  return {
    id: String(record.id),
    agreement_number: record.agreement_number,
    company_legal_name: record.partner_name,
    signatory_email: record.partner_contact_email,
    signatory_phone: record.partner_contact_phone,
    selected_tier: normalizeTier(templateData.selected_tier),
    employee_count: employeeCount,
    annual_fee: annualFee,
    per_employee_rate: Math.round(perEmployeeRate),
    status: String(record.status || 'draft').toLowerCase(),
    signed_document_url: record.generated_pdf_path,
    share_url: null,
    share_token: null,
    createdAt: record.created_at,
  };
};

const isDbUnavailableError = (error: unknown): boolean => {
  const message = String((error as any)?.message || '').toLowerCase();
  return (
    message.includes('can\'t reach database server')
    || message.includes('econnrefused')
    || message.includes('connection timeout')
    || message.includes('prismaclientinitializationerror')
  );
};

const ensureTemplateId = async (): Promise<number> => {
  const activeTemplate = await (prisma as any).agreementTemplate.findFirst({
    where: { is_active: true },
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  if (activeTemplate?.id) {
    return Number(activeTemplate.id);
  }

  const createdTemplate = await (prisma as any).agreementTemplate.create({
    data: {
      template_name: 'Default Corporate Agreement Template',
      template_type: 'corporate',
      template_html: '<html><body><h1>MANAS360 Corporate Agreement</h1><p>{{company_legal_name}}</p></body></html>',
      template_variables: ['company_legal_name'],
      description: 'Auto-generated default template',
      version: '1.0',
      is_active: true,
    },
    select: { id: true },
  });

  return Number(createdTemplate.id);
};

const createInMemoryAgreement = (payload: {
  company_legal_name: string;
  signatory_email: string;
  signatory_phone: string;
  selected_tier: AdminAgreementTier;
  employee_count: number;
  annual_fee: number;
  per_employee_rate: number;
}): AdminAgreementView => {
  const year = new Date().getFullYear();
  const id = String(inMemoryAgreementCounter++);
  const created: AdminAgreementView = {
    id,
    agreement_number: `MANAS360-CORP-${year}-${id.padStart(3, '0')}`,
    company_legal_name: payload.company_legal_name,
    signatory_email: payload.signatory_email,
    signatory_phone: payload.signatory_phone,
    selected_tier: payload.selected_tier,
    employee_count: payload.employee_count,
    annual_fee: payload.annual_fee,
    per_employee_rate: payload.per_employee_rate,
    status: 'draft',
    signed_document_url: null,
    share_url: null,
    share_token: null,
    createdAt: new Date(),
  };

  inMemoryAgreements.unshift(created);
  return created;
};

export const listAdminAgreementsController = async (req: Request, res: Response): Promise<void> => {
  const status = typeof req.query.status === 'string' ? req.query.status.trim().toLowerCase() : undefined;

  try {
    const where = status ? { status } : undefined;
    const records = await (prisma as any).institutionalAgreement.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 200,
    });

    const items = (records as InstitutionalAgreementRecord[]).map(mapInstitutionalToAdmin);
    sendSuccess(res, { items }, 'Admin agreements fetched successfully');
    return;
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
  }

  const items = status ? inMemoryAgreements.filter((item) => item.status === status) : inMemoryAgreements;
  sendSuccess(res, { items }, 'Admin agreements fetched successfully (fallback mode)');
};

export const getAdminAgreementByIdController = async (req: Request, res: Response): Promise<void> => {
  const id = parseAgreementId(req.params.agreementId);

  try {
    const record = await (prisma as any).institutionalAgreement.findUnique({
      where: { id },
    }) as InstitutionalAgreementRecord | null;

    if (!record) {
      throw new AppError('Agreement not found', 404);
    }

    sendSuccess(res, mapInstitutionalToAdmin(record), 'Admin agreement fetched successfully');
    return;
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
  }

  const found = inMemoryAgreements.find((item) => Number(item.id) === id);
  if (!found) throw new AppError('Agreement not found', 404);
  sendSuccess(res, found, 'Admin agreement fetched successfully (fallback mode)');
};

export const createAdminAgreementController = async (req: Request, res: Response): Promise<void> => {
  const body = req.body || {};
  const companyLegalName = String(body.company_legal_name || '').trim();
  const signatoryEmail = String(body.signatory_email || '').trim();
  const signatoryPhone = String(body.signatory_phone || '').trim();
  const selectedTier = normalizeTier(body.selected_tier);
  const employeeCount = Math.max(1, Math.trunc(toNumber(body.employee_count, 0)));
  const annualFee = Math.max(0, toNumber(body.annual_fee, 0));
  const perEmployeeRate = Math.max(0, toNumber(body.per_employee_rate, 0));

  if (!companyLegalName || !signatoryEmail || !signatoryPhone) {
    throw new AppError('company_legal_name, signatory_email and signatory_phone are required', 400);
  }

  try {
    const templateId = await ensureTemplateId();
    const year = new Date().getFullYear();
    const count = await (prisma as any).institutionalAgreement.count();
    const agreementNumber = `MANAS360-CORP-${year}-${String(count + 1).padStart(3, '0')}`;

    const created = await (prisma as any).institutionalAgreement.create({
      data: {
        agreement_number: agreementNumber,
        template_id: templateId,
        agreement_type: 'corporate_eap',
        partner_name: companyLegalName,
        partner_type: 'corporate',
        partner_contact_name: companyLegalName,
        partner_contact_email: signatoryEmail,
        partner_contact_phone: signatoryPhone,
        start_date: new Date(),
        annual_value: annualFee,
        payment_terms: 'Net 30',
        billing_cycle: 'annual',
        template_data: {
          company_legal_name: companyLegalName,
          signatory_email: signatoryEmail,
          signatory_phone: signatoryPhone,
          selected_tier: selectedTier,
          employee_count: employeeCount,
          annual_fee: annualFee,
          per_employee_rate: perEmployeeRate,
        },
        signature_status: 'draft',
        status: 'draft',
      },
    }) as InstitutionalAgreementRecord;

    sendSuccess(res, mapInstitutionalToAdmin(created), 'Admin agreement created successfully', 201);
    return;
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
  }

  const fallbackCreated = createInMemoryAgreement({
    company_legal_name: companyLegalName,
    signatory_email: signatoryEmail,
    signatory_phone: signatoryPhone,
    selected_tier: selectedTier,
    employee_count: employeeCount,
    annual_fee: annualFee,
    per_employee_rate: perEmployeeRate,
  });

  sendSuccess(res, fallbackCreated, 'Admin agreement created successfully (fallback mode)', 201);
};

export const approveAdminAgreementController = async (req: Request, res: Response): Promise<void> => {
  const id = parseAgreementId(req.params.agreementId);

  try {
    const existing = await (prisma as any).institutionalAgreement.findUnique({ where: { id } }) as InstitutionalAgreementRecord | null;
    if (!existing) {
      throw new AppError('Agreement not found', 404);
    }

    if (String(existing.status || '').toLowerCase() !== 'signed_uploaded') {
      throw new AppError('Agreement can be approved only when status is signed_uploaded', 409);
    }

    const updated = await (prisma as any).institutionalAgreement.update({
      where: { id },
      data: { status: 'active', signature_status: 'signed' },
    }) as InstitutionalAgreementRecord;

    sendSuccess(res, mapInstitutionalToAdmin(updated), 'Agreement approved successfully');
    return;
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
  }

  const existing = inMemoryAgreements.find((item) => Number(item.id) === id);
  if (!existing) throw new AppError('Agreement not found', 404);
  if (existing.status !== 'signed_uploaded') {
    throw new AppError('Agreement can be approved only when status is signed_uploaded', 409);
  }

  existing.status = 'active';
  sendSuccess(res, existing, 'Agreement approved successfully (fallback mode)');
};

export const rejectAdminAgreementController = async (req: Request, res: Response): Promise<void> => {
  const id = parseAgreementId(req.params.agreementId);
  const reason = String(req.body?.reason || '').trim();
  if (reason.length < 3) {
    throw new AppError('Rejection reason must be at least 3 characters', 400);
  }

  try {
    const existing = await (prisma as any).institutionalAgreement.findUnique({ where: { id } }) as InstitutionalAgreementRecord | null;
    if (!existing) {
      throw new AppError('Agreement not found', 404);
    }

    const updated = await (prisma as any).institutionalAgreement.update({
      where: { id },
      data: {
        status: 'rejected',
        template_data: {
          ...(existing.template_data || {}),
          rejection_reason: reason,
        },
      },
    }) as InstitutionalAgreementRecord;

    sendSuccess(res, mapInstitutionalToAdmin(updated), 'Agreement rejected successfully');
    return;
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
  }

  const existing = inMemoryAgreements.find((item) => Number(item.id) === id);
  if (!existing) throw new AppError('Agreement not found', 404);
  existing.status = 'rejected';
  sendSuccess(res, existing, 'Agreement rejected successfully (fallback mode)');
};

export const updateAdminAgreementStatusController = async (req: Request, res: Response): Promise<void> => {
  const id = parseAgreementId(req.params.agreementId);
  const status = parseStatus(req.body?.status);

  try {
    const existing = await (prisma as any).institutionalAgreement.findUnique({ where: { id } }) as InstitutionalAgreementRecord | null;
    if (!existing) {
      throw new AppError('Agreement not found', 404);
    }

    const updated = await (prisma as any).institutionalAgreement.update({
      where: { id },
      data: { status },
    }) as InstitutionalAgreementRecord;

    sendSuccess(res, mapInstitutionalToAdmin(updated), 'Agreement status updated successfully');
    return;
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
  }

  const existing = inMemoryAgreements.find((item) => Number(item.id) === id);
  if (!existing) throw new AppError('Agreement not found', 404);
  existing.status = status;
  sendSuccess(res, existing, 'Agreement status updated successfully (fallback mode)');
};
