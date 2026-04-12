import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';

// Keep DB client generic to stay compatible with existing service patterns.
type DbClient = typeof prisma;

const AGREEMENT_TYPE_MAP: Record<string, string> = {
  school: 'SCH',
  corporate: 'CORP',
  insurance: 'INS',
  vendor: 'VND',
};

const toAgreementTypeCode = (partnerType: string): string => {
  const normalized = String(partnerType || '').trim().toLowerCase();
  const code = AGREEMENT_TYPE_MAP[normalized];
  if (!code) {
    throw new AppError('Invalid partner_type. Allowed values: school, corporate, insurance, vendor', 422);
  }
  return code;
};

export const generateAgreementNumber = async (
  partnerType: string,
  db: DbClient = prisma,
): Promise<string> => {
  const typeCode = toAgreementTypeCode(partnerType);
  const year = new Date().getFullYear();

  // Sequence is year-scoped across all institutional agreements.
  const rows = await db.$queryRawUnsafe(
    'SELECT COUNT(*)::int AS count FROM institutional_agreements WHERE EXTRACT(YEAR FROM created_at) = $1',
    year,
  ) as Array<{ count: number | string }>;

  const currentCount = Number(rows?.[0]?.count ?? 0);
  const nextSequence = currentCount + 1;
  const sequencePart = String(nextSequence).padStart(3, '0');

  return `MANAS360-${typeCode}-${year}-${sequencePart}`;
};

type CreateInstitutionalAgreementInput = {
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
  template_data: unknown;
  generated_pdf_path?: string | null;
};

const toValidDate = (value: string | Date, field: string): Date => {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`${field} must be a valid date`, 422);
  }
  return parsed;
};

export const createInstitutionalAgreement = async (
  input: CreateInstitutionalAgreementInput,
  db: DbClient = prisma,
) => {
  const partnerType = String(input.partner_type || '').trim().toLowerCase();
  const agreementNumber = await generateAgreementNumber(partnerType, db);

  const template = await (db as any).agreementTemplate.findUnique({
    where: { id: Number(input.template_id) },
    select: { id: true, is_active: true },
  });

  if (!template) {
    throw new AppError('Template not found', 404);
  }

  const created = await (db as any).institutionalAgreement.create({
    data: {
      agreement_number: agreementNumber,
      template_id: Number(input.template_id),
      agreement_type: String(input.agreement_type || '').trim(),
      partner_name: String(input.partner_name || '').trim(),
      partner_type: partnerType,
      partner_contact_name: String(input.partner_contact_name || '').trim(),
      partner_contact_email: String(input.partner_contact_email || '').trim(),
      partner_contact_phone: String(input.partner_contact_phone || '').trim(),
      start_date: toValidDate(input.start_date, 'start_date'),
      end_date: input.end_date ? toValidDate(input.end_date, 'end_date') : null,
      annual_value: input.annual_value == null ? null : Number(input.annual_value),
      payment_terms: input.payment_terms ? String(input.payment_terms) : null,
      billing_cycle: input.billing_cycle ? String(input.billing_cycle) : null,
      template_data: input.template_data ?? {},
      generated_pdf_path: input.generated_pdf_path ? String(input.generated_pdf_path) : null,
      signature_status: 'draft',
      status: 'draft',
    },
  });

  await (db as any).agreementTemplate.update({
    where: { id: Number(input.template_id) },
    data: { usage_count: { increment: 1 } },
  });

  await (db as any).agreementSignatureLog.create({
    data: {
      agreement_id: created.id,
      event_type: 'created',
      actor_type: 'system',
      actor_name: 'system',
      event_data: { status: 'draft' },
    },
  });

  return created;
};

export const sendInstitutionalAgreement = async (
  agreementId: number,
  actorName = 'system',
  db: DbClient = prisma,
) => {
  const existing = await (db as any).institutionalAgreement.findUnique({ where: { id: agreementId } });
  if (!existing) {
    throw new AppError('Agreement not found', 404);
  }

  const updated = await (db as any).institutionalAgreement.update({
    where: { id: agreementId },
    data: {
      signature_status: 'sent',
      status: existing.status === 'draft' ? 'pending_signature' : existing.status,
    },
  });

  await (db as any).agreementSignatureLog.create({
    data: {
      agreement_id: agreementId,
      event_type: 'sent',
      actor_type: 'user',
      actor_name: String(actorName || 'system'),
      event_data: { previous_status: existing.status, signature_status: 'sent' },
    },
  });

  return updated;
};

export const getInstitutionalAgreementStatus = async (
  agreementId: number,
  db: DbClient = prisma,
) => {
  const agreement = await (db as any).institutionalAgreement.findUnique({
    where: { id: agreementId },
    select: {
      id: true,
      agreement_number: true,
      signature_status: true,
      status: true,
      created_at: true,
    },
  });

  if (!agreement) {
    throw new AppError('Agreement not found', 404);
  }

  const events = await (db as any).agreementSignatureLog.findMany({
    where: { agreement_id: agreementId },
    orderBy: { created_at: 'desc' },
    take: 20,
  });

  return { ...agreement, events };
};

export const listInstitutionalAgreements = async (
  params: { status?: string; partner_type?: string; limit?: number; offset?: number } = {},
  db: DbClient = prisma,
) => {
  const where: Record<string, unknown> = {};
  if (params.status) where.status = String(params.status);
  if (params.partner_type) where.partner_type = String(params.partner_type).toLowerCase();

  const limit = Math.min(Math.max(Number(params.limit ?? 50), 1), 200);
  const offset = Math.max(Number(params.offset ?? 0), 0);

  const [items, total] = await Promise.all([
    (db as any).institutionalAgreement.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit,
      include: {
        template: {
          select: {
            id: true,
            template_name: true,
            template_type: true,
            version: true,
          },
        },
      },
    }),
    (db as any).institutionalAgreement.count({ where }),
  ]);

  return {
    items,
    pagination: {
      total,
      limit,
      offset,
    },
  };
};

export const listAgreementTemplates = async (
  params: { is_active?: boolean } = {},
  db: DbClient = prisma,
) => {
  const where: Record<string, unknown> = {};
  if (typeof params.is_active === 'boolean') {
    where.is_active = params.is_active;
  }

  const items = await (db as any).agreementTemplate.findMany({
    where,
    orderBy: [{ is_active: 'desc' }, { created_at: 'desc' }],
  });

  return { items };
};
