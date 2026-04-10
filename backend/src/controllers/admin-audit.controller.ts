import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma as db } from '../config/db';

const MAX_EXPORT_ROWS = 10_000;
const MAX_EXPORT_DETAILS_CHARS = 5_000;

const parseDateRange = (fromRaw: string, toRaw: string): { fromDate?: Date; toDate?: Date } => {
  const fromDate = fromRaw ? new Date(fromRaw) : undefined;
  const toDate = toRaw ? new Date(toRaw) : undefined;
  if (toDate && !Number.isNaN(toDate.getTime())) {
    toDate.setHours(23, 59, 59, 999);
  }
  return { fromDate, toDate };
};

const buildAuditWhere = async (input: {
  action: string;
  entityType: string;
  policy: string;
  actorId: string;
  actorSearch: string;
  from: string;
  to: string;
  deniedOnly: boolean;
}): Promise<{ where: any; noActorMatch: boolean }> => {
  const { fromDate, toDate } = parseDateRange(input.from, input.to);

  let actorIds: string[] | undefined;
  if (input.actorSearch) {
    const users = await db.user.findMany({
      where: {
        OR: [
          { email: { contains: input.actorSearch, mode: 'insensitive' } },
          { firstName: { contains: input.actorSearch, mode: 'insensitive' } },
          { lastName: { contains: input.actorSearch, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
      take: 50,
    });
    const matchedActorIds = users.map((row: { id: string }) => String(row.id));
    if (matchedActorIds.length === 0) {
      return { where: {}, noActorMatch: true };
    }
    actorIds = matchedActorIds;
  }

  const where: any = {
    ...(input.action ? { action: { contains: input.action, mode: 'insensitive' } } : {}),
    ...(input.entityType ? { resource: { equals: input.entityType, mode: 'insensitive' } } : {}),
    ...(input.policy ? { details: { path: ['policy'], equals: input.policy } } : {}),
    ...(input.deniedOnly ? { action: 'ACCESS_DENIED' } : {}),
    ...((fromDate || toDate)
      ? {
          createdAt: {
            ...(fromDate && !Number.isNaN(fromDate.getTime()) ? { gte: fromDate } : {}),
            ...(toDate && !Number.isNaN(toDate.getTime()) ? { lte: toDate } : {}),
          },
        }
      : {}),
    ...(input.actorId ? { userId: input.actorId } : {}),
    ...(actorIds ? { userId: { in: actorIds } } : {}),
  };

  return { where, noActorMatch: false };
};

const normalizeAuditRows = (logs: any[]) => logs.map((log: any) => {
  const details = log.details && typeof log.details === 'object' ? log.details : null;
  const status = String(log.action || '') === 'ACCESS_DENIED'
    ? 'DENIED'
    : String((details as any)?.result || 'SUCCESS').toUpperCase();

  return {
    id: String(log.id),
    createdAt: log.createdAt,
    actorId: String(log.userId),
    actor: {
      id: String(log.userId),
      name: `${String(log.user?.firstName || '').trim()} ${String(log.user?.lastName || '').trim()}`.trim() || 'System',
      email: log.user?.email ? String(log.user.email) : null,
    },
    action: String(log.action || ''),
    entityType: String(log.resource || ''),
    entityId: String((details as any)?.entityId || (details as any)?.userId || (details as any)?.paymentId || (details as any)?.invoiceId || ''),
    policy: (details as any)?.policy ? String((details as any).policy) : null,
    policyVersion: Number((details as any)?.policyVersion || 0) || null,
    status,
    details,
  };
});

const csvSafeValue = (value: unknown): string => {
  const raw = String(value ?? '');
  if (/^[=+\-@]/.test(raw)) {
    return `'${raw}`;
  }
  return raw;
};

const csvEscape = (value: unknown): string => `"${csvSafeValue(value).replace(/"/g, '""')}"`;

const clampExportDetails = (details: unknown): unknown => {
  if (details === null || details === undefined) return details;

  try {
    const serialized = JSON.stringify(details);
    if (!serialized || serialized.length <= MAX_EXPORT_DETAILS_CHARS) {
      return details;
    }

    return {
      __truncated: true,
      maxChars: MAX_EXPORT_DETAILS_CHARS,
      preview: serialized.slice(0, MAX_EXPORT_DETAILS_CHARS),
    };
  } catch {
    return {
      __truncated: true,
      maxChars: MAX_EXPORT_DETAILS_CHARS,
      preview: '[unserializable-export-details]',
    };
  }
};

const toExportRows = (rows: ReturnType<typeof normalizeAuditRows>) => rows.map((row) => ({
  ...row,
  details: clampExportDetails(row.details),
}));

/**
 * GET /api/v1/admin/audit
 * Expose chronological audit trail of admin actions.
 */
export const getAuditLogController = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;

    const action = String(req.query.action || '').trim();
    const entityType = String(req.query.entityType || '').trim();
    const policy = String(req.query.policy || '').trim();
    const actorId = String(req.query.actorId || '').trim();
    const actorSearch = String(req.query.actor || '').trim();
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();
    const deniedOnly = String(req.query.deniedOnly || '').trim().toLowerCase() === 'true';

    const { where, noActorMatch } = await buildAuditWhere({
      action,
      entityType,
      policy,
      actorId,
      actorSearch,
      from,
      to,
      deniedOnly,
    });

    if (noActorMatch) {
      res.json({ success: true, data: { data: [], meta: { page, limit, totalItems: 0, totalPages: 1 } } });
      return;
    }

    const [logs, totalItems] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ]);

    const normalized = normalizeAuditRows(logs);

    res.json({
      success: true,
      data: {
        data: normalized,
        meta: {
          page,
          limit,
          totalItems,
          totalPages: Math.max(1, Math.ceil(totalItems / limit)),
        },
      },
    });
  } catch (error: any) {
    res.json({ success: true, data: { data: [], meta: { page: 1, limit: 20, totalItems: 0, totalPages: 1 } }, message: error.message });
  }
};

