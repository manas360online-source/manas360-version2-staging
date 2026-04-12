import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { generatePDF } from './pdfService';

type DbClient = typeof prisma;

type AgreementTemplateRecord = {
  id: number;
  template_name: string;
  template_type: string;
  template_html: string;
  template_variables: unknown;
  is_active: boolean;
};

type CreateAgreementInput = {
  template_id: number;
  agreement_type: string;
  partner_name: string;
  partner_type: string;
  partner_contact_name: string;
  partner_contact_email: string;
  partner_contact_phone: string;
  start_date: string | Date;
  end_date?: string | Date | null;
  annual_value?: number | null;
  payment_terms?: string | null;
  billing_cycle?: string | null;
  template_data: Record<string, unknown>;
  generated_pdf_path?: string | null;
};

const PARTNER_TYPE_CODE_MAP: Record<string, string> = {
  school: 'SCH',
  corporate: 'CORP',
  insurance: 'INS',
  vendor: 'VND',
};

const normalizePartnerType = (partnerType: string): string => String(partnerType || '').trim().toLowerCase();

const toPartnerTypeCode = (partnerType: string): string => {
  const normalized = normalizePartnerType(partnerType);
  const code = PARTNER_TYPE_CODE_MAP[normalized];
  if (!code) {
    throw new AppError('Invalid partnerType. Allowed values: school, corporate, insurance, vendor', 422);
  }
  return code;
};

const toDate = (value: string | Date, field: string): Date => {
  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    throw new AppError(`${field} must be a valid date`, 422);
  }
  return dateValue;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const generateAgreementNumber = async (
  partnerType: string,
  db: DbClient = prisma,
): Promise<string> => {
  const typeCode = toPartnerTypeCode(partnerType);
  const year = new Date().getFullYear();

  const rows = await db.$queryRawUnsafe(
    'SELECT COUNT(*)::int AS count FROM institutional_agreements WHERE EXTRACT(YEAR FROM created_at) = $1',
    year,
  ) as Array<{ count: number | string }>;

  const currentCount = Number(rows?.[0]?.count ?? 0);
  const nextSeq = currentCount + 1;
  const seq = String(nextSeq).padStart(3, '0');

  return `MANAS360-${typeCode}-${year}-${seq}`;
};

export const extractVariables = (templateHtml: string): string[] => {
  const html = String(templateHtml || '');
  const matches = html.matchAll(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g);
  const unique = new Set<string>();

  for (const match of matches) {
    if (match[1]) {
      unique.add(match[1]);
    }
  }

  return Array.from(unique);
};

export const substituteVariables = (
  templateHtml: string,
  data: Record<string, unknown>,
): string => {
  let output = String(templateHtml || '');
  const variables = extractVariables(output);

  for (const variableName of variables) {
    const rawValue = data?.[variableName];
    const stringValue = rawValue == null ? '' : String(rawValue);
    const tokenRegex = new RegExp(`{{\\s*${escapeRegExp(variableName)}\\s*}}`, 'g');
    output = output.replace(tokenRegex, stringValue);
  }

  return output;
};

const normalizeTemplateVariables = (templateVariables: unknown): string[] => {
  if (Array.isArray(templateVariables)) {
    return templateVariables
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  if (templateVariables && typeof templateVariables === 'object') {
    return Object.keys(templateVariables as Record<string, unknown>)
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  return [];
};

export const validateTemplateData = (
  template: Pick<AgreementTemplateRecord, 'template_html' | 'template_variables'>,
  data: Record<string, unknown>,
): string[] => {
  const varsFromConfig = normalizeTemplateVariables(template.template_variables);
  const varsFromHtml = extractVariables(template.template_html);
  const requiredFields = new Set<string>([...varsFromConfig, ...varsFromHtml]);

  const missing: string[] = [];
  for (const field of requiredFields) {
    const value = data?.[field];
    const emptyString = typeof value === 'string' && value.trim().length === 0;
    if (value == null || emptyString) {
      missing.push(field);
    }
  }

  return missing;
};

export const logEvent = async (
  agreementId: number,
  eventType: string,
  db: DbClient = prisma,
): Promise<void> => {
  await (db as any).agreementSignatureLog.create({
    data: {
      agreement_id: Number(agreementId),
      event_type: String(eventType || '').trim(),
      actor_type: 'system',
      actor_name: 'system',
      event_data: null,
    },
  });
};

export const createAgreement = async (
  data: CreateAgreementInput,
  db: DbClient = prisma,
) => {
  const template = await (db as any).agreementTemplate.findUnique({
    where: { id: Number(data.template_id) },
  }) as AgreementTemplateRecord | null;

  if (!template) {
    throw new AppError('Template not found', 404);
  }

  if (!template.is_active) {
    throw new AppError('Template is inactive', 422);
  }

  const missingFields = validateTemplateData(template, data.template_data || {});
  if (missingFields.length > 0) {
    throw new AppError('Missing template data fields', 422, { missingFields });
  }

  const agreementNumber = await generateAgreementNumber(data.partner_type, db);
  const renderedHtml = substituteVariables(template.template_html, data.template_data || {});
  const generatedPdfPath = await generatePDF(renderedHtml, agreementNumber);

  const created = await (db as any).institutionalAgreement.create({
    data: {
      agreement_number: agreementNumber,
      template_id: Number(data.template_id),
      agreement_type: String(data.agreement_type || '').trim(),
      partner_name: String(data.partner_name || '').trim(),
      partner_type: normalizePartnerType(data.partner_type),
      partner_contact_name: String(data.partner_contact_name || '').trim(),
      partner_contact_email: String(data.partner_contact_email || '').trim(),
      partner_contact_phone: String(data.partner_contact_phone || '').trim(),
      start_date: toDate(data.start_date, 'start_date'),
      end_date: data.end_date ? toDate(data.end_date, 'end_date') : null,
      annual_value: data.annual_value == null ? null : Number(data.annual_value),
      payment_terms: data.payment_terms ? String(data.payment_terms) : null,
      billing_cycle: data.billing_cycle ? String(data.billing_cycle) : null,
      template_data: {
        ...(data.template_data || {}),
        _rendered_html: renderedHtml,
      },
      generated_pdf_path: generatedPdfPath,
      signature_status: 'draft',
      status: 'draft',
    },
  });

  await (db as any).agreementTemplate.update({
    where: { id: Number(data.template_id) },
    data: {
      usage_count: {
        increment: 1,
      },
    },
  });

  await logEvent(created.id, 'created', db);

  return created;
};
