import type { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { sendSuccess } from '../utils/response';
import * as ssoService from '../services/sso.service';
import { asyncHandler } from '../middleware/validate.middleware';
import { v4 as uuidv4 } from 'uuid';
import { loginOrCreateUserFromProfile } from '../services/sso-helpers.service';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { getProviderScopes, validateProviderClaims } from '../services/sso-provider-helpers.service';
import { prisma } from '../config/db';

const getRequestMeta = (req: any) => ({
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    device: req.get('x-device-id') ?? undefined,
});

const resolveCookieDomain = (): string | undefined => {
    const rawDomain = env.cookieDomain?.trim();
    if (!rawDomain) {
        return undefined;
    }

    const normalized = rawDomain.toLowerCase();
    if (normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1') {
        return undefined;
    }

    return rawDomain;
};

const cookieDomain = resolveCookieDomain();

const authCookieOptions = {
    httpOnly: true,
    secure: env.cookieSecure,
        sameSite: 'lax' as const,
    domain: cookieDomain,
    path: '/',
};

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
    res.cookie('access_token', accessToken, {
        ...authCookieOptions,
        maxAge: 15 * 60 * 1000,
    });

    res.cookie(env.refreshCookieName, refreshToken, {
        ...authCookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie(env.csrfCookieName, randomBytes(24).toString('hex'), {
        httpOnly: false,
        secure: env.cookieSecure,
            sameSite: 'lax',
        domain: cookieDomain,
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};

// Start OIDC authorization
export const authorizeController = async (req: Request, res: Response): Promise<void> => {
    const tenantKey = String(req.params.tenantKey);
    const tenant = await ssoService.getTenantByKey(tenantKey);
    if (!tenant || !tenant.enabled) {
        res.status(404).send('Tenant not found');
        return;
    }

    const state = uuidv4();
    const nonce = uuidv4();

    // store state/nonce in cookie for callback validation
    res.cookie(`sso_state_${tenantKey}`, state, {
        httpOnly: true,
        secure: env.cookieSecure,
        sameSite: 'lax',
        domain: cookieDomain,
        path: '/',
        maxAge: 5 * 60 * 1000,
    });
    res.cookie(`sso_nonce_${tenantKey}`, nonce, {
        httpOnly: true,
        secure: env.cookieSecure,
        sameSite: 'lax',
        domain: cookieDomain,
        path: '/',
        maxAge: 5 * 60 * 1000,
    });

    const { client } = await ssoService.buildOidcClient(tenant as any);

    const redirectUri = `${req.protocol}://${req.get('host')}${env.apiPrefix}/v1/sso/${tenantKey}/callback`;

    const url = client.authorizationUrl({
        scope: getProviderScopes(tenant.provider as any),
        state,
        nonce,
        redirect_uri: redirectUri,
    });

    res.redirect(url);
};

// OIDC callback
export const callbackController = async (req: Request, res: Response): Promise<void> => {
    const tenantKey = String(req.params.tenantKey);
    const tenant = await ssoService.getTenantByKey(tenantKey);
    if (!tenant || !tenant.enabled) {
        res.status(404).send('Tenant not found');
        return;
    }

    const stateCookie = req.cookies?.[`sso_state_${tenantKey}`];
    const nonceCookie = req.cookies?.[`sso_nonce_${tenantKey}`];
    const state = String(req.query.state ?? '');

    if (!state || state !== stateCookie) {
        res.status(400).send('Invalid state');
        return;
    }

    const { client } = await ssoService.buildOidcClient(tenant as any);

    const params = client.callbackParams(req);
    const redirectUri = `${req.protocol}://${req.get('host')}${env.apiPrefix}/v1/sso/${tenantKey}/callback`;
    const tokenSet = await client.callback(redirectUri, params, {
        nonce: nonceCookie,
        state,
    });

    const claims = tokenSet.claims();

    validateProviderClaims({
        provider: tenant.provider as any,
        claims,
        allowedDomains: tenant.allowedDomains ?? null,
    });

    // map OIDC claims to user and issue session tokens
    const meta = getRequestMeta(req);
    const result = await loginOrCreateUserFromProfile({ tenant, claims, tokenSet }, meta as any);

    // set auth cookies consistent with existing login flow
    setAuthCookies(res, result.accessToken, result.refreshToken);

    // redirect to app
    const appUrl = process.env.APP_URL ?? '/';
    res.redirect(`${appUrl}?sso=success`);
};

export const listTenantsController = async (_req: Request, res: Response): Promise<void> => {
    const rows = await ssoService.listTenants();
    sendSuccess(res, rows, 'SSO tenants listed');
};

export const getMyTenantController = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    if (!userId) {
        throw new AppError('Authentication required', 401);
    }

    const db = prisma as any;
    const userRows = await db.$queryRawUnsafe(
        'SELECT company_key FROM users WHERE id = $1 LIMIT 1',
        userId,
    );
    const companyKey = userRows?.[0]?.company_key ?? null;

    let tenant: any = null;
    if (companyKey) {
        const rows = await db.$queryRawUnsafe(
            'SELECT * FROM sso_tenants WHERE owner_company_key = $1 AND enabled = true ORDER BY id DESC LIMIT 1',
            companyKey,
        );
        tenant = rows?.[0] ?? null;
    }

    if (!tenant) {
        const fallbackRows = await db.$queryRawUnsafe(
            'SELECT * FROM sso_tenants WHERE enabled = true ORDER BY id DESC LIMIT 1',
        );
        tenant = fallbackRows?.[0] ?? null;
    }

    if (!tenant) {
        throw new AppError('No SSO tenant configured', 404);
    }

    // Never return raw secret in profile lookup endpoint.
    tenant.client_secret = '';
    sendSuccess(res, tenant, 'SSO tenant fetched');
};

export const createTenantController = async (req: Request, res: Response): Promise<void> => {
    const input = req.body;
    const tenant = await ssoService.createTenant(input);
    sendSuccess(res, tenant, 'SSO tenant created', 201);
};

export const updateTenantController = async (req: Request, res: Response): Promise<void> => {
    const tenantKey = String(req.params.tenantKey);
    const input = req.body;

    // Only allow updating allowed fields for now
    const allowed = ['clientId', 'clientSecret', 'issuer', 'metadataUrl', 'allowedDomains', 'enabled', 'owner_company_key'];
    const setParts: string[] = [];
    const values: any[] = [];
    let idx = 1;
    for (const k of allowed) {
        if (Object.prototype.hasOwnProperty.call(input, k)) {
            setParts.push(`${k === 'clientId' ? 'client_id' : k === 'clientSecret' ? 'client_secret' : k === 'metadataUrl' ? 'metadata_url' : k} = $${idx}`);
            values.push(input[k]);
            idx++;
        }
    }

    if (setParts.length === 0) {
        sendSuccess(res, null, 'No updatable fields provided');
        return;
    }

    values.push(tenantKey);
    const sql = `UPDATE sso_tenants SET ${setParts.join(', ')}, updated_at = now() WHERE key = $${idx} RETURNING *`;
    const rows = await (ssoService as any).prisma.$queryRawUnsafe(sql, ...values);
    sendSuccess(res, rows?.[0] ?? null, 'Tenant updated');
};

export const testTenantController = async (req: Request, res: Response): Promise<void> => {
    const tenantKey = String(req.params.tenantKey);
    const tenant = await ssoService.getTenantByKey(tenantKey);
    if (!tenant) {
        throw new AppError('Tenant not found', 404);
    }

    // Quick metadata fetch to validate issuer/metadata
    try {
        // dynamic require
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Issuer } = require('openid-client');
        await Issuer.discover(tenant.issuer || tenant.metadataUrl);
        sendSuccess(res, { ok: true }, 'Tenant metadata validated');
    } catch (err) {
        sendSuccess(res, { ok: false, error: String(err) }, 'Tenant metadata validation failed');
    }
};

export const createAzureTemplateTenantController = async (req: Request, res: Response): Promise<void> => {
    const tenant = await ssoService.createOrEnsureTenant(
        ssoService.azureTemplate({
            tenantId: req.body.tenantId,
            key: req.body.key,
            name: req.body.name,
            domain: req.body.domain,
        }),
    );
    sendSuccess(res, tenant, 'Azure AD tenant template created', 201);
};

export const createGoogleTemplateTenantController = async (req: Request, res: Response): Promise<void> => {
    const tenant = await ssoService.createOrEnsureTenant(
        ssoService.googleTemplate({
            key: req.body.key,
            name: req.body.name,
            domain: req.body.domain,
        }),
    );
    sendSuccess(res, tenant, 'Google Workspace tenant template created', 201);
};

export const createOktaTemplateTenantController = async (req: Request, res: Response): Promise<void> => {
    const tenant = await ssoService.createOrEnsureTenant(
        ssoService.oktaTemplate({
            issuer: req.body.issuer,
            key: req.body.key,
            name: req.body.name,
            domain: req.body.domain,
        }),
    );
    sendSuccess(res, tenant, 'Okta tenant template created', 201);
};

export const promoteUserController = async (req: Request, res: Response): Promise<void> => {
    const tenantKey = String(req.params.tenantKey);
    const email = String(req.body.email ?? '').toLowerCase();
    if (!email) throw new AppError('email required', 400);

    // find tenant and owner company
    const tenant = await ssoService.getTenantByKey(tenantKey);
    if (!tenant) throw new AppError('Tenant not found', 404);
    const ownerCompanyKey = tenant.owner_company_key;
    if (!ownerCompanyKey) throw new AppError('Tenant has no owner company', 400);

    const db = (ssoService as any).prisma;
    const user = await db.user.findFirst({ where: { email: email, company_key: ownerCompanyKey } });
    if (!user) throw new AppError('User not found in company', 404);

    await db.user.update({
        where: { id: user.id },
        data: {
            company_key: ownerCompanyKey,
            is_company_admin: false,
        },
    });

    sendSuccess(res, { ok: true }, 'User mapped as corporate member for tenant access');
};

export default {
    authorizeController: asyncHandler(authorizeController),
    callbackController: asyncHandler(callbackController),
    listTenantsController: asyncHandler(listTenantsController),
    getMyTenantController: asyncHandler(getMyTenantController),
    createTenantController: asyncHandler(createTenantController),
    updateTenantController: asyncHandler(updateTenantController),
    testTenantController: asyncHandler(testTenantController),
    createAzureTemplateTenantController: asyncHandler(createAzureTemplateTenantController),
    createGoogleTemplateTenantController: asyncHandler(createGoogleTemplateTenantController),
    createOktaTemplateTenantController: asyncHandler(createOktaTemplateTenantController),
    promoteUserController: asyncHandler(promoteUserController),
};
