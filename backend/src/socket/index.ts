import { Server as IOServer, Socket } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import { createClient, RedisClientType } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { randomUUID } from 'crypto';
import { env } from '../config/env';
import { prisma } from '../config/db';
import client from 'prom-client';
import os from 'os';
import { sendDirectMessage, markConversationRead } from '../services/messaging.service';

type JwtPayload = {
  sub: string;
  role?: string;
  iat?: number;
  exp?: number;
  [k: string]: any;
};

export let io: IOServer;

export async function initSocket(server: http.Server) {
  io = new IOServer(server, {
    cors: {
      origin: true,
      credentials: true,
    },
    path: '/socket.io',
    pingTimeout: 30000,
  });

  // Redis adapter for horizontal scaling + pub/sub
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const pubClient: RedisClientType = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: () => false,
    },
  });
  const subClient: RedisClientType = pubClient.duplicate();

  // Streams configuration
  const STREAM_KEY = 'session:events';
  const STREAM_GROUP = 'manas360_stream_group';
  const CONSUMER_NAME = `${os.hostname()}:${process.pid}`;

  let redisAvailable = false;

  // Prometheus metrics
  const redisUp = new client.Gauge({ name: 'socket_redis_up', help: 'Redis availability (1 up, 0 down)' });
  const streamProcessed = new client.Counter({ name: 'socket_stream_processed_total', help: 'Total stream entries processed' });
  const streamErrors = new client.Counter({ name: 'socket_stream_errors_total', help: 'Stream processing errors' });
  const rateLimitRejected = new client.Counter({ name: 'socket_rate_limit_rejected_total', help: 'Rate limit rejections' });
  const messageLatency = new client.Histogram({
    name: 'app_message_latency_seconds',
    help: 'End-to-end message processing latency (seconds)',
    labelNames: ['instance', 'role'],
    buckets: [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2]
  });
  const activeConnections = new client.Gauge({ name: 'app_ws_active_connections', help: 'Active websocket connections', labelNames: ['instance'] });
  const droppedConnections = new client.Counter({ name: 'app_ws_dropped_connections_total', help: 'Dropped websocket connections', labelNames: ['instance', 'reason'] });

  // background flag to stop consumer on shutdown
  let shuttingDown = false;

  async function setupRedisAdapter() {
    try {
      await pubClient.connect();
      await subClient.connect();
      io.adapter(createAdapter(pubClient, subClient));
      redisAvailable = true;
      redisUp.set(1);
      console.log('Redis adapter connected');

      // ensure consumer group exists
      try {
        await pubClient.sendCommand(['XGROUP', 'CREATE', STREAM_KEY, STREAM_GROUP, '$', 'MKSTREAM']);
      } catch (e: any) {
        // ignore BUSYGROUP - group already exists
        if (!String(e).includes('BUSYGROUP')) console.warn('XGROUP create warning', e);
      }

      // start consumer loop
      startConsumerLoop().catch((err) => console.error('consumer loop error', err));

      // subscribe to presence update pubsub channels and broadcast to rooms
      try {
        // pattern: presence:updates:<sessionId>
        await subClient.pSubscribe('presence:updates:*', (message, channel) => {
          try {
            const parts = channel.split(':');
            const sessionId = parts[2];
            const payload = JSON.parse(message);
            io.to(sessionId).emit('presence:update', payload);
          } catch (e) {
            console.warn('presence psubscribe handler error', e);
          }
        });
      } catch (e) {
        console.warn('Failed to pSubscribe presence channels', e);
      }

      pubClient.on('error', (e) => {
        console.error('Redis client error', e);
        redisAvailable = false;
        redisUp.set(0);
      });
      pubClient.on('end', () => {
        console.warn('Redis connection ended');
        redisAvailable = false;
        redisUp.set(0);
      });
    } catch (err) {
      console.warn('Redis adapter not available, continuing without it', err);
      redisAvailable = false;
      redisUp.set(0);
    }
  }

  // initialize but don't fail startup if Redis is down
  void setupRedisAdapter();

  // JWT auth middleware for socket connections
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || (socket.handshake.headers?.authorization || '').split(' ')[1];
      if (!token) return next(new Error('Authentication error: token missing'));
      const payload = jwt.verify(token, env.jwtAccessSecret) as JwtPayload;
      // attach minimal user info to socket
      socket.data.user = { id: payload.sub, role: payload.role, raw: payload };
      console.info('socket.auth_success', { userId: payload.sub, role: payload.role, socketId: socket.id });
      return next();
    } catch (err) {
      console.warn('socket.auth_failed', { err: String(err), socketId: socket.id });
      return next(new Error('Authentication error'));
    }
  });

  // Basic per-socket rate limiter (simple token bucket)
  // Use Redis-backed sliding window rate limiter for global enforcement
  const RATE_LIMIT_PER_MINUTE = 120; // configurable
  io.use((socket, next) => {
    (socket as any).allowEvent = async (cost = 1): Promise<boolean> => {
      try {
        const userId = socket.data.user?.id || socket.id;
        const window = Math.floor(Date.now() / 60000);
        const key = `rl:${userId}:${window}`;
        if (!redisAvailable) return true; // allow when redis down (best-effort)
        const cur = await pubClient.incr(key);
        if (cur === 1) await pubClient.expire(key, 65);
        if (cur > RATE_LIMIT_PER_MINUTE) {
          await pubClient.incr(`rl_rejects:${userId}`);
          rateLimitRejected.inc();
          return false;
        }
        return true;
      } catch (e) {
        // on error allow to avoid hard failure; could be tightened
        return true;
      }
    };
    next();
  });

  // Helper: authorize a user to join a session room
  async function authorizeJoin(sessionId: string, userId: string, role?: string) {
    const session = await prisma.therapySession.findUnique({ 
      where: { id: sessionId }
    });
    if (!session) return false;
    
    if (role === 'patient') {
      const patient = await prisma.patientProfile.findUnique({ where: { userId } });
      if (patient && session.patientProfileId === patient.id) return true;
    }
    
    if ((role === 'therapist' || role === 'provider') && session.therapistProfileId === userId) return true;
    
    if (role === 'admin' || role === 'superadmin' || role === 'complianceofficer') return true;
    return false;
  }

  io.on('connection', (socket) => {
    const user = socket.data.user;
    // increment active connections
    try { activeConnections.labels(os.hostname()).inc(); } catch (e) {}
    console.info('socket.connect', { socketId: socket.id, userId: user?.id, role: user?.role });

    // Automatically join admins to the admin-room
    if (user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'complianceofficer') {
      socket.join('admin-room');
      console.info('socket.join_admin_room', { userId: user.id });
    }

    socket.on('join_session', async (payload: { sessionId: string }) => {
      if (!(await (socket as any).allowEvent(1))) return socket.emit('error', { code: 'RATE_LIMIT' });
      const { sessionId } = payload;
      try {
        const ok = await authorizeJoin(sessionId, user.id, user.role);
        if (!ok) return socket.emit('join_denied', { reason: 'unauthorized' });
        // join the room
        await socket.join(sessionId);

        // Update presence in Redis
        if (redisAvailable) {
          const member = `${user.role}:${user.id}:${socket.id}`;
          await pubClient.sendCommand(['ZADD', `session:presence:${sessionId}`, String(Date.now()), member]);
          
          // If first person joining a CONFIRMED session, notify admins
          const session = await prisma.therapySession.findUnique({
            where: { id: sessionId },
            include: {
              therapistProfile: { select: { firstName: true, lastName: true, name: true } },
              patientProfile: { include: { user: { select: { firstName: true, lastName: true, name: true } } } }
            }
          });

          if (session && session.status === 'CONFIRMED') {
            const count = await pubClient.sendCommand(['ZCARD', `session:presence:${sessionId}`]);
            if (Number(count) === 1) {
              const liveSession = {
                id: session.id,
                therapistName: session.therapistProfile.name || `${session.therapistProfile.firstName} ${session.therapistProfile.lastName}`,
                patientName: session.patientProfile.user.name || `${session.patientProfile.user.firstName} ${session.patientProfile.user.lastName}`,
                startTime: session.dateTime.toISOString(),
                status: 'in-progress'
              };
              io.to('admin-room').emit('session-started', liveSession);
            }
          }
        }

        // broadcast presence
        const socketsInRoom = await io.in(sessionId).allSockets();
        io.to(sessionId).emit('presence', { count: socketsInRoom.size });
        socket.emit('joined', { sessionId });
      } catch (err) {
        socket.emit('join_error', { error: String(err) });
      }
    });

    socket.on('leave_session', async (payload: { sessionId: string }) => {
      const { sessionId } = payload;
      
      if (redisAvailable) {
        const member = `${user.role}:${user.id}:${socket.id}`;
        await pubClient.sendCommand(['ZREM', `session:presence:${sessionId}`, member]);
        
        const count = await pubClient.sendCommand(['ZCARD', `session:presence:${sessionId}`]);
        if (Number(count) === 0) {
          io.to('admin-room').emit('session-ended', { sessionId });
        }
      }

      await socket.leave(sessionId);
      const socketsInRoom = await io.in(sessionId).allSockets();
      io.to(sessionId).emit('presence', { count: socketsInRoom.size });
      socket.emit('left', { sessionId });
    });

    socket.on('typing', (data: { sessionId: string; isTyping: boolean }) => {
      if (!(socket as any).consume(0.2)) return;
      socket.to(data.sessionId).emit('typing', { userId: user.id, isTyping: data.isTyping });
    });

    // ── Direct Messaging Events ─────────────────────────────────────────────
    // Patients join their personal inbox room on connect so they receive
    // new_message events pushed by providers in real time.
    socket.on('join_inbox', async () => {
      try {
        const inboxRoom = `inbox:${user.id}`;
        await socket.join(inboxRoom);

        // Track online presence in Redis (TTL 60s, refreshed on heartbeat)
        if (redisAvailable) {
          await pubClient.setEx(`presence:user:${user.id}`, 60, JSON.stringify({ userId: user.id, role: user.role, ts: Date.now() }));
        }
        socket.emit('inbox_joined', { room: inboxRoom });
      } catch (err) {
        socket.emit('error', { code: 'JOIN_INBOX_FAIL', message: String(err) });
      }
    });

    // Heartbeat to keep presence alive
    socket.on('presence_heartbeat', async () => {
      try {
        if (redisAvailable) {
          await pubClient.setEx(`presence:user:${user.id}`, 60, JSON.stringify({ userId: user.id, role: user.role, ts: Date.now() }));
        }
      } catch { /* noop */ }
    });

    // Query whether a specific user is currently online
    socket.on('check_presence', async (payload: { userId: string }) => {
      try {
        if (!redisAvailable) return socket.emit('presence_status', { userId: payload.userId, online: false });
        const raw = await pubClient.get(`presence:user:${payload.userId}`);
        if (!raw) return socket.emit('presence_status', { userId: payload.userId, online: false });
        const data = JSON.parse(raw);
        const staleSecs = (Date.now() - data.ts) / 1000;
        socket.emit('presence_status', { userId: payload.userId, online: staleSecs < 55 });
      } catch {
        socket.emit('presence_status', { userId: payload.userId, online: false });
      }
    });

    // Join a specific conversation room to get typing indicators
    socket.on('join_conversation', async (payload: { conversationId: string }) => {
      try {
        if (!(await (socket as any).allowEvent(1))) return socket.emit('error', { code: 'RATE_LIMIT' });
        const { conversationId } = payload;

        // Verify participant
        const conv = await prisma.directConversation.findUnique({ where: { id: conversationId } });
        if (!conv) return socket.emit('error', { code: 'CONVERSATION_NOT_FOUND' });
        const isParticipant = conv.patientId === user.id || conv.providerId === user.id;
        if (!isParticipant) return socket.emit('error', { code: 'NOT_AUTHORIZED' });

        await socket.join(`conv:${conversationId}`);
        socket.emit('conversation_joined', { conversationId });
      } catch (err) {
        socket.emit('error', { code: 'JOIN_CONV_FAIL', message: String(err) });
      }
    });

    // Typing indicator — broadcast to conversation room (except sender)
    socket.on('dm_typing', (payload: { conversationId: string; isTyping: boolean }) => {
      socket.to(`conv:${payload.conversationId}`).emit('dm_typing', {
        userId: user.id,
        role: user.role,
        conversationId: payload.conversationId,
        isTyping: payload.isTyping,
      });
    });

    // Send direct message via socket (in addition to REST endpoint)
    socket.on('dm_send', async (payload: { conversationId: string; content: string; clientMsgId?: string }) => {
      if (!(await (socket as any).allowEvent(1))) return socket.emit('error', { code: 'RATE_LIMIT' });
      try {
        const senderRole = user.role === 'patient' ? 'patient' : 'provider';
        const msg = await sendDirectMessage(payload.conversationId, user.id, senderRole, payload.content);

        // Emit to all participants in the conversation room
        io.to(`conv:${payload.conversationId}`).emit('new_message', { ...msg, clientMsgId: payload.clientMsgId });

        // Also push to the recipient's inbox room for notification
        const conv = await prisma.directConversation.findUnique({ where: { id: payload.conversationId } });
        if (conv) {
          const recipientId = senderRole === 'patient' ? conv.providerId : conv.patientId;
          io.to(`inbox:${recipientId}`).emit('new_message_notification', {
            conversationId: payload.conversationId,
            message: msg,
          });
        }
      } catch (err) {
        socket.emit('dm_error', { code: 'SEND_FAIL', message: String(err), clientMsgId: payload.clientMsgId });
      }
    });

    // Mark messages as read
    socket.on('dm_mark_read', async (payload: { conversationId: string }) => {
      try {
        await markConversationRead(payload.conversationId, user.id);
        // Notify sender that messages were read (for double-tick UX)
        socket.to(`conv:${payload.conversationId}`).emit('messages_read', {
          conversationId: payload.conversationId,
          readBy: user.id,
          readAt: new Date().toISOString(),
        });
      } catch { /* noop */ }
    });
    // ── End Direct Messaging Events ─────────────────────────────────────────

    // ── Therapeutic GPS Events ───────────────────────────────────────────────
    // The Python AI Engine pushes GPS updates to the Node backend via HTTP POST
    // (see /v1/gps/internal/push). The socket handler here relays them to the
    // specific therapist who is in the live session room.

    /**
     * gps:join – provider client registers for GPS updates for a session.
     * Payload: { sessionId: string, monitoringId: string }
     */
    socket.on('gps:join', async (payload: { sessionId: string; monitoringId: string }) => {
      try {
        const allowedProviderRoles = new Set(['therapist', 'psychiatrist', 'psychologist', 'coach']);
        const normalizedRole = String(user?.role || '').toLowerCase();
        if (!allowedProviderRoles.has(normalizedRole)) {
          return socket.emit('error', { code: 'GPS_FORBIDDEN', message: 'Only providers can join GPS rooms' });
        }
        const gpsRoom = `gps:${payload.sessionId}`;
        await socket.join(gpsRoom);
        socket.emit('gps:joined', { sessionId: payload.sessionId, monitoringId: payload.monitoringId });
      } catch (err) {
        socket.emit('error', { code: 'GPS_JOIN_FAIL', message: String(err) });
      }
    });

    /**
     * gps:leave – therapist leaves the GPS room (session ended / tab closed).
     */
    socket.on('gps:leave', async (payload: { sessionId: string }) => {
      await socket.leave(`gps:${payload.sessionId}`);
      socket.emit('gps:left', { sessionId: payload.sessionId });
    });

    /**
     * gps:push – internal event pushed by the AI Engine bridge (server-side only).
     * This is NOT exposed to untrusted clients; validated by the internal API key.
     * Payload: { sessionId, type: 'gps_update'|'crisis_alert', data: {...} }
     */
    socket.on('gps:push', (payload: { sessionId: string; type: string; data: unknown }) => {
      // Only allow internal service sockets (identified by role='internal')
      if (user?.role !== 'internal') return;
      io.to(`gps:${payload.sessionId}`).emit('gps:update', {
        type: payload.type,
        data: payload.data,
        timestamp: new Date().toISOString(),
      });
    });
    // ── End Therapeutic GPS Events ───────────────────────────────────────────

    socket.on('disconnecting', () => {
      // clean up presence for direct messaging rooms
      for (const room of socket.rooms) {
        if (room.startsWith('inbox:')) {
          // nothing special needed - just let the room empty
        }
      }
    });
    socket.on('disconnect', async (reason) => {
      try { activeConnections.labels(os.hostname()).dec(); } catch (e) {}
      try { droppedConnections.labels(os.hostname(), String(reason)).inc(); } catch (e) {}
      
      // Clean up session presence on disconnect
      try {
        if (redisAvailable) {
          // We need to find which sessions this socket was in.
          // Since we don't have a direct map here, we rely on presenceCleanup
          // or we could track sessions on the socket object.
          // For now, let's let presenceCleanup handle it to avoid complex tracking,
          // OR we can use the rooms the socket was in before disconnect.
        }
      } catch (e) {}

      console.info('socket.disconnect', { socketId: socket.id, reason });
    });
  });
  // Consumer loop: read from stream using XREADGROUP and deliver events
  async function startConsumerLoop() {
    while (!shuttingDown) {
      try {
        if (!redisAvailable) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        // Read entries for this consumer
        const res: any = await pubClient.sendCommand(['XREADGROUP', 'GROUP', STREAM_GROUP, CONSUMER_NAME, 'BLOCK', '5000', 'COUNT', '10', 'STREAMS', STREAM_KEY, '>']);
        if (!res) continue;
        // res structure: [[streamKey, [[id, [field, value, ...]], ...]]] 
        for (const streamArr of res) {
          const entries = streamArr[1];
          for (const entry of entries) {
            const id = entry[0];
            const pairs: any[] = entry[1];
            const obj: any = {};
            for (let i = 0; i < pairs.length; i += 2) obj[pairs[i]] = pairs[i + 1];
            try {
              const messageId = obj.messageId;
              const payload = JSON.parse(obj.payload || '{}');
              // dedupe using SET NX
              const dedupeKey = `socket_msg:${messageId}`;
              const setOk = await pubClient.set(dedupeKey, '1', { NX: true, EX: 3600 });
              if (!setOk) {
                // already processed
                await pubClient.sendCommand(['XACK', STREAM_KEY, STREAM_GROUP, id]);
                continue;
              }

              // emit to room
              io.to(payload.sessionId).emit('answer_received', payload);
              streamProcessed.inc();

              // mark processed in stream
              await pubClient.sendCommand(['XACK', STREAM_KEY, STREAM_GROUP, id]);
            } catch (err) {
              streamErrors.inc();
              console.error('Error processing stream entry', err);
            }
          }
        }
      } catch (err) {
        console.error('Consumer loop iteration error', err);
        streamErrors.inc();
        redisAvailable = false;
        redisUp.set(0);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  // Presence cleanup: check zset entries older than TTL and mark offline in DB
  const PRESENCE_TTL_MS = 60 * 1000; // 60s
  async function presenceCleanup() {
    while (!shuttingDown) {
      try {
        if (!redisAvailable) {
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }
        // find presence keys using SCAN for pattern
        let cursor = 0;
        do {
          const res: any = await pubClient.sendCommand(['SCAN', String(cursor), 'MATCH', 'session:presence:*', 'COUNT', '200']);
          cursor = Number(res[0]);
          const keys = res[1] || [];
          for (const key of keys) {
            try {
              const now = Date.now();
              // remove stale members
              const staleMax = now - PRESENCE_TTL_MS;
              // get members with score less than staleMax
              const stale = (await pubClient.sendCommand(['ZRANGEBYSCORE', key, '-inf', String(staleMax)])) as any[];
              if (stale && stale.length > 0) {
                // remove them
                await pubClient.sendCommand(['ZREM', key, ...(stale as any[])]);
                
                // recompute current online users and publish update
                const remaining = (await pubClient.sendCommand(['ZRANGE', key, '0', '-1'])) as any[];
                
                const sessionId = key.split(':')[2];
                if (remaining.length === 0) {
                   // Notify admins if session ended
                   io.to('admin-room').emit('session-ended', { sessionId });
                }

                const onlineUsers = {} as Record<string, { userId: string; role: string; clientCount: number }>;
                for (const mem of remaining) {
                  const parts = mem.split(':');
                  if (parts.length < 3) continue;
                  const rrole = parts[0];
                  const uid = parts[1];
                  const k = `${rrole}:${uid}`;
                  onlineUsers[k] = onlineUsers[k] || { userId: uid, role: rrole, clientCount: 0 };
                  onlineUsers[k].clientCount += 1;
                }
                const summary = Object.values(onlineUsers).map((v) => ({ userId: v.userId, role: v.role, clientCount: v.clientCount }));
                await pubClient.sendCommand(['PUBLISH', `presence:updates:${sessionId}`, JSON.stringify({ sessionId, summary })]);
                // sync to DB: simple approach - set offline for any DB rows not in summary
                const onlineUserIds = Object.keys(onlineUsers).map((k) => onlineUsers[k].userId);
                // find DB presence rows for this session that are ONLINE but not in onlineUserIds and mark OFFLINE
                try {
                  const rows = await prisma.sessionPresence.findMany({ where: { sessionId, status: 'ONLINE' } });
                  for (const r of rows) {
                    if (!onlineUserIds.includes(r.userId)) {
                      await prisma.sessionPresence.update({ where: { sessionId_userId_role: { sessionId: r.sessionId, userId: r.userId, role: r.role as any } }, data: { status: 'OFFLINE', clientCount: 0 } });
                    }
                  }
                } catch (e) {
                  console.warn('presence DB sync error', e);
                }
              }
            } catch (e) {
              console.warn('presenceCleanup key iteration error', e);
            }
          }
        } while (cursor !== 0);
        await new Promise((r) => setTimeout(r, 10000));
      } catch (e) {
        console.error('presenceCleanup error', e);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  void presenceCleanup();

  return io;
}

export default initSocket;
