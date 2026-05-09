import { prisma } from '../config/db';
import { env } from '../config/env';
import { encryptSecret, decryptSecret } from '../utils/secret';
import type { RequestMeta } from '../types/auth.types';
import { AppError } from '../middleware/error.middleware';

type Provider = 'AZURE' | 'GOOGLE' | 'OKTA' | 'SAML';

export type SsoTenant = {
    id: number;
    key: string;
    name: string;
    provider: Provider;
    issuer?: string | null;
    clientId?: string | null;
    clientSecret?: string | null;
    metadataUrl?: string | null;
    allowedDomains?: string[] | null;
    config?: Record<string, unknown> | null;
    enabled: boolean;
    // Raw SQL rows in this module return snake_case columns.
    client_id?: string | null;
    client_secret?: string | null;
    metadata_url?: string | null;
    allowed_domains?: string[] | null;
    owner_company_key?: string | null;
};

const db = prisma as any;

const isTransientPrismaSocketError = (error: unknown): boolean => {
    const code = String((error as any)?.code || '');
    const message = String((error as any)?.message || '').toLowerCase();
    return code === 'UND_ERR_SOCKET' || message.includes('other side closed');
};

const executeRawWithRetry = async (sql: string, attempts = 2): Promise<void> => {
    let lastError: unknown;
    for (let index = 0; index < attempts; index += 1) {
        try {
            await db.$executeRawUnsafe(sql);
            return;
        } catch (error) {
            lastError = error;
            if (!isTransientPrismaSocketError(error) || index === attempts - 1) {
                throw error;
            }
            await prisma.$disconnect().catch(() => undefined);
            await prisma.$connect();
        }
    }
    throw lastError;
};

export const ensureSsoTables = async (): Promise<void> => {
    await executeRawWithRetry(`
        CREATE TABLE IF NOT EXISTS sso_tenants (
            id serial PRIMARY KEY,
            key text UNIQUE NOT NULL,
            name text NOT NULL,
            provider text NOT NULL,
            issuer text,
            client_id text,
            client_secret text,
            metadata_url text,
            allowed_domains text[],
            config jsonb,
            enabled boolean DEFAULT true,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
        );
    `);

    await executeRawWithRetry(`
        CREATE TABLE IF NOT EXISTS sso_identities (
            id serial PRIMARY KEY,
            user_id text NOT NULL,
            tenant_key text NOT NULL,
            provider text NOT NULL,
            provider_subject text NOT NULL,
            email text,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now(),
            UNIQUE (tenant_key, provider, provider_subject)
        );
    `);

    // Add owner_company_key to sso_tenants if missing
    await executeRawWithRetry(`ALTER TABLE sso_tenants ADD COLUMN IF NOT EXISTS owner_company_key text;`);

    // Ensure user table has company_key and is_company_admin
    await executeRawWithRetry(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS company_key text;`);
    await executeRawWithRetry(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS is_company_admin boolean DEFAULT false;`);
};

export const createTenant = async (input: Partial<SsoTenant>): Promise<SsoTenant> => {
    if (!input.key || !input.name || !input.provider) {
        throw new AppError('key, name and provider required', 400);
    }

    const clientSecretValue = input.clientSecret ? encryptSecret(String(input.clientSecret)) : null;

    const res = await db.$queryRawUnsafe(
        `INSERT INTO sso_tenants (key, name, provider, issuer, client_id, client_secret, metadata_url, allowed_domains, config, enabled)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10) RETURNING *`,
        input.key,
        input.name,
        input.provider,
        input.issuer ?? null,
        input.clientId ?? null,
        clientSecretValue,
        input.metadataUrl ?? null,
        input.allowedDomains ?? null,
        JSON.stringify(input.config ?? null),
        input.enabled ?? true,
    );

    const row = res[0] as SsoTenant;
    try {
        if (row.client_secret) row.client_secret = decryptSecret(row.client_secret as unknown as string) as unknown as any;
    } catch {
        // leave masked if decryption fails
    }

    return row;
};

export const listTenants = async (): Promise<SsoTenant[]> => {
    const rows = await db.$queryRawUnsafe(`SELECT * FROM sso_tenants ORDER BY id DESC`);
    for (const r of rows) {
        try {
            if (r.client_secret) r.client_secret = decryptSecret(r.client_secret as unknown as string);
        } catch {
            // ignore
        }
    }
    return rows as SsoTenant[];
};

export const getTenantByKey = async (key: string): Promise<SsoTenant | null> => {
    const rows = await db.$queryRawUnsafe(`SELECT * FROM sso_tenants WHERE key = $1 LIMIT 1`, key);
    const row = (rows && rows[0]) || null;
    if (row && row.client_secret) {
        try {
            row.client_secret = decryptSecret(row.client_secret as unknown as string);
        } catch {
            // ignore
        }
    }
    return row;
};

// Build an openid-client issuer and client for a tenant dynamically.
export const buildOidcClient = async (tenant: SsoTenant) => {
    if (!tenant || !tenant.issuer) throw new AppError('Tenant issuer missing', 400);

    // dynamic require to avoid type-time import errors if package isn't installed yet
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Issuer } = require('openid-client');
    const issuer = await Issuer.discover(tenant.issuer);

    const client = new issuer.Client({
        client_id: tenant.clientId,
        client_secret: tenant.clientSecret,
    });

    return { issuer, client };
};

export const azureTemplate = (opts?: { tenantId?: string; key?: string; name?: string; domain?: string }) => {
    const tenantId = opts?.tenantId ?? 'common';
    return {
        key: opts?.key ?? `sso-azure-${tenantId}`,
        name: opts?.name ?? `Azure AD (${tenantId})`,
        provider: 'AZURE' as const,
        issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
        allowedDomains: opts?.domain ? [opts.domain] : null,
        enabled: true,
    } as Partial<SsoTenant>;
};

export const googleTemplate = (opts?: { key?: string; name?: string; domain?: string }) => {
    return {
        key: opts?.key ?? 'sso-google',
        name: opts?.name ?? 'Google Workspace',
        provider: 'GOOGLE' as const,
        issuer: 'https://accounts.google.com',
        allowedDomains: opts?.domain ? [opts.domain] : null,
        enabled: true,
    } as Partial<SsoTenant>;
};

export const oktaTemplate = (opts?: { issuer?: string; key?: string; name?: string; domain?: string }) => {
    return {
        key: opts?.key ?? 'sso-okta',
        name: opts?.name ?? 'Okta',
        provider: 'OKTA' as const,
        issuer: opts?.issuer ?? null,
        allowedDomains: opts?.domain ? [opts.domain] : null,
        enabled: true,
    } as Partial<SsoTenant>;
};

export const createOrEnsureTenant = async (input: Partial<SsoTenant>) => {
    const existing = await getTenantByKey(String(input.key));
    if (existing) return existing;
    return createTenant(input);
};

export default {
    ensureSsoTables,
    createTenant,
    listTenants,
    getTenantByKey,
    buildOidcClient,
    azureTemplate,
    googleTemplate,
    oktaTemplate,
    createOrEnsureTenant,
};
