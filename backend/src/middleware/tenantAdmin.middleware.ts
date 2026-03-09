import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/db';
import { AppError } from './error.middleware';

const db = prisma as any;

export const requireTenantAdmin = (tenantKeyParam = 'tenantKey') => {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.auth?.userId;
            if (!userId) {
                next(new AppError('Authentication required', 401));
                return;
            }

            const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, company_key: true, role: true } });
            if (!user) {
                next(new AppError('User not found', 404));
                return;
            }

            // Platform admins bypass tenant checks
            if (String(user.role).toLowerCase() === 'superadmin' || String(user.role).toLowerCase() === 'admin') {
                next();
                return;
            }

            const tenantKey = String(req.params?.[tenantKeyParam] ?? req.body?.tenantKey ?? '');
            if (!tenantKey) {
                next(new AppError('Tenant key missing', 400));
                return;
            }

            const tenant = await db.$queryRawUnsafe(`SELECT owner_company_key FROM sso_tenants WHERE key = $1 LIMIT 1`, tenantKey);
            const ownerCompanyKey = tenant?.[0]?.owner_company_key ?? null;

            if (!ownerCompanyKey) {
                next(new AppError('Tenant has no owner company configured', 403));
                return;
            }

            if (!user.company_key || user.company_key !== ownerCompanyKey) {
                next(new AppError('Corporate member access for this tenant is required', 403));
                return;
            }

            next();
        } catch (err) {
            console.error('Tenant admin middleware error', err);
            next(new AppError('Authorization failed', 500));
        }
    };
};

export default { requireTenantAdmin };
