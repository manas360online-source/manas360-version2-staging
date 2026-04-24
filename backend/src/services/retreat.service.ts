import { prisma as db } from '../config/db';

export interface SubmitRetreatIntentInput {
  name: string;
  phone: string;
  email?: string;
  theme: string;
  preferredDates?: string;
  groupSize?: string;
  budgetRange?: string;
  personalNote?: string;
  consentContact?: boolean;
}

export const submitRetreatIntent = async (input: SubmitRetreatIntentInput) => {
  const intent = await db.retreatIntent.create({
    data: {
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || null,
      theme: input.theme,
      preferredDates: input.preferredDates || null,
      groupSize: input.groupSize || null,
      budgetRange: input.budgetRange || null,
      personalNote: input.personalNote || null,
      consentContact: input.consentContact ?? true,
      status: 'RECEIVED',
    },
  });
  return intent;
};

export const listRetreatIntents = async (opts?: {
  status?: string;
  theme?: string;
  skip?: number;
  take?: number;
}) => {
  const where: Record<string, unknown> = {};
  if (opts?.status) where.status = opts.status;
  if (opts?.theme) where.theme = opts.theme;

  const [items, total] = await Promise.all([
    db.retreatIntent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: opts?.skip ?? 0,
      take: opts?.take ?? 50,
    }),
    db.retreatIntent.count({ where }),
  ]);

  return { items, total };
};

export const updateRetreatIntentStatus = async (
  id: string,
  status: string,
  adminNotes?: string,
) => {
  return db.retreatIntent.update({
    where: { id },
    data: { status, adminNotes: adminNotes ?? undefined },
  });
};
