import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import { processChatMessage, type BotType, type ResponseStyle } from '../services/chat.service';

const MAX_CHAT_MESSAGE_CHARS = Number(process.env.MAX_CHAT_MESSAGE_CHARS || 4000);

const authUserId = (req: Request): string => {
	const userId = req.auth?.userId;
	if (!userId) throw new AppError('Authentication required', 401);
	return userId;
};

const parseBotType = (raw: unknown): BotType => {
	const botType = String(raw || '').trim().toLowerCase();
	if (botType !== 'mood_ai' && botType !== 'clinical_ai') {
		throw new AppError('bot_type must be mood_ai or clinical_ai', 422);
	}
	return botType;
};

const parseResponseStyle = (raw: unknown): ResponseStyle => {
	const style = String(raw || '').trim().toLowerCase();
	if (style === 'detailed') return 'detailed';
	return 'concise';
};

export const postChatMessageController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const requestUserId = String(req.body?.user_id || '').trim();
	const role = String(req.auth?.role || '').toLowerCase();
	if (requestUserId && requestUserId !== userId && !['admin', 'superadmin'].includes(role)) {
		throw new AppError('user_id does not match authenticated user', 403);
	}
	const resolvedUserId = requestUserId || userId;
	const message = String(req.body?.message || '').trim();
	if (!message) throw new AppError('message is required', 422);
	if (message.length > MAX_CHAT_MESSAGE_CHARS) {
		throw new AppError(`message exceeds max length (${MAX_CHAT_MESSAGE_CHARS} chars)`, 422);
	}

	const botType = parseBotType(req.body?.bot_type);
	const responseStyle = parseResponseStyle(req.body?.response_style);
	const result = await processChatMessage({ userId: resolvedUserId, message, botType, responseStyle });
	sendSuccess(res, result, 'Chat response generated');
};
