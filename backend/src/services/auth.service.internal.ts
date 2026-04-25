import { randomBytes } from 'crypto';
import { prisma } from '../config/db';
import { hashOpaqueToken } from '../utils/hash';
import { createTokenPair } from '../utils/jwt';

const db = prisma as any;

export const issueSessionTokens = async (userId: string, meta: any) => {
    const createdSession = await db.authSession.create({
        data: {
            userId,
            jti: randomBytes(24).toString('hex'),
            refreshTokenHash: randomBytes(24).toString('hex'),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            ipAddress: meta?.ipAddress ?? null,
            userAgent: meta?.userAgent ?? null,
            device: meta?.device ?? null,
        },
        select: { id: true },
    });

    const tokenPair = createTokenPair(userId, createdSession.id);
    const refreshTokenHash = hashOpaqueToken(tokenPair.refreshToken);

    await db.authSession.update({ where: { id: createdSession.id }, data: { jti: tokenPair.refreshJti, refreshTokenHash } });

    return tokenPair;
};

export default { issueSessionTokens };
