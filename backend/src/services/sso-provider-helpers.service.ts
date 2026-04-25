import { AppError } from '../middleware/error.middleware';

type Provider = 'AZURE' | 'GOOGLE' | 'OKTA' | 'SAML';

export const getProviderScopes = (provider: Provider): string => {
    if (provider === 'AZURE') {
        return 'openid profile email offline_access';
    }

    if (provider === 'GOOGLE') {
        return 'openid profile email';
    }

    if (provider === 'OKTA') {
        return 'openid profile email groups';
    }

    return 'openid profile email';
};

export const validateProviderClaims = (input: {
    provider: Provider;
    claims: Record<string, any>;
    allowedDomains?: string[] | null;
}) => {
    const claims = input.claims ?? {};
    const provider = input.provider;
    const allowedDomains = (input.allowedDomains ?? []).map((d) => String(d).toLowerCase());

    if (!claims.sub) {
        throw new AppError('OIDC token subject claim is missing', 401);
    }

    if (provider === 'GOOGLE') {
        const hd = (claims.hd ?? '').toLowerCase();
        const email = String(claims.email ?? '').toLowerCase();
        const emailDomain = email.includes('@') ? email.split('@')[1] : '';
        if (allowedDomains.length > 0 && !allowedDomains.includes(hd) && !allowedDomains.includes(emailDomain)) {
            throw new AppError('Google account is not from an allowed workspace domain', 403);
        }
    }

    if (provider === 'AZURE') {
        const preferredUsername = String(claims.preferred_username ?? claims.email ?? '').toLowerCase();
        const emailDomain = preferredUsername.includes('@') ? preferredUsername.split('@')[1] : '';
        if (allowedDomains.length > 0 && !allowedDomains.includes(emailDomain)) {
            throw new AppError('Azure AD account is not from an allowed tenant domain', 403);
        }
    }

    if (provider === 'OKTA') {
        const email = String(claims.email ?? '').toLowerCase();
        const emailDomain = email.includes('@') ? email.split('@')[1] : '';
        if (allowedDomains.length > 0 && !allowedDomains.includes(emailDomain)) {
            throw new AppError('Okta account is not from an allowed domain', 403);
        }
    }
};

export default {
    getProviderScopes,
    validateProviderClaims,
};
