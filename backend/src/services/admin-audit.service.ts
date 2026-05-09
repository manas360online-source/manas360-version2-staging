import { prisma } from '../config/db';

export const recordAdminAuditEvent = async (input: {
  userId: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
}): Promise<void> => {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      resource: input.resource,
      details: (input.details || {}) as any,
    },
  });
};
