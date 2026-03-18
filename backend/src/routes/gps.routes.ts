// Notify provider of new lab upload
export function notifyProviderLabUpload(providerId: string, payload: any) {
  const io = require('../socket').io;
  const room = `inbox:${providerId}`;
  io.to(room).emit('provider:lab-upload', payload);
  console.log('notifyProviderLabUpload ->', { room, payloadPreview: { documentId: payload.documentId, patientId: payload.patientId, title: payload.title } });
}
/**
 * GPS Meter REST routes
 * POST   /v1/gps/sessions/:sessionId/start    – therapist starts GPS monitoring
 * POST   /v1/gps/sessions/:sessionId/end      – therapist ends GPS monitoring
 * GET    /v1/gps/sessions/:sessionId/status   – current GPS status (therapist)
 * GET    /v1/gps/monitoring/:monitoringId/transcript – full transcript
 * GET    /v1/gps/monitoring/:monitoringId/timeline   – empathy timeline
 * GET    /v1/gps/monitoring/:monitoringId/analytics  – post-session scorecard
 * POST   /v1/gps/monitoring/:monitoringId/suggest/:suggestionId/ack
 * POST   /v1/gps/crisis/:alertId/resolve      – mark crisis alert resolved
 * POST   /v1/gps/internal/push                – Python AI Engine → Socket.io relay
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Server as IOServer } from 'socket.io';
import { requireAuth } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import {
  initSessionMonitoring,
  endSessionMonitoring,
  getMonitoringBySession,
  generateSessionAnalytics,
  getSessionTranscript,
  getEmpathyTimeline,
  getSessionAnalytics,
  saveEmpathySnapshot,
  saveCrisisAlert,
  saveTranscriptSegment,
  acknowledgeCoachingSuggestion,
  resolveCrisisAlert,
  GPSMetrics,
} from '../services/gps-meter.service';
import prisma from '../config/db';

const router = Router();
const db = prisma as any;

// Socket.io instance – injected at startup via setSocketIO()
let _io: IOServer | null = null;
export function setSocketIO(io: IOServer): void {
  _io = io;
}

// Notify patient inbox about a newly created document
export function notifyPatientDocument(patientId: string, payload: Record<string, any>): void {
  try {
    if (!_io) return;
    const room = `inbox:${patientId}`;
    console.log('notifyPatientDocument ->', { room, payloadPreview: { id: payload.id, title: payload.title } });
    _io.to(room).emit('patient:document:new', payload);
  } catch (e) {
    console.warn('notifyPatientDocument failed', e);
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

/** Ensure the requesting user is the therapist for the given session. */
async function assertTherapistOwnsSession(
  req: Request,
  sessionId: string,
): Promise<void> {
  const userId = (req as any).auth?.userId;
  const rows: any[] = await db.$queryRawUnsafe(
    `SELECT therapist_id FROM sessions WHERE id = $1::uuid LIMIT 1`,
    sessionId,
  );
  if (!rows.length) throw new AppError('Session not found', 404);
  if (rows[0].therapist_id !== userId) throw new AppError('Forbidden', 403);
}

// ── POST /sessions/:sessionId/start ──────────────────────────────────────────

router.post('/sessions/:sessionId/start', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = String(req.params.sessionId);
    await assertTherapistOwnsSession(req, sessionId);

    const sessionRows: any[] = await db.$queryRawUnsafe(
      `SELECT therapist_id, patient_id FROM sessions WHERE id = $1::uuid LIMIT 1`,
      sessionId,
    );
    const { therapist_id, patient_id } = sessionRows[0];

    const monitoringId = await initSessionMonitoring(sessionId, therapist_id, patient_id);
    res.status(201).json({ monitoringId });
  } catch (err) {
    next(err);
  }
});

// ── POST /sessions/:sessionId/end ─────────────────────────────────────────────

router.post('/sessions/:sessionId/end', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = String(req.params.sessionId);
    await assertTherapistOwnsSession(req, sessionId);

    const monitoring = await getMonitoringBySession(sessionId);
    if (!monitoring) throw new AppError('No active GPS session found', 404);

    await endSessionMonitoring(monitoring.id);
    const analytics = await generateSessionAnalytics(monitoring.id);

    res.json({ message: 'GPS session ended', analytics });
  } catch (err) {
    next(err);
  }
});

// ── GET /sessions/:sessionId/status ──────────────────────────────────────────

