import { prisma } from '../config/db';

type SupportedRole = 'patient' | 'provider' | 'admin';

type ChatMessage = {
	role: 'system' | 'user' | 'assistant';
	content: string;
};

type GenerateAiResponseInput = {
	role: SupportedRole;
	messages: ChatMessage[];
	maxTokens?: number;
};

type GenerateAiResponseOptions = {
	maxTokens?: number;
};

type GenerateAiResponseResult = {
	text: string;
	tokensUsed: number;
	latencyMs: number;
	model: string;
	fallback: boolean;
	error?: string;
};

export type SessionTranscriptSegment = {
	startSeconds: number;
	endSeconds: number;
	text: string;
};

export type SessionTranscriptResult = {
	transcript: string;
	transcriptWithTimestamps: string;
	segments: SessionTranscriptSegment[];
	language: string | null;
	durationSeconds: number | null;
	cleanedWithClaude: boolean;
};

export type ClinicalSummaryResult = {
	moodAnalysis: {
		emotionalTone: string;
		energyLevel: string;
		riskSignals: string;
	};
	soapNote: {
		subjective: string;
		objective: string;
		assessment: string;
		plan: string;
	};
};

type ClaudeConversationMessage = {
	role: 'user' | 'assistant';
	content: string;
};

const DEFAULT_MODEL = process.env.CLAUDE_MODEL || 'claude-3-haiku';
const DEFAULT_MAX_TOKENS = Number(process.env.CLAUDE_MAX_TOKENS || 512);
const DEFAULT_TIMEOUT_MS = Number(process.env.CLAUDE_TIMEOUT_MS || 12000);
const DAILY_TOKEN_BUDGET = Number(process.env.CLAUDE_DAILY_TOKEN_BUDGET || 0);
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const OPENAI_TRANSCRIPTION_API_URL = 'https://api.openai.com/v1/audio/transcriptions';
const MAX_CONTEXT_MESSAGES = 10;
const MAX_ALLOWED_TOKENS = 1024;
const TRANSCRIPTION_TIMEOUT_MS = Number(process.env.OPENAI_TRANSCRIPTION_TIMEOUT_MS || 120000);
const ENABLE_CLAUDE_TRANSCRIPT_CLEANUP = String(process.env.ENABLE_CLAUDE_TRANSCRIPT_CLEANUP || 'true').toLowerCase() !== 'false';

const db = prisma as any;

const fallbackMessage =
	"I'm here to help, but I'm having trouble responding right now. Please try again shortly.";

const budgetFallbackMessage =
	"I'm currently at daily capacity. Please try again tomorrow or contact support for priority access.";

type TokenBudgetReservation = {
	dayKey: string;
	reservedTokens: number;
};

