import { PrismaClient } from '@prisma/client';
import { env } from './env';

const MAX_AUDIT_DETAILS_BYTES = 50_000;

const clampAuditDetails = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;

  try {
    const serialized = JSON.stringify(value);
    if (!serialized || serialized.length <= MAX_AUDIT_DETAILS_BYTES) {
      return value;
    }

    return {
      __truncated: true,
      maxBytes: MAX_AUDIT_DETAILS_BYTES,
      preview: serialized.slice(0, MAX_AUDIT_DETAILS_BYTES),
    };
  } catch {
    return {
      __truncated: true,
      maxBytes: MAX_AUDIT_DETAILS_BYTES,
      preview: '[unserializable-audit-details]',
    };
  }
};

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.databaseUrl,
    },
  },
});

prisma.$use(async (params, next) => {
  if (params.model === 'AuditLog') {
    if (params.action === 'create' || params.action === 'update' || params.action === 'upsert') {
      const payload = params.args?.data;
      if (payload && typeof payload === 'object' && 'details' in payload) {
        (payload as Record<string, unknown>).details = clampAuditDetails((payload as Record<string, unknown>).details);
      }
    }

    if (params.action === 'createMany') {
      const data = params.args?.data;
      if (Array.isArray(data)) {
        params.args.data = data.map((row: Record<string, unknown>) => ({
          ...row,
          ...(Object.prototype.hasOwnProperty.call(row, 'details')
            ? { details: clampAuditDetails(row.details) }
            : {}),
        }));
      } else if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'details')) {
        (data as Record<string, unknown>).details = clampAuditDetails((data as Record<string, unknown>).details);
      }
    }
  }

  return next(params);
});

let isConnected = false;

export const connectDatabase = async (): Promise<void> => {
  if (isConnected) return;

  await prisma.$connect();
  isConnected = true;
};

export const disconnectDatabase = async (): Promise<void> => {
  if (!isConnected) return;

  await prisma.$disconnect();
  isConnected = false;
};

export const getDatabaseStatus = (): { isConnected: boolean } => ({
  isConnected,
});

export default prisma;
