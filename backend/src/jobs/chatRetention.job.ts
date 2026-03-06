import { prisma } from '../config/db';

const db = prisma as any;
const RETENTION_DAYS = Number(process.env.CHAT_RETENTION_DAYS || 365);
const CHAT_RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000;

const shouldRunRetention = (): boolean => Number.isFinite(RETENTION_DAYS) && RETENTION_DAYS > 0;

const runChatRetention = async (): Promise<void> => {
	if (!shouldRunRetention()) return;

	const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

	try {
		const [chatMessagesResult, chatAnalysesResult, conversationsResult] = await Promise.all([
			db.chatMessage.deleteMany({ where: { timestamp: { lt: cutoff } } }),
			db.chatAnalysis.deleteMany({ where: { createdAt: { lt: cutoff } } }),
			db.aIConversation.deleteMany({ where: { updatedAt: { lt: cutoff } } }),
		]);

		console.info('[chat] retention_cleanup_completed', {
			cutoff: cutoff.toISOString(),
			retentionDays: RETENTION_DAYS,
			deletedChatMessages: Number(chatMessagesResult?.count || 0),
			deletedChatAnalyses: Number(chatAnalysesResult?.count || 0),
			deletedConversations: Number(conversationsResult?.count || 0),
		});
	} catch (error) {
		console.error('[chat] retention_cleanup_failed', {
			errorType: (error as any)?.name || 'UnknownError',
		});
	}
};

export const startChatRetentionJob = (): void => {
	if (!shouldRunRetention()) {
		console.info('[chat] retention_cleanup_disabled');
		return;
	}

	void runChatRetention();
	setInterval(() => {
		void runChatRetention();
	}, CHAT_RETENTION_INTERVAL_MS);
};