const getDayKey = (): string => {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const getBudgetForToday = (): number => {
	if (process.env.NODE_ENV === 'development') return 0;
	if (!Number.isFinite(DAILY_TOKEN_BUDGET) || DAILY_TOKEN_BUDGET <= 0) return 0;
	return Math.floor(DAILY_TOKEN_BUDGET);
};

const estimateInputTokens = (messages: ClaudeConversationMessage[], systemPrompt: string): number => {
	const text = `${systemPrompt} ${messages.map((m) => m.content).join(' ')}`;
	return Math.max(1, Math.ceil(text.length / 4));
};

const reserveTokensForRequest = async (
	messages: ClaudeConversationMessage[],
	systemPrompt: string,
): Promise<TokenBudgetReservation | 'DAILY_TOKEN_BUDGET_EXCEEDED' | null> => {
	const budget = getBudgetForToday();
	if (budget === 0) return null;

	const estimatedInput = estimateInputTokens(messages, systemPrompt);
	const reservedTokens = estimatedInput + 64;
	const dayKey = getDayKey();

	try {
		await db.$executeRaw`
			INSERT INTO ai_daily_token_usage (day_key, tokens_used, created_at, updated_at)
			VALUES (${dayKey}, 0, NOW(), NOW())
			ON CONFLICT (day_key) DO NOTHING
		`;

		const updatedRows = await db.$executeRaw`
			UPDATE ai_daily_token_usage
			SET tokens_used = tokens_used + ${reservedTokens}, updated_at = NOW()
			WHERE day_key = ${dayKey}
			  AND tokens_used + ${reservedTokens} <= ${budget}
		`;

		if (Number(updatedRows || 0) === 0) {
			return 'DAILY_TOKEN_BUDGET_EXCEEDED';
		}

		return {
			dayKey,
			reservedTokens,
		};
	} catch (error) {
		console.error('[chat] budget_reserve_failed', {
			dayKey,
			errorType: (error as any)?.name || 'UnknownError',
		});
		// Fail-open on budget persistence failures to preserve chat availability.
		return null;
	}
};

const finalizeReservedTokens = async (
	reservation: TokenBudgetReservation | null,
	actualTokensUsed: number,
): Promise<void> => {
	if (!reservation) return;

	const actualTokens = Number.isFinite(actualTokensUsed) && actualTokensUsed > 0
		? Math.floor(actualTokensUsed)
		: 0;
	const delta = actualTokens - reservation.reservedTokens;
	if (delta === 0) return;

	try {
		if (delta > 0) {
			await db.$executeRaw`
				UPDATE ai_daily_token_usage
				SET tokens_used = tokens_used + ${delta}, updated_at = NOW()
				WHERE day_key = ${reservation.dayKey}
			`;
			return;
		}

		const rollbackTokens = Math.abs(delta);
		await db.$executeRaw`
			UPDATE ai_daily_token_usage
			SET tokens_used = GREATEST(tokens_used - ${rollbackTokens}, 0), updated_at = NOW()
			WHERE day_key = ${reservation.dayKey}
		`;
	} catch (error) {
		console.error('[chat] budget_finalize_failed', {
			dayKey: reservation.dayKey,
			errorType: (error as any)?.name || 'UnknownError',
		});
	}
};

const releaseReservedTokens = async (reservation: TokenBudgetReservation | null): Promise<void> => {
	await finalizeReservedTokens(reservation, 0);
};

const formatTimestamp = (secondsValue: number): string => {
	const totalSeconds = Math.max(0, Math.floor(Number(secondsValue) || 0));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	const hh = String(hours).padStart(2, '0');
	const mm = String(minutes).padStart(2, '0');
	const ss = String(seconds).padStart(2, '0');

	return `${hh}:${mm}:${ss}`;
};

const buildTimestampedTranscript = (segments: SessionTranscriptSegment[], fallbackText: string): string => {
	if (!segments.length) return fallbackText;

	return segments
		.map((segment) => {
			const text = String(segment.text || '').trim();
			if (!text) return null;
			return `[${formatTimestamp(segment.startSeconds)} - ${formatTimestamp(segment.endSeconds)}] ${text}`;
		})
		.filter((line): line is string => Boolean(line))
		.join('\n');
};

const cleanTranscriptWithClaude = async (rawTranscriptWithTimestamps: string): Promise<string> => {
	const hasClaude = String(process.env.CLAUDE_API_KEY || '').trim().length > 0;
	if (!hasClaude || !ENABLE_CLAUDE_TRANSCRIPT_CLEANUP) return rawTranscriptWithTimestamps;

	const response = await generateAIResponse({
		role: 'provider',
		maxTokens: 1024,
		messages: [
			{
				role: 'system',
				content:
					'You are a clinical transcript editor. Clean grammar and punctuation only. Preserve meaning exactly. Keep every timestamp line and do not invent content.',
			},
			{
				role: 'user',
				content: `Clean this session transcript while preserving all timestamps and line boundaries:\n\n${rawTranscriptWithTimestamps}`,
			},
		],
	});

	if (response.fallback) return rawTranscriptWithTimestamps;
	const cleaned = String(response.text || '').trim();
	return cleaned.length > 0 ? cleaned : rawTranscriptWithTimestamps;
};

const extractJsonObject = (value: string): string => {
	const text = String(value || '').trim();
	if (!text) throw new Error('Empty AI response for clinical summary');

	const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
	const candidate = fencedMatch ? fencedMatch[1].trim() : text;

	const firstBrace = candidate.indexOf('{');
	const lastBrace = candidate.lastIndexOf('}');
	if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
		throw new Error('Clinical summary response is not valid JSON');
	}

	return candidate.slice(firstBrace, lastBrace + 1);
};

