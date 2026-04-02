/**
 * Direct Messaging Service
 * Handles patient ↔ provider direct conversations.
 *
 * System messages (ASSESSMENT, SESSION_SUMMARY, etc.) are injected by other
 * services (e.g. assessment completion, session end) so that the chat window
 * becomes a full care timeline.
 */
import { prisma } from '../config/db';

export type MessageType = 'TEXT' | 'SYSTEM' | 'ASSESSMENT' | 'SESSION_SUMMARY';
export type SenderRole = 'patient' | 'provider' | 'system';

// ─────────────────────────────────────────────────────────────────────────────
// Conversations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return or create a conversation between a patient and a provider.
 */
export async function getOrCreateConversation(patientId: string, providerId: string, isSupport = false) {
  // Validate that both patient and provider exist
  const [patient, provider] = await Promise.all([
    prisma.user.findUnique({ where: { id: patientId }, select: { id: true, role: true } }),
    prisma.user.findUnique({ where: { id: providerId }, select: { id: true, role: true } }),
  ]);

  if (!patient) throw new Error('Patient not found');
  if (!provider) throw new Error('Provider not found');

  // Only allow conversations with actual providers
  const providerRoles = ['THERAPIST', 'PSYCHIATRIST', 'PSYCHOLOGIST', 'COACH'];
  if (!providerRoles.includes(String(provider.role).toUpperCase())) {
    throw new Error('Invalid provider role for messaging');
  }

  const existing = await prisma.directConversation.findUnique({
    where: { patientId_providerId: { patientId, providerId } },
  });
  if (existing) return existing;
  return prisma.directConversation.create({
    data: { patientId, providerId, isSupport },
  });
}

export interface ConversationListItem {
  id: string;
  providerName: string;
  providerRole: string;
  providerAvatar?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: Date | null;
  unreadCount: number;
  isSupport: boolean;
  isPinned: boolean;
}

export interface ProviderConversationListItem {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail?: string | null;
  patientAvatar?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: Date | null;
  unreadCount: number;
  hasSessionHistory: boolean;
  hasMessageHistory: boolean;
}

type ConversationProviderProfile = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  providerType: string | null;
  profileImageUrl: string | null;
};

type ConversationPatientProfile = {
  id: string;
  firstName: string;
  lastName: string;
  name: string | null;
  email: string | null;
  profileImageUrl: string | null;
};

/**
 * All conversations for a patient, enriched with provider info + unread counts.
 * The patient's primary therapist (first active CareTeamAssignment) is marked
 * isPinned=true so the UI can elevate it.
 */
export async function getPatientConversations(patientId: string): Promise<ConversationListItem[]> {
  // Find primary care team assignment to determine who to pin
  const primaryAssignment = await prisma.careTeamAssignment.findFirst({
    where: { patientId, status: 'ACTIVE' },
    orderBy: { assignedAt: 'asc' },
  });
  const primaryProviderId = primaryAssignment?.providerId ?? null;

  const conversations = await prisma.directConversation.findMany({
    where: { patientId },
    orderBy: { lastMessageAt: 'desc' },
    select: {
      id: true,
      providerId: true,
      isSupport: true,
      lastMessageAt: true,
      lastMessageText: true,
    },
  });

  if (!conversations.length) return [];

  const providerIds = Array.from(new Set(conversations.map((conversation) => conversation.providerId)));
  const [providers, unreadCounts] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: providerIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        providerType: true,
        profileImageUrl: true,
      },
    }),
    prisma.directMessage.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: conversations.map((conversation) => conversation.id) },
        senderRole: { not: 'patient' },
        readAt: null,
      },
      _count: { _all: true },
    }),
  ]);

  const providerById = new Map<string, ConversationProviderProfile>(
    (providers as ConversationProviderProfile[]).map((provider) => [provider.id, provider]),
  );
  const unreadByConversationId = new Map(
    unreadCounts.map((row) => [row.conversationId, row._count._all]),
  );

  return conversations.map((c) => {
    const p = providerById.get(c.providerId);
    if (!p) {
      return {
        id: c.id,
        providerName: 'Provider',
        providerRole: 'Therapist',
        providerAvatar: null,
        lastMessage: c.lastMessageText,
        lastMessageAt: c.lastMessageAt,
        unreadCount: unreadByConversationId.get(c.id) ?? 0,
        isSupport: c.isSupport,
        isPinned: c.providerId === primaryProviderId,
      };
    }
    const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Provider';
    const role = String(p.providerType || p.role || 'Therapist');
    return {
      id: c.id,
      providerName: name,
      providerRole: role,
      providerAvatar: p.profileImageUrl,
      lastMessage: c.lastMessageText,
      lastMessageAt: c.lastMessageAt,
      unreadCount: unreadByConversationId.get(c.id) ?? 0,
      isSupport: c.isSupport,
      isPinned: c.providerId === primaryProviderId,
    };
  });
}

