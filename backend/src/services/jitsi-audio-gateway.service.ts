import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { uploadSessionAudioToS3 } from './s3.service';
import { processSessionAudio } from './ai.service';

const exec = promisify(execCallback);
const LOCAL_AUDIO_PREFIX = 'local://';

export type JitsiConferenceLeftPayload = {
  event?: string;
  eventName?: string;
  sessionId?: string;
  roomName?: string;
  meetingRoomName?: string;
  recordingUrl?: string;
  recordingMimeType?: string;
  recordingFileName?: string;
};

const detectExtension = (fileName: string, mimeType: string): string => {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.mp3')) return 'mp3';
  if (lowerName.endsWith('.wav')) return 'wav';
  if (lowerName.endsWith('.m4a')) return 'm4a';
  if (lowerName.endsWith('.ogg')) return 'ogg';
  if (lowerName.endsWith('.webm')) return 'webm';

  const lowerMime = String(mimeType || '').toLowerCase();
  if (lowerMime.includes('mpeg')) return 'mp3';
  if (lowerMime.includes('wav')) return 'wav';
  if (lowerMime.includes('mp4')) return 'm4a';
  if (lowerMime.includes('ogg')) return 'ogg';
  if (lowerMime.includes('webm')) return 'webm';
  return 'wav';
};

const deriveFileName = (recordingUrl?: string, fallback = 'session-recording.wav'): string => {
  const source = String(recordingUrl || '').trim();
  if (!source) return fallback;
  const clean = source.split('?')[0];
  const name = clean.split('/').filter(Boolean).pop();
  return name && name.length > 0 ? name : fallback;
};

const fetchRecordingAudio = async (
  recordingUrl: string,
  explicitMimeType?: string,
): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> => {
  const response = await fetch(recordingUrl);
  if (!response.ok) {
    throw new AppError(`Unable to fetch Jitsi recording (${response.status})`, 502);
  }

  const arrayBuffer = await response.arrayBuffer();
  const fileName = deriveFileName(recordingUrl);
  const mimeType = String(explicitMimeType || response.headers.get('content-type') || 'audio/wav');

  return {
    buffer: Buffer.from(arrayBuffer),
    fileName,
    mimeType,
  };
};

const runExternalCapture = async (
  sessionId: string,
  roomName: string,
): Promise<{ buffer: Buffer; fileName: string; mimeType: string } | null> => {
  const captureMode = String(process.env.JITSI_CAPTURE_MODE || '').trim().toLowerCase();
  const command =
    captureMode === 'jibri'
      ? String(process.env.JITSI_JIBRI_COMMAND || '').trim()
      : captureMode === 'puppeteer'
      ? String(process.env.JITSI_PUPPETEER_COMMAND || '').trim()
      : '';

  if (!command) return null;

  const expandedCommand = command
    .replaceAll('{sessionId}', sessionId)
    .replaceAll('{roomName}', roomName);

  const { stdout } = await exec(expandedCommand, {
    env: {
      ...process.env,
      SESSION_ID: sessionId,
      ROOM_NAME: roomName,
    },
    timeout: 10 * 60 * 1000,
    maxBuffer: 10 * 1024 * 1024,
  });

  const output = String(stdout || '').trim();
  if (!output) return null;

  if (output.startsWith('http://') || output.startsWith('https://')) {
    return fetchRecordingAudio(output);
  }

  const localPath = path.resolve(output);
  const buffer = await fs.readFile(localPath);
  const fileName = deriveFileName(localPath);
  const mimeType = `audio/${detectExtension(fileName, '')}`;

  return { buffer, fileName, mimeType };
};

const storeToLocal = async (sessionId: string, payload: { buffer: Buffer; fileName: string; mimeType: string }): Promise<string> => {
  const storageRoot = process.env.LOCAL_AUDIO_STORAGE_PATH
    ? path.resolve(process.env.LOCAL_AUDIO_STORAGE_PATH)
    : path.resolve(process.cwd(), 'storage/session-audio');

  await fs.mkdir(storageRoot, { recursive: true });

  const extension = detectExtension(payload.fileName, payload.mimeType);
  const fileName = `${sessionId}-${Date.now()}-${randomUUID()}.${extension}`;
  const fullPath = path.resolve(storageRoot, fileName);
  await fs.writeFile(fullPath, payload.buffer);

  return `${LOCAL_AUDIO_PREFIX}${fileName}`;
};

const storeSessionAudio = async (
  sessionId: string,
  payload: { buffer: Buffer; fileName: string; mimeType: string },
): Promise<string> => {
  if (process.env.AWS_S3_BUCKET) {
    const extension = detectExtension(payload.fileName, payload.mimeType);
    const uploaded = await uploadSessionAudioToS3({
      sessionId,
      buffer: payload.buffer,
      mimeType: payload.mimeType,
      fileExtension: extension,
    });
    return uploaded.objectUrl;
  }

  return storeToLocal(sessionId, payload);
};

const resolveSession = async (payload: JitsiConferenceLeftPayload) => {
  const sessionId = String(payload.sessionId || '').trim();
  const roomName = String(payload.meetingRoomName || payload.roomName || '').trim();

  if (sessionId) {
    const session = await prisma.therapySession.findUnique({
      where: { id: sessionId },
      select: { id: true, meetingRoomName: true },
    });
    if (session) return session;
  }

  if (roomName) {
    const session = await prisma.therapySession.findFirst({
      where: { meetingRoomName: roomName },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, meetingRoomName: true },
    });
    if (session) return session;
  }

  throw new AppError('Therapy session not found for Jitsi event', 404);
};

export const handleJitsiConferenceLeft = async (payload: JitsiConferenceLeftPayload): Promise<{
  sessionId: string;
  audioRecordingUrl: string;
  transcriptionQueued: boolean;
}> => {
  const session = await resolveSession(payload);
  const roomName = String(payload.meetingRoomName || payload.roomName || session.meetingRoomName || '').trim();

  let recordingPayload: { buffer: Buffer; fileName: string; mimeType: string } | null = null;
  const recordingUrl = String(payload.recordingUrl || '').trim();

  if (recordingUrl) {
    recordingPayload = await fetchRecordingAudio(recordingUrl, payload.recordingMimeType);
  } else {
    recordingPayload = await runExternalCapture(String(session.id), roomName);
  }

  if (!recordingPayload) {
    throw new AppError('No recording source found. Provide recordingUrl or configure capture command.', 400);
  }

  const audioRecordingUrl = await storeSessionAudio(String(session.id), recordingPayload);

  await prisma.therapySession.update({
    where: { id: String(session.id) },
    data: { audioRecordingUrl },
  });

  void processSessionAudio(String(session.id)).catch((error) => {
    console.error('[jitsi-audio-gateway] processSessionAudio failed', {
      sessionId: String(session.id),
      errorType: (error as any)?.name || 'UnknownError',
      error: (error as any)?.message || String(error),
    });
  });

  return {
    sessionId: String(session.id),
    audioRecordingUrl,
    transcriptionQueued: true,
  };
};
