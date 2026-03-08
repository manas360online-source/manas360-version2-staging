import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { generateAIResponse } from './aiService';
import {
	detectCrisisSignal,
	getCrisisSupportResponse,
	triggerCrisisEscalation,
} from './crisisEscalation.service';
import { analyzeChatCrisis, persistChatAnalysis } from './chatCrisisDetector';
import { recomputeCompositeRisk } from './compositeRisk';
import { decryptSensitiveText, encryptSensitiveText } from '../utils/chatDataCrypto';

const db = prisma as any;

export type BotType = 'mood_ai' | 'clinical_ai';
export type ResponseStyle = 'concise' | 'detailed';
type UserRole = 'patient' | 'provider' | 'admin';

type ConversationMessage = {
	role: 'user' | 'assistant';
	content: string;
	at: string;
	bot_type: BotType;
	crisis?: boolean;
};

const MOOD_SUPPORT_PROMPT = `You are Dr Meera, an empathetic emotional support assistant for MANAS360, a mental wellness platform.

Your role is to support patients who may feel anxious, stressed, lonely, or overwhelmed.

Rules:
• Be compassionate and supportive.
• Do not give medical diagnoses.
• Encourage healthy coping strategies.
• If the user expresses suicidal thoughts or self-harm intentions, do not attempt therapy — escalate to crisis support.`;

const CLINICAL_ASSISTANT_PROMPT = `You are Dr Meera, an AI assistant for clinicians and administrators using the MANAS360 platform.

Your responsibilities include:
• helping analyze patient data
• explaining platform features
• assisting with clinical workflow

Rules:
• Do not provide medical diagnoses.
• Provide structured and professional responses.
• Help the provider interpret patient insights and platform data.`;

const RESPONSE_STYLE_PROMPTS: Record<ResponseStyle, string> = {
	concise:
		'Response style: concise. Keep answers short and practical: 2-4 brief sentences or up to 4 short bullets. Avoid repeating the user message. Ask at most one focused follow-up question.',
	detailed:
		'Response style: detailed. Provide richer explanation, clear structure, and examples when relevant while remaining focused and safe.',
};

const resolveSystemPrompt = (botType: BotType, responseStyle: ResponseStyle): string =>
	`${botType === 'mood_ai' ? MOOD_SUPPORT_PROMPT : CLINICAL_ASSISTANT_PROMPT}\n\n${RESPONSE_STYLE_PROMPTS[responseStyle]}`;

const resolveAiRole = (role: UserRole): 'patient' | 'provider' | 'admin' => {
	if (role === 'admin') return 'admin';
	if (role === 'provider') return 'provider';
	return 'patient';
};

const resolveUserRole = (role: string): UserRole => {
	const normalized = String(role || '').toLowerCase();
	if (normalized === 'admin' || normalized === 'superadmin') return 'admin';
	if (['therapist', 'psychiatrist', 'coach', 'provider'].includes(normalized)) return 'provider';
	return 'patient';
};

const assertBotPermission = (userRole: UserRole, botType: BotType): void => {
	if (botType === 'mood_ai' && userRole !== 'patient') {
		throw new AppError('Mood Support AI is available only for patients', 403);
	}
	if (botType === 'clinical_ai' && !['provider', 'admin'].includes(userRole)) {
		throw new AppError('Clinical Assistant AI is available only for providers/admins', 403);
	}
};

const getLastMessages = (messages: any, botType: BotType): ConversationMessage[] => {
	if (!Array.isArray(messages)) return [];
	return messages
		.filter((m) => m && m.bot_type === botType)
		.slice(-10)
		.map((m) => ({
			role: m.role === 'assistant' ? 'assistant' : 'user',
			content: decryptSensitiveText(String(m.content || '')),
			at: String(m.at || new Date().toISOString()),
			bot_type: botType,
		}));
};

const getLastChatMessages = async (userId: string, botType: BotType): Promise<ConversationMessage[]> => {
	try {
		const rows = await db.chatMessage.findMany({
			where: { userId, botType },
			orderBy: { timestamp: 'desc' },
			take: 10,
			select: {
				role: true,
				content: true,
				timestamp: true,
				botType: true,
			},
		});

		return rows
			.slice()
			.reverse()
			.map((row: any) => ({
				role: row.role === 'assistant' ? 'assistant' : 'user',
				content: decryptSensitiveText(String(row.content || '')),
				at: new Date(row.timestamp).toISOString(),
				bot_type: row.botType === 'clinical_ai' ? 'clinical_ai' : 'mood_ai',
			}));
	} catch {
		return [];
	}
};

const persistChatMessages = async (userId: string, entries: ConversationMessage[]): Promise<void> => {
	if (!entries.length) return;
	try {
		await db.chatMessage.createMany({
			data: entries.map((entry) => ({
				userId,
				role: entry.role,
				content: encryptSensitiveText(String(entry.content || '')),
				timestamp: new Date(entry.at),
				botType: entry.bot_type,
			})),
		});
	} catch {
		// Do not fail the user flow if per-message persistence isn't available yet.
	}
};

const runAsyncChatCrisisPipeline = (input: { userId: string; botType: BotType; message: string }): void => {
	if (process.env.NODE_ENV === 'test') return;

	setTimeout(() => {
		void (async () => {
			try {
				const analysis = await analyzeChatCrisis(input.message);
				await persistChatAnalysis({
					userId: input.userId,
					botType: input.botType,
					message: input.message,
					analysis,
				});

				if (['HIGH', 'CRITICAL'].includes(String(analysis.urgency_level).toUpperCase())) {
					await recomputeCompositeRisk({ userId: input.userId, source: 'chat_urgency_trigger' });
				}
			} catch (error) {
				console.error('[chat] async_crisis_pipeline_failed', {
					userId: input.userId,
					error: String(error),
				});
			}
		})();
	}, 0);
};

