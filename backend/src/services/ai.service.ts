import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { transcribeSession } from './aiService';

const LOCAL_AUDIO_PREFIX = 'local://';
const OPENAI_CHAT_COMPLETIONS_API_URL = 'https://api.openai.com/v1/chat/completions';

export type ClinicalSummaryResult = {
  moodSentiment: {
    primaryEmotionalState: string;
    emotionalVolatilityScore: number;
    anxietyLevelScore: number;
    keywords: string[];
  };
  soapNote: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  actionItems: string[];
};

const normalizeScore = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(1, Math.min(10, Math.round(numeric)));
};

const extractStrictJson = (rawText: string): string => {
  const text = String(rawText || '').trim();
  if (!text) {
    throw new AppError('Empty response from GPT-4o clinical summary', 502);
  }

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1].trim() : text;

  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new AppError('GPT-4o response is not valid JSON', 502);
  }

  return candidate.slice(firstBrace, lastBrace + 1);
};

export const generateSummary = async (transcript: string): Promise<ClinicalSummaryResult> => {
  const cleanTranscript = String(transcript || '').trim();
  if (!cleanTranscript) {
    throw new AppError('Transcript is required for clinical summary generation', 400);
  }

  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    throw new AppError('OPENAI_API_KEY is not configured', 500);
  }

  const systemPrompt =
    "You are a Clinical AI Scribe specialized in Mental Health. Analyze the following transcript between a provider and a patient.\n\n### TASK 1: MOOD & SENTIMENT ANALYSIS\n- Detect: Primary emotional state (e.g., Anxious, Depressed, Guarded).\n- Intensity: Provide a score from 1-10 for 'Emotional Volatility' and 'Anxiety Level'.\n- Keywords: Extract 3-5 clinical keywords that describe the patient's state (e.g., \"Flat affect\", \"Rapid speech\").\n\n### TASK 2: STRUCTURED SOAP NOTE\n- Subjective: Summarize the patient’s reported concerns, symptoms, and feelings.\n- Objective: Identify observable behaviors or patterns mentioned.\n- Assessment: Draft a clinical impression based on the conversation.\n- Plan: List all treatment steps, homework, or next-session goals mentioned.\n\n### TASK 3: ACTION ITEMS\n- Extract any specific goals (e.g., \"Walk for 10 minutes\") to be converted into tasks.\n\nReturn the result as a strictly valid JSON object.";

  const response = await fetch(OPENAI_CHAT_COMPLETIONS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content:
            `Return only JSON with this exact shape:\n{\n  \"moodSentiment\": {\n    \"primaryEmotionalState\": \"\",\n    \"emotionalVolatilityScore\": 1,\n    \"anxietyLevelScore\": 1,\n    \"keywords\": [\"\", \"\", \"\"]\n  },\n  \"soapNote\": {\n    \"subjective\": \"\",\n    \"objective\": \"\",\n    \"assessment\": \"\",\n    \"plan\": \"\"\n  },\n  \"actionItems\": [\"\"]\n}\n\nTranscript:\n${cleanTranscript}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new AppError(`GPT-4o summary generation failed (${response.status}): ${bodyText.slice(0, 300)}`, 502);
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const modelText = String(body?.choices?.[0]?.message?.content || '').trim();
  const parsed = JSON.parse(extractStrictJson(modelText)) as Partial<ClinicalSummaryResult>;

  const keywords = Array.isArray(parsed.moodSentiment?.keywords)
    ? parsed.moodSentiment?.keywords
        .map((item) => String(item || '').trim())
        .filter((item) => item.length > 0)
        .slice(0, 5)
    : [];

  const actionItems = Array.isArray(parsed.actionItems)
    ? parsed.actionItems
        .map((item) => String(item || '').trim())
        .filter((item) => item.length > 0)
    : [];

  return {
    moodSentiment: {
      primaryEmotionalState: String(parsed.moodSentiment?.primaryEmotionalState || '').trim(),
      emotionalVolatilityScore: normalizeScore(parsed.moodSentiment?.emotionalVolatilityScore),
      anxietyLevelScore: normalizeScore(parsed.moodSentiment?.anxietyLevelScore),
      keywords,
    },
    soapNote: {
      subjective: String(parsed.soapNote?.subjective || '').trim(),
      objective: String(parsed.soapNote?.objective || '').trim(),
      assessment: String(parsed.soapNote?.assessment || '').trim(),
      plan: String(parsed.soapNote?.plan || '').trim(),
    },
    actionItems,
  };
};

const inferMimeTypeFromPath = (sourcePath: string): string => {
  const lower = sourcePath.toLowerCase();
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.webm')) return 'audio/webm';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  return 'audio/wav';
};

const deriveFileName = (sourcePath: string): string => {
  const normalized = sourcePath.split('?')[0];
  const candidate = normalized.split('/').filter(Boolean).pop();
  return candidate && candidate.length > 0 ? candidate : 'session-recording.wav';
};

const readAudioFromLocalReference = async (audioUrl: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> => {
  const localStorageRoot = process.env.LOCAL_AUDIO_STORAGE_PATH
    ? path.resolve(process.env.LOCAL_AUDIO_STORAGE_PATH)
    : path.resolve(process.cwd(), 'storage/session-audio');

  const relativePath = audioUrl.replace(LOCAL_AUDIO_PREFIX, '').replace(/^\/+/, '');
  const fullPath = path.resolve(localStorageRoot, relativePath);
  const buffer = await fs.readFile(fullPath);

  return {
    buffer,
    fileName: deriveFileName(fullPath),
    mimeType: inferMimeTypeFromPath(fullPath),
  };
};

const fetchRemoteAudio = async (audioUrl: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> => {
  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new AppError(`Failed to fetch session audio (${response.status})`, 502);
  }

  const fileName = deriveFileName(audioUrl);
  const mimeType = String(response.headers.get('content-type') || inferMimeTypeFromPath(fileName));
  const arrayBuffer = await response.arrayBuffer();

  return {
    buffer: Buffer.from(arrayBuffer),
    fileName,
    mimeType,
  };
};

const loadSessionAudio = async (audioUrl: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> => {
  if (audioUrl.startsWith(LOCAL_AUDIO_PREFIX)) {
    return readAudioFromLocalReference(audioUrl);
  }

  return fetchRemoteAudio(audioUrl);
};

export const processSessionAudio = async (sessionId: string): Promise<{
  sessionId: string;
  audioRecordingUrl: string;
  transcriptLength: number;
}> => {
  const session = await prisma.therapySession.findUnique({
    where: { id: sessionId },
    select: { id: true, audioRecordingUrl: true },
  });

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  const audioRecordingUrl = String(session.audioRecordingUrl || '').trim();
  if (!audioRecordingUrl) {
    throw new AppError('No audio recording linked to this session', 400);
  }

  const audioPayload = await loadSessionAudio(audioRecordingUrl);
  const transcriptResult = await transcribeSession(
    audioPayload.buffer,
    audioPayload.fileName,
    audioPayload.mimeType,
  );

  await prisma.therapySession.update({
    where: { id: sessionId },
    data: {
      transcript: transcriptResult.transcript,
    },
  });

  return {
    sessionId: String(session.id),
    audioRecordingUrl,
    transcriptLength: transcriptResult.transcript.length,
  };
};
