import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import { getPlatformConfig, listPlatformConfigs, rollbackPlatformConfig, upsertPlatformConfig } from '../services/platform-config.service';
import { recordAdminAuditEvent } from '../services/admin-audit.service';

type RequestWithAuth = Request & { auth?: { userId?: string } };

const parseKeys = (value: unknown): string[] => {
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);
};

export const listPlatformConfigsController = async (req: Request, res: Response): Promise<void> => {
  const keys = parseKeys(req.query.keys);
  const configs = await listPlatformConfigs(keys.length ? keys : undefined);
  sendSuccess(res, configs, 'Platform config list');
};

export const getPlatformConfigController = async (req: Request, res: Response): Promise<void> => {
  const key = String(req.params.key || '').trim();
  if (!key) throw new AppError('Config key is required', 400);

  const config = await getPlatformConfig(key);
  sendSuccess(res, config, 'Platform config fetched');
};

export const upsertPlatformConfigController = async (req: Request, res: Response): Promise<void> => {
  const key = String(req.params.key || '').trim();
  if (!key) throw new AppError('Config key is required', 400);

  const value = req.body?.value;
  if (value === undefined) throw new AppError('Config value is required', 400);

  const expectedVersion = req.body?.expectedVersion;
  const userId = (req as RequestWithAuth).auth?.userId;

  const { config, previous } = await upsertPlatformConfig({
    key,
    value,
    updatedById: userId ?? null,
    expectedVersion: typeof expectedVersion === 'number' ? expectedVersion : undefined,
  });

  if (userId) {
    await recordAdminAuditEvent({
      userId,
      action: previous ? 'CONFIG_UPDATED' : 'CONFIG_CREATED',
      resource: 'PlatformConfig',
      details: {
        key,
        previousVersion: previous?.version ?? 0,
        nextVersion: config.version,
        expectedVersion: typeof expectedVersion === 'number' ? expectedVersion : undefined,
        previousValue: previous?.value ?? null,
        nextValue: config.value,
      },
    });
  }

  sendSuccess(res, config, previous ? 'Platform config updated' : 'Platform config created');
};

export const rollbackPlatformConfigController = async (req: Request, res: Response): Promise<void> => {
  const key = String(req.params.key || '').trim();
  if (!key) throw new AppError('Config key is required', 400);

  const targetVersion = Number(req.body?.targetVersion);
  if (!Number.isInteger(targetVersion) || targetVersion < 1) {
    throw new AppError('targetVersion must be a positive integer', 400);
  }

  const expectedVersionRaw = req.body?.expectedVersion;
  const expectedVersion = Number.isInteger(Number(expectedVersionRaw)) ? Number(expectedVersionRaw) : undefined;
  const userId = (req as RequestWithAuth).auth?.userId;

  const { config, previous } = await rollbackPlatformConfig({
    key,
    targetVersion,
    updatedById: userId ?? null,
    expectedVersion,
  });

  if (userId) {
    await recordAdminAuditEvent({
      userId,
      action: 'CONFIG_ROLLED_BACK',
      resource: 'PlatformConfig',
      details: {
        key,
        fromVersion: previous.version,
        toVersion: config.version,
        targetVersion,
        previousValue: previous.value,
        nextValue: config.value,
      },
    });
  }

  sendSuccess(res, config, 'Platform config rolled back');
};