const upsertConversationMessages = async (
	userId: string,
	botType: BotType,
	newEntries: ConversationMessage[],
	markCrisis: boolean,
	tokensUsed: number,
): Promise<any> => {
	void markCrisis;
	void tokensUsed;
	const latest = await db.aIConversation.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
	const previous = Array.isArray(latest?.messages) ? latest.messages : [];
	const previousDecrypted = previous.map((item: any) => ({
		role: item?.role === 'assistant' ? 'assistant' : 'user',
		content: decryptSensitiveText(String(item?.content || '')),
		at: String(item?.at || new Date().toISOString()),
		bot_type: item?.bot_type === 'clinical_ai' ? 'clinical_ai' : 'mood_ai',
		crisis: Boolean(item?.crisis),
	}));
	const updatedMessages = [...previousDecrypted, ...newEntries].map((item) => ({
		...item,
		content: encryptSensitiveText(String(item.content || '')),
	}));

	if (latest) {
		return db.aIConversation.update({
			where: { id: latest.id },
			data: {
				messages: updatedMessages,
			},
		});
	}

	return db.aIConversation.create({
		data: {
			userId,
			messages: updatedMessages,
		},
	});
};

export const processChatMessage = async (input: {
	userId: string;
	message: string;
	botType: BotType;
	responseStyle?: ResponseStyle;
}): Promise<{
	conversation_id: string;
	response: string;
	messages: ConversationMessage[];
	bot_name: string;
	bot_type: BotType;
	crisis_detected: boolean;
	usage: { tokensUsed: number; latencyMs: number; model: string; fallback: boolean };
}> => {
	const user = await db.user.findUnique({ where: { id: input.userId }, select: { id: true, role: true, isDeleted: true } });
	if (!user || user.isDeleted) throw new AppError('User not found', 404);

	const message = String(input.message || '').trim();
	if (!message) throw new AppError('message is required', 422);

	const botType = input.botType;
	const responseStyle: ResponseStyle = input.responseStyle === 'detailed' ? 'detailed' : 'concise';
	const userRole = resolveUserRole(String(user.role || 'patient'));
	assertBotPermission(userRole, botType);

	if (botType === 'mood_ai' && userRole === 'patient') {
		runAsyncChatCrisisPipeline({ userId: input.userId, botType, message });
	}

	const latest = await db.aIConversation.findFirst({ where: { userId: input.userId }, orderBy: { createdAt: 'desc' } });
	const storedContext = await getLastChatMessages(input.userId, botType);
	const fallbackContext = getLastMessages(latest?.messages, botType);
	const contextMessages = storedContext.length > 0 ? storedContext : fallbackContext;

	const crisisDetected = botType === 'mood_ai' && detectCrisisSignal(message);
	if (crisisDetected) {
		await triggerCrisisEscalation(input.userId, botType, message);
		const response = getCrisisSupportResponse();
		const entries: ConversationMessage[] = [
			{ role: 'user', content: message, at: new Date().toISOString(), bot_type: botType, crisis: true },
			{ role: 'assistant', content: response, at: new Date().toISOString(), bot_type: botType, crisis: true },
		];
		await persistChatMessages(input.userId, entries);
		const convo = await upsertConversationMessages(input.userId, botType, entries, true, 0);
		console.info('[chat] crisis_detected', {
			userId: input.userId,
			botType,
		});
		return {
			conversation_id: convo.id,
			response,
			messages: [...contextMessages, ...entries].slice(-10),
			bot_name: 'dr meera',
			bot_type: botType,
			crisis_detected: true,
			usage: { tokensUsed: 0, latencyMs: 0, model: process.env.CLAUDE_MODEL || 'claude-3-haiku', fallback: false },
		};
	}

	const aiInputMessages = [
		{ role: 'system' as const, content: resolveSystemPrompt(botType, responseStyle) },
		...contextMessages.map((m) => ({ role: m.role, content: m.content })),
		{ role: 'user' as const, content: message },
	];

	const aiResult = await generateAIResponse(resolveAiRole(userRole), aiInputMessages, {
		maxTokens: responseStyle === 'detailed' ? Number(process.env.CLAUDE_MAX_TOKENS || 512) : 160,
	});

	// Keep chat UX resilient: when AI budget is exhausted, return a fallback assistant response instead of hard failing with 429.

	const entries: ConversationMessage[] = [
		{ role: 'user', content: message, at: new Date().toISOString(), bot_type: botType },
		{ role: 'assistant', content: aiResult.text, at: new Date().toISOString(), bot_type: botType },
	];

	await persistChatMessages(input.userId, entries);

	const convo = await upsertConversationMessages(
		input.userId,
		botType,
		entries,
		false,
		Number(aiResult.tokensUsed || 0),
	);

	console.info('[chat] ai_usage', {
		userId: input.userId,
		botType,
		latencyMs: aiResult.latencyMs,
		tokensUsed: aiResult.tokensUsed,
		fallback: aiResult.fallback,
		model: aiResult.model,
		error: aiResult.error ? aiResult.error.slice(0, 80) : undefined,
	});

	return {
		conversation_id: convo.id,
		response: aiResult.text,
		messages: [...contextMessages, ...entries].slice(-10),
		bot_name: 'dr meera',
		bot_type: botType,
		crisis_detected: false,
		usage: {
			tokensUsed: aiResult.tokensUsed,
			latencyMs: aiResult.latencyMs,
			model: aiResult.model,
			fallback: aiResult.fallback,
		},
	};
};