export const generateClinicalSummary = async (transcript: string): Promise<ClinicalSummaryResult> => {
	const inputTranscript = String(transcript || '').trim();
	if (!inputTranscript) {
		throw new Error('Transcript is required to generate clinical summary');
	}

	const systemPrompt =
		"You are a professional clinical scribe. Analyze the provided therapy transcript. Perform two tasks:\n1. Mood Analysis: Identify the patient's emotional tone, energy level, and any risk signals (anxiety, distress).\n2. SOAP Note: Draft a structured note including Subjective (patient's reported feelings), Objective (observed patterns), Assessment (clinical impression), and Plan (next steps mentioned).\nFormat the output as a JSON object so I can save it directly into the Session Notes fields.";

	const result = await generateAIResponse({
		role: 'provider',
		maxTokens: 1200,
		messages: [
			{ role: 'system', content: systemPrompt },
			{
				role: 'user',
				content:
					`Return only JSON with this exact shape: {\n  \"moodAnalysis\": { \"emotionalTone\": \"\", \"energyLevel\": \"\", \"riskSignals\": \"\" },\n  \"soapNote\": { \"subjective\": \"\", \"objective\": \"\", \"assessment\": \"\", \"plan\": \"\" }\n}\n\nTranscript:\n${inputTranscript}`,
			},
		],
	});

	if (result.fallback) {
		throw new Error(result.error || 'Failed to generate clinical summary');
	}

	const jsonText = extractJsonObject(result.text || '');
	const parsed = JSON.parse(jsonText) as Partial<ClinicalSummaryResult>;

	return {
		moodAnalysis: {
			emotionalTone: String(parsed.moodAnalysis?.emotionalTone || '').trim(),
			energyLevel: String(parsed.moodAnalysis?.energyLevel || '').trim(),
			riskSignals: String(parsed.moodAnalysis?.riskSignals || '').trim(),
		},
		soapNote: {
			subjective: String(parsed.soapNote?.subjective || '').trim(),
			objective: String(parsed.soapNote?.objective || '').trim(),
			assessment: String(parsed.soapNote?.assessment || '').trim(),
			plan: String(parsed.soapNote?.plan || '').trim(),
		},
	};
};

export const transcribeSession = async (
	audioFile: Buffer,
	fileName = 'session-recording.webm',
	mimeType = 'audio/webm',
): Promise<SessionTranscriptResult> => {
	const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
	if (!apiKey) {
		throw new Error('OPENAI_API_KEY not configured');
	}

	if (!audioFile || audioFile.length === 0) {
		throw new Error('Audio file is required for transcription');
	}

	const formData = new FormData();
	formData.append('model', 'whisper-1');
	formData.append('response_format', 'verbose_json');
	formData.append('timestamp_granularities[]', 'segment');
	const audioBytes = new Uint8Array(audioFile);
	formData.append('file', new Blob([audioBytes], { type: mimeType }), fileName);

	const timeoutMs = Number.isFinite(TRANSCRIPTION_TIMEOUT_MS)
		? Math.max(10000, Math.min(TRANSCRIPTION_TIMEOUT_MS, 300000))
		: 120000;
	const abortController = new AbortController();
	const timeout = setTimeout(() => abortController.abort(), timeoutMs);

	try {
		const response = await fetch(OPENAI_TRANSCRIPTION_API_URL, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
			body: formData,
			signal: abortController.signal,
		});

		if (!response.ok) {
			const bodyText = await response.text();
			throw new Error(`Whisper API error ${response.status}: ${bodyText.slice(0, 300)}`);
		}

		const body = (await response.json()) as {
			text?: string;
			language?: string;
			duration?: number;
			segments?: Array<{ start?: number; end?: number; text?: string }>;
		};

		const segments: SessionTranscriptSegment[] = Array.isArray(body.segments)
			? body.segments
					.map((segment) => ({
						startSeconds: Number(segment?.start || 0),
						endSeconds: Number(segment?.end || 0),
						text: String(segment?.text || '').trim(),
					}))
					.filter((segment) => segment.text.length > 0)
			: [];

		const transcript = String(body.text || '').trim();
		const transcriptWithTimestamps = buildTimestampedTranscript(segments, transcript);
		const cleanedTranscript = await cleanTranscriptWithClaude(transcriptWithTimestamps);

		return {
			transcript,
			transcriptWithTimestamps: cleanedTranscript,
			segments,
			language: body.language ? String(body.language) : null,
			durationSeconds: Number.isFinite(Number(body.duration)) ? Number(body.duration) : null,
			cleanedWithClaude: cleanedTranscript !== transcriptWithTimestamps,
		};
	} finally {
		clearTimeout(timeout);
	}
};

