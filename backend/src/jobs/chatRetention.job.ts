import { prisma } from '../config/db';

const db = prisma as any;
const RETENTION_DAYS = Number(process.env.CHAT_RETENTION_DAYS || 365);
const CHAT_RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000;

const isTransientPrismaSocketError = (error: unknown): boolean => {
	const code = String((error as any)?.code || '');
	const message = String((error as any)?.message || '').toLowerCase();
	return code === 'UND_ERR_SOCKET' || message.includes('other side closed');
};

const runCleanupQuery = async (cutoff: Date) => {
	return Promise.all([
		db.chatMessage.deleteMany({ where: { timestamp: { lt: cutoff } } }),
		db.chatAnalysis.deleteMany({ where: { createdAt: { lt: cutoff } } }),
		db.aIConversation.deleteMany({ where: { updatedAt: { lt: cutoff } } }),
	]);
};

const shouldRunRetention = (): boolean => Number.isFinite(RETENTION_DAYS) && RETENTION_DAYS > 0;

const runChatRetention = async (): Promise<void> => {
	if (!shouldRunRetention()) return;

	const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

	try {
		let chatMessagesResult: any;
		let chatAnalysesResult: any;
		let conversationsResult: any;
		try {
			[chatMessagesResult, chatAnalysesResult, conversationsResult] = await runCleanupQuery(cutoff);
		} catch (error) {
			if (!isTransientPrismaSocketError(error)) throw error;
			await prisma.$disconnect().catch(() => undefined);
			await prisma.$connect();
			[chatMessagesResult, chatAnalysesResult, conversationsResult] = await runCleanupQuery(cutoff);
		}

		console.info('[chat] retention_cleanup_completed', {
			cutoff: cutoff.toISOString(),
			retentionDays: RETENTION_DAYS,
			deletedChatMessages: Number(chatMessagesResult?.count || 0),
			deletedChatAnalyses: Number(chatAnalysesResult?.count || 0),
			deletedConversations: Number(conversationsResult?.count || 0),
		});
	} catch (error) {
		if (isTransientPrismaSocketError(error)) {
			console.warn('[chat] retention_cleanup_transient_db_socket_closed');
			return;
		}
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