/**
 * POST /api/v1/admin/audit/export
 * Export filtered audit logs as CSV or JSON.
 */
export const exportAuditLogController = async (req: Request, res: Response) => {
  try {
    const actorUserId = String(req.auth?.userId || '').trim();
    if (!actorUserId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const format = String(req.body?.format || req.query.format || 'csv').trim().toLowerCase();
    const action = String(req.body?.action || req.query.action || '').trim();
    const entityType = String(req.body?.entityType || req.query.entityType || '').trim();
    const policy = String(req.body?.policy || req.query.policy || '').trim();
    const actorId = String(req.body?.actorId || req.query.actorId || '').trim();
    const actorSearch = String(req.body?.actor || req.query.actor || '').trim();
    const from = String(req.body?.from || req.query.from || '').trim();
    const to = String(req.body?.to || req.query.to || '').trim();
    const deniedOnly = String(req.body?.deniedOnly || req.query.deniedOnly || '').trim().toLowerCase() === 'true';
    const limit = Math.min(MAX_EXPORT_ROWS, Math.max(1, Number(req.body?.limit || req.query.limit || 5000)));

    const { where, noActorMatch } = await buildAuditWhere({
      action,
      entityType,
      policy,
      actorId,
      actorSearch,
      from,
      to,
      deniedOnly,
    });

    if (noActorMatch) {
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.status(200).send(JSON.stringify([], null, 2));
        return;
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.status(200).send('"id","createdAt","actorId","actorName","actorEmail","action","entityType","entityId","policy","policyVersion","status","details"\n');
      return;
    }

    const logs = await db.auditLog.findMany({
      where,
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const rows = toExportRows(normalizeAuditRows(logs));
    const rowCount = rows.length;
    const supportsWarning = format === 'json';
    const warning = supportsWarning && rowCount > 5000 ? 'Large export, may impact performance' : null;
    
    const exportData = JSON.stringify(rows);
    const hash = crypto.createHash('sha256').update(exportData).digest('hex');
    
    const exportDetails = {
      format,
      rowCount,
      limit,
      hash,
      filters: {
        action: action || null,
        entityType: entityType || null,
        policy: policy || null,
        actorId: actorId || null,
        actor: actorSearch || null,
        from: from || null,
        to: to || null,
        deniedOnly,
      },
    };
    const stamp = new Date().toISOString().slice(0, 10);

    void db.auditLog.create({
      data: {
        userId: actorUserId,
        action: 'AUDIT_EXPORT',
        resource: 'AuditLog',
        details: exportDetails as any,
      },
    }).catch(() => {
      // Never block export on meta-audit failure.
    });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${stamp}.json"`);
      if (warning) {
        res.setHeader('X-Export-Warning', warning);
        res.setHeader('X-Export-Hash', hash);
      }
      res.status(200).send(exportData);
      return;
    }

    const header = [
      'id',
      'createdAt',
      'actorId',
      'actorName',
      'actorEmail',
      'action',
      'entityType',
      'entityId',
      'policy',
      'policyVersion',
      'status',
      'details',
    ];

    const csv = [
      header.map(csvEscape).join(','),
      ...rows.map((row) => [
        row.id,
        row.createdAt,
        row.actorId,
        row.actor.name,
        row.actor.email || '',
        row.action,
        row.entityType,
        row.entityId,
        row.policy || '',
        row.policyVersion || '',
        row.status,
        JSON.stringify(row.details || {}),
      ].map(csvEscape).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${stamp}.csv"`);
    res.setHeader('X-Export-Hash', hash);
    res.status(200).send(csv);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message || 'Audit export failed' });
  }
};
