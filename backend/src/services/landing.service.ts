import { UserRole } from '@prisma/client';
import { prisma } from '../config/db';

const formatCompact = (value: number): string => {
	if (value === 0) return '0';
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M+`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K+`;
	return `${value}+`;
};

export const getLandingMetrics = async () => {
	const [providers, patients, completedSessions, activeSubscriptions, activeCertifications, aiConversations] =
		await prisma.$transaction([
			prisma.user.count({
				where: {
					role: { in: [UserRole.THERAPIST, UserRole.PSYCHIATRIST, UserRole.COACH] },
					isDeleted: false,
				},
			}),
			prisma.user.count({
				where: {
					role: UserRole.PATIENT,
					isDeleted: false,
				},
			}),
			prisma.therapySession.count({
				where: {
					status: 'COMPLETED',
				},
			}),
			prisma.marketplaceSubscription.count({
				where: {
					status: 'ACTIVE',
				},
			}),
			prisma.certification.count({
				where: {
					isActive: true,
				},
			}),
			prisma.aIConversation.count(),
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
