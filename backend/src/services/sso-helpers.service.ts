import { prisma } from '../config/db';
import type { RequestMeta } from '../types/auth.types';
import { issueSessionTokens } from './auth.service.internal';

const db = prisma as any;

export const loginOrCreateUserFromProfile = async (
    params: { tenant: any; claims: any; tokenSet: any },
    meta: RequestMeta,
) => {
    const claims = params.claims ?? {};
    const email = (claims.email || '').toLowerCase();
    const sub = claims.sub;
    const provider = params.tenant.provider ?? 'OIDC';
    const tenantKey = String(params.tenant.key ?? 'default');

    let user: any = null;
    if (sub) {
        const ids = await db.$queryRawUnsafe(
            `SELECT user_id FROM sso_identities WHERE tenant_key = $1 AND provider = $2 AND provider_subject = $3 LIMIT 1`,
            tenantKey,
            provider,
            sub,
        );

        if (ids?.[0]?.user_id) {
            user = await db.user.findUnique({ where: { id: ids[0].user_id } });
        }
    }

    if (!user && email) {
        user = await db.user.findUnique({ where: { email } });
    }

    if (user && (user as any).isDeleted) throw new Error('User account deleted');

    if (!user) {
        user = await db.user.create({
            data: {
                email: email || null,
                emailVerified: !!claims.email_verified || !!claims.email,
                provider: 'OIDC',
                role: 'PATIENT',
                firstName: claims.given_name ?? '',
                lastName: claims.family_name ?? '',
                name: claims.name ?? null,
            },
        });
    }

    if (sub) {
        await db.$executeRawUnsafe(
            `INSERT INTO sso_identities (user_id, tenant_key, provider, provider_subject, email)
             VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (tenant_key, provider, provider_subject)
             DO UPDATE SET user_id = EXCLUDED.user_id, email = EXCLUDED.email, updated_at = now()`,
            String(user.id),
            tenantKey,
            provider,
            sub,
            email || null,
        );
    }

    const tokenPair = await issueSessionTokens(String(user.id), meta);

    return {
        user: { id: String(user.id), email: user.email },
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
    };
};

export default { loginOrCreateUserFromProfile };
