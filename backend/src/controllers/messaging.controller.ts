import { Request, Response } from 'express';
import {
  getPatientConversations,
  getConversationMessages,
  sendDirectMessage,
  markConversationRead,
  getOrCreateConversation,
} from '../services/messaging.service';
import { prisma } from '../config/db';

// ─── GET /patient/messages/conversations ────────────────────────────────────
export async function getConversationsController(req: Request, res: Response) {
  const patientId = req.auth?.userId;
  if (!patientId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const conversations = await getPatientConversations(patientId);
    return res.json({ success: true, data: conversations });
  } catch (err: any) {
    // If the table doesn't exist yet (pre-migration), return empty array
    if (String(err?.message).includes('does not exist') || String(err?.code) === 'P2021') {
      return res.json({ success: true, data: [] });
    }
    console.error('getConversationsController error', err);
    return res.status(500).json({ success: false, message: 'Unable to load conversations.' });
  }
}

// ─── GET /patient/messages/:conversationId ───────────────────────────────────
export async function getMessagesController(req: Request, res: Response) {
  const patientId = req.auth?.userId;
    const conversationId = req.params.conversationId as string;
  const before = req.query.before as string | undefined;

  if (!patientId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    // Verify the patient is a participant
    const conv = await prisma.directConversation.findFirst({
      where: { id: conversationId, patientId },
    });
    if (!conv) return res.status(403).json({ success: false, message: 'Access denied.' });

    const messages = await getConversationMessages(conversationId, patientId, 60, before);
    return res.json({ success: true, data: messages });
  } catch (err: any) {
    if (String(err?.message).includes('does not exist') || String(err?.code) === 'P2021') {
      return res.json({ success: true, data: [] });
    }
    console.error('getMessagesController error', err);
    return res.status(500).json({ success: false, message: 'Unable to load messages.' });
  }
}

// ─── POST /patient/messages ──────────────────────────────────────────────────
export async function sendMessageController(req: Request, res: Response) {
  const patientId = req.auth?.userId;
  if (!patientId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { conversationId, content } = req.body as { conversationId?: string; content?: string };

  if (!conversationId || !content?.trim()) {
    return res.status(400).json({ success: false, message: 'conversationId and content are required.' });
  }

  if (content.length > 4000) {
    return res.status(400).json({ success: false, message: 'Message too long (max 4000 characters).' });
  }

  try {
    const message = await sendDirectMessage(conversationId, patientId, 'patient', content.trim());
    return res.status(201).json({ success: true, data: message });
  } catch (err: any) {
    console.error('sendMessageController error', err);
    const msg = String(err?.message || '');
    if (msg === 'Conversation not found') return res.status(404).json({ success: false, message: msg });
    if (msg === 'Not a participant in this conversation') return res.status(403).json({ success: false, message: msg });
    return res.status(500).json({ success: false, message: 'Message could not be sent.' });
  }
}

// ─── POST /patient/messages/:conversationId/read ─────────────────────────────
export async function markMessagesReadController(req: Request, res: Response) {
  const patientId = req.auth?.userId;
    const conversationId = req.params.conversationId as string;
  if (!patientId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    await markConversationRead(conversationId, patientId);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('markMessagesReadController error', err);
    return res.status(500).json({ success: false, message: 'Unable to mark messages as read.' });
  }
}

// ─── POST /patient/messages/start ───────────────────────────────────────────
// Creates or fetches the conversation for a given provider, used by the
// Care Team page to deep-link into a new thread.
export async function startConversationController(req: Request, res: Response) {
  const patientId = req.auth?.userId;
  if (!patientId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { providerId } = req.body as { providerId?: string };
  if (!providerId) return res.status(400).json({ success: false, message: 'providerId is required.' });

  try {
    const conv = await getOrCreateConversation(patientId, providerId);
    return res.json({ success: true, data: { conversationId: conv.id } });
  } catch (err: any) {
    console.error('startConversationController error:', err);
    return res.status(500).json({ success: false, message: 'Unable to start conversation.' });
  }
}