export const generateAIResponse = async (
	inputOrRole: GenerateAiResponseInput | SupportedRole,
	messagesArg?: ChatMessage[],
	options?: GenerateAiResponseOptions,
): Promise<GenerateAiResponseResult> => {
	const input: GenerateAiResponseInput =
		typeof inputOrRole === 'string'
			? {
					role: inputOrRole,
					messages: Array.isArray(messagesArg) ? messagesArg : [],
					maxTokens: options?.maxTokens,
			  }
			: inputOrRole;

	const startedAt = Date.now();
	const apiKey = process.env.CLAUDE_API_KEY;
	const model = DEFAULT_MODEL;

	const sanitizedMessages = input.messages
		.filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
		.map((m) => ({ role: m.role, content: m.content.trim() }));

	if (!apiKey) {
		return {
			text: fallbackMessage,
			tokensUsed: 0,
			latencyMs: Date.now() - startedAt,
			model,
			fallback: true,
			error: 'CLAUDE_API_KEY not configured',
		};
	}

	const systemPrompt =
		sanitizedMessages.find((m) => m.role === 'system')?.content ||
		'You are an assistant for MANAS360. Keep responses safe and concise.';

	const conversation: ClaudeConversationMessage[] = sanitizedMessages
		.filter((m) => m.role !== 'system')
		.map((m) => ({
			role: m.role === 'assistant' ? 'assistant' : 'user',
			content: m.content,
		}));

	const cappedConversation = conversation.slice(-MAX_CONTEXT_MESSAGES);
	const requestedMaxTokens = Number(input.maxTokens || DEFAULT_MAX_TOKENS);
	const maxTokens = Number.isFinite(requestedMaxTokens)
		? Math.min(Math.max(requestedMaxTokens, 64), MAX_ALLOWED_TOKENS)
		: DEFAULT_MAX_TOKENS;

	const timeoutMs = Number.isFinite(DEFAULT_TIMEOUT_MS)
		? Math.min(Math.max(DEFAULT_TIMEOUT_MS, 3000), 30000)
		: 12000;

	const budgetReservation = await reserveTokensForRequest(cappedConversation, systemPrompt);
	if (budgetReservation === 'DAILY_TOKEN_BUDGET_EXCEEDED') {
		return {
			text: budgetFallbackMessage,
			tokensUsed: 0,
			latencyMs: Date.now() - startedAt,
			model,
			fallback: true,
			error: budgetReservation,
		};
	}

	const callClaude = async (messages: ClaudeConversationMessage[]) => {
		const abortController = new AbortController();
		const timeout = setTimeout(() => abortController.abort(), timeoutMs);
		try {
			const response = await fetch(ANTHROPIC_API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': apiKey,
					'anthropic-version': '2023-06-01',
				},
				body: JSON.stringify({
					model,
					max_tokens: maxTokens,
					system: systemPrompt,
					messages,
					temperature: input.role === 'patient' ? 0.5 : 0.3,
				}),
				signal: abortController.signal,
			});
			return response;
		} finally {
			clearTimeout(timeout);
		}
	};

	try {
		let response = await callClaude(cappedConversation);

		// Retry once with shorter context when the upstream call times out.
		if (!response.ok && response.status >= 500) {
			const shortConversation = cappedConversation.slice(-4);
			response = await callClaude(shortConversation);
		}

		if (!response.ok) {
			await releaseReservedTokens(budgetReservation);
			const requestId = response.headers.get('request-id') || response.headers.get('x-request-id') || undefined;
			console.warn('[chat] ai_upstream_error', {
				model,
				status: response.status,
				requestId,
			});
			return {
				text: fallbackMessage,
				tokensUsed: 0,
				latencyMs: Date.now() - startedAt,
				model,
				fallback: true,
				error: `Claude API error ${response.status}`,
			};
		}

		const body = (await response.json()) as any;
		const text = Array.isArray(body?.content)
			? body.content
					.map((part: any) => (part?.type === 'text' ? String(part?.text || '') : ''))
					.join('')
					.trim()
			: '';

		const usage = body?.usage || {};
		const tokensUsed = Number(usage?.input_tokens || 0) + Number(usage?.output_tokens || 0);
		await finalizeReservedTokens(budgetReservation, tokensUsed);

		return {
			text: text || fallbackMessage,
			tokensUsed,
			latencyMs: Date.now() - startedAt,
			model,
			fallback: text.length === 0,
		};
	} catch (error) {
		if ((error as any)?.name === 'AbortError') {
			try {
				const shortConversation = cappedConversation.slice(-4);
				const retryResponse = await callClaude(shortConversation);
				if (retryResponse.ok) {
					const body = (await retryResponse.json()) as any;
					const text = Array.isArray(body?.content)
						? body.content
								.map((part: any) => (part?.type === 'text' ? String(part?.text || '') : ''))
								.join('')
								.trim()
						: '';

					const usage = body?.usage || {};
					const tokensUsed = Number(usage?.input_tokens || 0) + Number(usage?.output_tokens || 0);
					await finalizeReservedTokens(budgetReservation, tokensUsed);

					return {
						text: text || fallbackMessage,
						tokensUsed,
						latencyMs: Date.now() - startedAt,
						model,
						fallback: text.length === 0,
					};
				}
			} catch {
				// Fall back to generic error handling below.
			}
		}

		await releaseReservedTokens(budgetReservation);

		console.error('[chat] ai_call_failed', {
			model,
			latencyMs: Date.now() - startedAt,
			errorType: (error as any)?.name || 'UnknownError',
		});
		return {
			text: fallbackMessage,
			tokensUsed: 0,
			latencyMs: Date.now() - startedAt,
			model,
			fallback: true,
			error: (error as any)?.name === 'AbortError' ? 'Claude request timed out' : 'Claude request failed',
		};
	}
};
