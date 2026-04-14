import { UserRole } from '@prisma/client';
import { prisma } from '../config/db';

const formatCompact = (value: number): string => {
	if (value === 0) return '0';
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M+`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K+`;
	return `${value}+`;
};

export const getLandingMetrics = async () => {
	const db = prisma as any;

	const safeCount = async (modelName: string, args?: any): Promise<number> => {
		try {
			const model = db?.[modelName];
			if (!model || typeof model.count !== 'function') return 0;
			const value = await model.count(args || {});
			return Number(value || 0);
		} catch {
			return 0;
		}
	};

	const [providers, patients, completedSessions, activeSubscriptions, activeCertifications, aiConversations] = await Promise.all([
		safeCount('user', {
			where: {
				role: { in: [UserRole.THERAPIST, UserRole.PSYCHIATRIST, UserRole.COACH] },
				isDeleted: false,
			},
		}),
		safeCount('user', {
			where: {
				role: UserRole.PATIENT,
				isDeleted: false,
			},
		}),
		safeCount('therapySession', {
			where: {
				status: 'COMPLETED',
			},
		}),
		safeCount('marketplaceSubscription', {
			where: {
				status: 'ACTIVE',
			},
		}),
		safeCount('certification', {
			where: {
				isActive: true,
			},
		}),
		safeCount('aIConversation'),
	]);

	const metrics = [
		{ key: 'providers', label: 'Verified Providers', value: providers },
		{ key: 'patients', label: 'Active Patients', value: patients },
		{ key: 'sessions', label: 'Completed Sessions', value: completedSessions },
		{ key: 'subscriptions', label: 'Active Subscriptions', value: activeSubscriptions },
		{ key: 'certifications', label: 'Live Certifications', value: activeCertifications },
		{ key: 'aiConversations', label: 'AI Support Conversations', value: aiConversations },
	].map((item) => ({
		...item,
		displayValue: formatCompact(item.value),
	}));

	return {
		metrics,
		updatedAt: new Date().toISOString(),
	};
};