router.get('/sessions/:sessionId/status', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = String(req.params.sessionId);
    await assertTherapistOwnsSession(req, sessionId);

    const monitoring = await getMonitoringBySession(sessionId);
    if (!monitoring) throw new AppError('No active GPS monitoring found', 404);

    res.json({
      monitoringId: monitoring.id,
      status: monitoring.status,
      latestEmpathyScore: monitoring.latest_empathy_score,
      latestDepthLevel: monitoring.latest_depth_level,
      latestCrisisRisk: monitoring.latest_crisis_risk,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /monitoring/:monitoringId/transcript ──────────────────────────────────

router.get('/monitoring/:monitoringId/transcript', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const monitoringId = String(req.params.monitoringId);
    const rows = await getSessionTranscript(monitoringId);
    res.json({ transcript: rows });
  } catch (err) {
    next(err);
  }
});

// ── GET /monitoring/:monitoringId/timeline ────────────────────────────────────

router.get('/monitoring/:monitoringId/timeline', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const monitoringId = String(req.params.monitoringId);
    const timeline = await getEmpathyTimeline(monitoringId);
    res.json({ timeline });
  } catch (err) {
    next(err);
  }
});

// ── GET /monitoring/:monitoringId/analytics ───────────────────────────────────

router.get('/monitoring/:monitoringId/analytics', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const monitoringId = String(req.params.monitoringId);
    const analytics = await getSessionAnalytics(monitoringId);
    if (!analytics) throw new AppError('Analytics not yet generated', 404);
    res.json(analytics);
  } catch (err) {
    next(err);
  }
});

// ── POST /monitoring/:monitoringId/suggest/ack ────────────────────────────────

router.post('/monitoring/:monitoringId/suggest/:suggestionId/ack', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const suggestionId = String(req.params.suggestionId);
    await acknowledgeCoachingSuggestion(suggestionId);
    res.json({ acknowledged: true });
  } catch (err) {
    next(err);
  }
});

// ── POST /crisis/:alertId/resolve ─────────────────────────────────────────────

router.post('/crisis/:alertId/resolve', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alertId = String(req.params.alertId);
    const { note } = req.body as { note?: string };
    await resolveCrisisAlert(alertId, note);
    res.json({ resolved: true });
  } catch (err) {
    next(err);
  }
});

// ── POST /internal/push ───────────────────────────────────────────────────────
// Called by the Python AI Engine to push GPS metrics into the Socket.io layer.
// Protected by a shared secret (AI_ENGINE_SECRET env var).

router.post('/internal/push', (req: Request, res: Response, next: NextFunction) => {
  try {
    const secret = process.env.AI_ENGINE_SECRET;
    const authHeader = req.headers['x-ai-engine-secret'];
    if (secret && authHeader !== secret) {
      throw new AppError('Forbidden', 403);
    }

    const { sessionId, monitoringId, type, data } = req.body as {
      sessionId: string;
      monitoringId: string;
      type: 'gps_update' | 'crisis_alert';
      data: any;
    };

    if (!sessionId || !type || !data) {
      throw new AppError('sessionId, type and data are required', 400);
    }

    // Persist to DB asynchronously (fire-and-forget – errors are logged, not surfaced)
    if (type === 'gps_update' && monitoringId) {
      const metrics: GPSMetrics = data;
      saveEmpathySnapshot(monitoringId, metrics).catch((e) =>
        console.error('[gps:internal/push] saveEmpathySnapshot error', e),
      );
      if (metrics.transcriptSnippet) {
        saveTranscriptSegment(monitoringId, 'patient', metrics.transcriptSnippet, metrics.sentimentScore).catch(
          (e) => console.error('[gps:internal/push] saveTranscript error', e),
        );
      }
    }

    if (type === 'crisis_alert' && monitoringId) {
      saveCrisisAlert(monitoringId, {
        keywords: data.keywords ?? [],
        severity: data.severity ?? 'medium',
        confidence: data.confidence ?? 0.95,
        message: data.message,
      }).catch((e) => console.error('[gps:internal/push] saveCrisisAlert error', e));
    }

    // Broadcast to therapist via Socket.io
    if (_io) {
      _io.to(`gps:${sessionId}`).emit('gps:update', {
        type,
        data,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ pushed: true });
  } catch (err) {
    next(err);
  }
});

export default router;