/**
 * All conversations for a provider, seeded from either historical sessions or
 * direct-message history so the provider inbox can always address past patients.
 */
export async function getProviderConversations(providerId: string): Promise<ProviderConversationListItem[]> {
  const [messageConversations, sessionHistory] = await Promise.all([
    prisma.directConversation.findMany({
      where: { providerId },
      select: {
        id: true,
        patientId: true,
      },
    }),
    prisma.therapySession.findMany({
      where: {
        therapistProfileId: providerId,
        patientProfile: {
          userId: {
            not: '',
          },
        },
      },
      distinct: ['patientProfileId'],
      select: {
        patientProfile: {
          select: {
            userId: true,
          },
        },
      },
    }),
  ]);

  const sessionPatientIds = sessionHistory
    .map((entry) => entry.patientProfile?.userId)
    .filter((value): value is string => Boolean(value));
  const messagePatientIds = messageConversations.map((entry) => entry.patientId);
  const patientIds = Array.from(new Set([...messagePatientIds, ...sessionPatientIds]));

  if (!patientIds.length) {
    return [];
  }

  await Promise.all(patientIds.map((patientId) => getOrCreateConversation(patientId, providerId)));

  const sessionPatientSet = new Set(sessionPatientIds);
  const messagePatientSet = new Set(messagePatientIds);

  const conversations = await prisma.directConversation.findMany({
    where: {
      providerId,
      patientId: { in: patientIds },
    },
    select: {
      id: true,
      patientId: true,
      lastMessageText: true,
      lastMessageAt: true,
    },
  });

  if (!conversations.length) return [];

  const [patients, unreadCounts] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: patientIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        profileImageUrl: true,
      },
    }),
    prisma.directMessage.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: conversations.map((conversation) => conversation.id) },
        senderRole: 'patient',
        readAt: null,
      },
      _count: { _all: true },
    }),
  ]);

  const patientById = new Map<string, ConversationPatientProfile>(
    (patients as ConversationPatientProfile[]).map((patient) => [patient.id, patient]),
  );
  const unreadByConversationId = new Map(
    unreadCounts.map((row) => [row.conversationId, row._count._all]),
  );

  return conversations
    .map((conversation) => {
      const patient = patientById.get(conversation.patientId);
      return {
        id: conversation.id,
        patientId: conversation.patientId,
        patientName:
          (patient
            ? [patient.firstName, patient.lastName].filter(Boolean).join(' ') || patient.name || 'Patient'
            : 'Patient'),
        patientEmail: patient?.email,
        patientAvatar: patient?.profileImageUrl,
        lastMessage: conversation.lastMessageText,
        lastMessageAt: conversation.lastMessageAt,
        unreadCount: unreadByConversationId.get(conversation.id) ?? 0,
        hasSessionHistory: sessionPatientSet.has(conversation.patientId),
        hasMessageHistory: messagePatientSet.has(conversation.patientId),
      };
    })
    .sort((left, right) => {
      const leftTs = left.lastMessageAt ? new Date(left.lastMessageAt).getTime() : 0;
      const rightTs = right.lastMessageAt ? new Date(right.lastMessageAt).getTime() : 0;
      return rightTs - leftTs;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Messages
// ─────────────────────────────────────────────────────────────────────────────

export interface MessageRow {
  id: string;
  role: SenderRole;
  content: string;
  messageType: MessageType;
  metadata?: any;
  createdAt: Date;
  readAt?: Date | null;
}

/**
 * Paginated messages in a conversation. Also marks all messages sent by the
 * other party as read when the patient opens the thread.
 */
export async function getConversationMessages(
  conversationId: string,
  viewerId: string,
  limit = 50,
  before?: string,
): Promise<MessageRow[]> {
  const rows = await prisma.directMessage.findMany({
    where: {
      conversationId,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: {
      id: true,
      senderRole: true,
      content: true,
      messageType: true,
      metadata: true,
      createdAt: true,
      readAt: true,
    },
  });

  // Mark unread messages from the other party as read
  await prisma.directMessage.updateMany({
    where: {
      conversationId,
      senderId: { not: viewerId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return rows.map((r) => ({
    id: r.id,
    role: r.senderRole as SenderRole,
    content: r.content,
    messageType: r.messageType as MessageType,
    metadata: r.metadata,
    createdAt: r.createdAt,
    readAt: r.readAt,
  }));
}

/**
 * Send a text message from a patient. Returns the created message so the
 * caller can emit it over Socket.io.
 */
export async function sendDirectMessage(
  conversationId: string,
  senderId: string,
  senderRole: SenderRole,
  content: string,
): Promise<MessageRow & { conversationId: string }> {
  // Verify the sender belongs to this conversation
  const conv = await prisma.directConversation.findUnique({ where: { id: conversationId } });
  if (!conv) throw new Error('Conversation not found');

  const isParticipant =
    (senderRole === 'patient' && conv.patientId === senderId) ||
    (senderRole === 'provider' && conv.providerId === senderId);
  if (!isParticipant) throw new Error('Not a participant in this conversation');

  const msg = await prisma.directMessage.create({
    data: {
      conversationId,
      senderId,
      senderRole,
      content,
      messageType: 'TEXT',
    },
  });

  // Update conversation meta
  await prisma.directConversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: msg.createdAt,
      lastMessageText: content.length > 120 ? content.slice(0, 120) + '…' : content,
    },
  });

  return {
    id: msg.id,
    conversationId,
    role: senderRole,
    content: msg.content,
    messageType: 'TEXT',
    createdAt: msg.createdAt,
    readAt: null,
  };
}

/**
 * Inject a system-generated message into a conversation (e.g. after PHQ-9
 * submission or video session completion). Called by other service modules.
 */
export async function injectSystemMessage(
  patientId: string,
  providerId: string,
  content: string,
  messageType: MessageType = 'SYSTEM',
  metadata?: Record<string, unknown>,
): Promise<void> {
  // Support channel uses a dedicated no-op provider ID "SUPPORT"; skip inject
  if (!patientId || !providerId) return;

  let conv: { id: string } | null = null;
  try {
    conv = await prisma.directConversation.findUnique({
      where: { patientId_providerId: { patientId, providerId } },
    });
  } catch {
    return; // table may not exist yet during migration
  }
  if (!conv) return; // only inject if a conversation already exists

  await prisma.directMessage.create({
    data: {
      conversationId: conv.id,
      senderId: patientId, // system messages attributed to patient for ownership
      senderRole: 'system',
      content,
      messageType,
      metadata: metadata ?? {},
    },
  });

  await prisma.directConversation.update({
    where: { id: conv.id },
    data: {
      lastMessageAt: new Date(),
      lastMessageText: content.length > 120 ? content.slice(0, 120) + '…' : content,
    },
  });
}

/**
 * Mark all messages in a conversation as read by the viewer.
 */
export async function markConversationRead(conversationId: string, viewerId: string): Promise<void> {
  await prisma.directMessage.updateMany({
    where: { conversationId, senderId: { not: viewerId }, readAt: null },
    data: { readAt: new Date() },
  });
}
