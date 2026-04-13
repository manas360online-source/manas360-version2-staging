import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';

type DbClient = typeof prisma;

type AgreementRow = {
  id: number;
  agreement_number: string;
  signature_status: string;
  status: string;
};

const getAgreementOrThrow = async (agreementId: number, db: DbClient): Promise<AgreementRow> => {
  const agreement = await (db as any).institutionalAgreement.findUnique({
    where: { id: Number(agreementId) },
    select: {
      id: true,
      agreement_number: true,
      signature_status: true,
      status: true,
    },
  }) as AgreementRow | null;

  if (!agreement) {
    throw new AppError('Agreement not found', 404);
  }

  return agreement;
};

const createSignatureLog = async (
  agreementId: number,
  eventType: string,
  eventData: Record<string, unknown> | null,
  db: DbClient,
): Promise<void> => {
  await (db as any).agreementSignatureLog.create({
    data: {
      agreement_id: Number(agreementId),
      event_type: eventType,
      actor_type: 'system',
      actor_name: 'mock-esign',
      event_data: eventData,
    },
  });
};

export const sendForSignature = async (agreementId: number, db: DbClient = prisma) => {
  const agreement = await getAgreementOrThrow(agreementId, db);
  const currentSignature = String(agreement.signature_status || '').toLowerCase();

  if (currentSignature === 'signed') {
    return agreement;
  }

  const updated = await (db as any).institutionalAgreement.update({
    where: { id: agreement.id },
    data: {
      signature_status: 'sent',
      status: agreement.status === 'draft' ? 'pending_signature' : agreement.status,
    },
  });

  await createSignatureLog(agreement.id, 'sent_for_signature', {
    previous_signature_status: agreement.signature_status,
    new_signature_status: 'sent',
  }, db);

  return updated;
};

export const checkStatus = async (agreementId: number, db: DbClient = prisma) => {
  const agreement = await getAgreementOrThrow(agreementId, db);
  const currentSignature = String(agreement.signature_status || '').toLowerCase();

  // Mock e-sign progression: sent -> signed on status check.
  if (currentSignature === 'sent') {
    const updated = await (db as any).institutionalAgreement.update({
      where: { id: agreement.id },
      data: {
        signature_status: 'signed',
        status: 'active',
      },
    });

    await createSignatureLog(agreement.id, 'status_checked_signed', {
      previous_signature_status: agreement.signature_status,
      new_signature_status: 'signed',
    }, db);

    return updated;
  }

  await createSignatureLog(agreement.id, 'status_checked', {
    signature_status: agreement.signature_status,
    status: agreement.status,
  }, db);

  return agreement;
};

export const sendReminder = async (agreementId: number, db: DbClient = prisma) => {
  const agreement = await getAgreementOrThrow(agreementId, db);
  const currentSignature = String(agreement.signature_status || '').toLowerCase();

  if (currentSignature === 'draft') {
    throw new AppError('Agreement must be sent before sending reminder', 409);
  }

  if (currentSignature === 'signed') {
    return agreement;
  }

  const updated = await (db as any).institutionalAgreement.update({
    where: { id: agreement.id },
    data: {
      signature_status: 'sent',
      status: agreement.status === 'draft' ? 'pending_signature' : agreement.status,
    },
  });

  await createSignatureLog(agreement.id, 'reminder_sent', {
    signature_status: updated.signature_status,
  }, db);

  return updated;
};
