/**
 * GPS Meter Service
 * ─────────────────
 * Manages the lifecycle of a Therapeutic GPS session from the Node.js side:
 *   • Initialise / end session monitoring records
 *   • Persist empathy snapshots & transcript segments
 *   • Log crisis alerts & coaching suggestions
 *   • Generate post-session analytics
 *
 * The heavy AI processing runs in the Python AI Engine (websocket_server.py).
 * This service acts as the persistence + orchestration layer.
 */

import { randomUUID } from 'crypto';
import prisma from '../config/db';

const db = prisma as any;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GPSMetrics {
  empathyScore: number;
  therapistTone?: number;
  patientSentiment?: number;
  emotionalResonance?: number;
  depthLevel: string;
  crisisRisk: string;
  aiSuggestion?: string;
  reasoning?: string;
  transcriptSnippet?: string;
  sentiment?: string;
  sentimentScore?: number;
  currentTopic?: string;
}

export interface CrisisAlertPayload {
  keywords: string[];
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  message?: string;
}

export interface TrafficLight {
  color: 'green' | 'yellow' | 'red';
  label: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function empathyToTrafficLight(score: number, crisisRisk: string): TrafficLight {
  if (crisisRisk === 'high' || score < 40) {
    return { color: 'red', label: 'Critical – immediate attention needed' };
  }
  if (score < 70) {
    return { color: 'yellow', label: 'Attention – adjust approach' };
  }
  return { color: 'green', label: 'Optimal therapeutic engagement' };
}

// ─── Session Monitoring ───────────────────────────────────────────────────────

export async function initSessionMonitoring(
  sessionId: string,
  therapistId: string,
  patientId: string,
): Promise<string> {
  const monitoringId = randomUUID();
  await db.$executeRawUnsafe(
    `INSERT INTO session_monitoring (id, session_id, therapist_id, patient_id, status)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'active')
     ON CONFLICT DO NOTHING`,
    monitoringId, sessionId, therapistId, patientId,
  );
  return monitoringId;
}

export async function endSessionMonitoring(monitoringId: string): Promise<void> {
  await db.$executeRawUnsafe(
    `UPDATE session_monitoring
        SET status = 'ended', ended_at = NOW()
      WHERE id = $1::uuid`,
    monitoringId,
  );
}

export async function getMonitoringBySession(sessionId: string): Promise<any | null> {
  const rows = await db.$queryRawUnsafe(
    `SELECT * FROM session_monitoring
      WHERE session_id = $1::uuid
        AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1`,
    sessionId,
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

// ─── Empathy Snapshots ────────────────────────────────────────────────────────

export async function saveEmpathySnapshot(
  monitoringId: string,
  metrics: GPSMetrics,
): Promise<void> {
  const tl = empathyToTrafficLight(metrics.empathyScore, metrics.crisisRisk);

  await db.$executeRawUnsafe(
    `INSERT INTO empathy_snapshots
       (monitoring_id, empathy_score, therapist_tone, patient_sentiment,
        emotional_resonance, depth_level, crisis_risk, traffic_light,
        ai_suggestion, reasoning)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    monitoringId,
    metrics.empathyScore,
    metrics.therapistTone ?? null,
    metrics.patientSentiment ?? null,
    metrics.emotionalResonance ?? null,
    metrics.depthLevel,
    metrics.crisisRisk,
    tl.color,
    metrics.aiSuggestion ?? null,
    metrics.reasoning ?? null,
  );

  // Keep the session_monitoring row up-to-date for quick reads
  await db.$executeRawUnsafe(
    `UPDATE session_monitoring
        SET latest_empathy_score = $2,
            latest_depth_level   = $3,
            latest_crisis_risk   = $4
      WHERE id = $1::uuid`,
    monitoringId,
    metrics.empathyScore,
    metrics.depthLevel,
    metrics.crisisRisk,
  );
}

// ─── Transcript ───────────────────────────────────────────────────────────────

export async function saveTranscriptSegment(
  monitoringId: string,
  speaker: 'therapist' | 'patient',
  text: string,
  sentimentScore?: number,
): Promise<void> {
  const wordCount = text.trim().split(/\s+/).length;
  await db.$executeRawUnsafe(
    `INSERT INTO session_transcripts
       (monitoring_id, speaker, text, sentiment_score, word_count)
     VALUES ($1::uuid, $2, $3, $4, $5)`,
    monitoringId, speaker, text, sentimentScore ?? null, wordCount,
  );
}

// ─── Crisis Alerts ────────────────────────────────────────────────────────────

export async function saveCrisisAlert(
  monitoringId: string,
  alert: CrisisAlertPayload,
): Promise<string> {
  const alertId = randomUUID();
  await db.$executeRawUnsafe(
    `INSERT INTO crisis_alerts
       (id, monitoring_id, keywords, severity, confidence)
     VALUES ($1::uuid, $2::uuid, $3::text[], $4, $5)`,
    alertId,
    monitoringId,
    alert.keywords,
    alert.severity,
    alert.confidence,
  );
  return alertId;
}

export async function resolveCrisisAlert(alertId: string, note?: string): Promise<void> {
  await db.$executeRawUnsafe(
    `UPDATE crisis_alerts
        SET resolved = TRUE, resolved_at = NOW(), resolution_note = $2
      WHERE id = $1::uuid`,
    alertId, note ?? null,
  );
}

// ─── Coaching Suggestions ─────────────────────────────────────────────────────

export async function saveCoachingSuggestion(
  monitoringId: string,
  message: string,
  priority: 'info' | 'warning' | 'critical' = 'info',
  triggerReason?: string,
): Promise<void> {
  await db.$executeRawUnsafe(
    `INSERT INTO coaching_suggestions
       (monitoring_id, message, priority, trigger_reason)
     VALUES ($1::uuid, $2, $3, $4)`,
    monitoringId, message, priority, triggerReason ?? null,
  );
}

export async function acknowledgeCoachingSuggestion(suggestionId: string): Promise<void> {
  await db.$executeRawUnsafe(
    `UPDATE coaching_suggestions
        SET acknowledged = TRUE, acknowledged_at = NOW()
      WHERE id = $1::uuid`,
    suggestionId,
  );
}

// ─── Post-Session Analytics ───────────────────────────────────────────────────

export async function generateSessionAnalytics(monitoringId: string): Promise<any> {
  // Aggregate empathy snapshots
  const snapshots: any[] = await db.$queryRawUnsafe(
    `SELECT empathy_score, traffic_light, depth_level
       FROM empathy_snapshots
      WHERE monitoring_id = $1::uuid
      ORDER BY snapshot_at`,
    monitoringId,
  );

  if (snapshots.length === 0) return null;

  const total = snapshots.length;
  const avgEmpathy =
    Math.round(snapshots.reduce((s: number, r: any) => s + Number(r.empathy_score), 0) / total);
  const greenPct = Math.round((snapshots.filter((r: any) => r.traffic_light === 'green').length / total) * 100);
  const yellowPct = Math.round((snapshots.filter((r: any) => r.traffic_light === 'yellow').length / total) * 100);
  const redPct = 100 - greenPct - yellowPct;

  // Transcript word counts
  const transcriptStats: any[] = await db.$queryRawUnsafe(
    `SELECT speaker, SUM(word_count) AS words
       FROM session_transcripts
      WHERE monitoring_id = $1::uuid
      GROUP BY speaker`,
    monitoringId,
  );

  let therapistWords = 0;
  let patientWords = 0;
  for (const row of transcriptStats) {
    if (row.speaker === 'therapist') therapistWords = Number(row.words);
    if (row.speaker === 'patient') patientWords = Number(row.words);
  }
  const totalWords = therapistWords + patientWords;
  const therapistPct = totalWords > 0 ? Math.round((therapistWords / totalWords) * 100) : 0;
  const patientPct = 100 - therapistPct;

  // Crisis count
  const crisisRows: any[] = await db.$queryRawUnsafe(
    `SELECT COUNT(*) AS cnt FROM crisis_alerts WHERE monitoring_id = $1::uuid`,
    monitoringId,
  );
  const crisisCount = Number(crisisRows[0]?.cnt ?? 0);

  const analyticsId = randomUUID();
  await db.$executeRawUnsafe(
    `INSERT INTO session_analytics
       (id, monitoring_id, avg_empathy_score,
        pct_time_green, pct_time_yellow, pct_time_red,
        therapist_talk_pct, patient_talk_pct,
        total_words, crisis_count)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (monitoring_id) DO UPDATE SET
       avg_empathy_score = EXCLUDED.avg_empathy_score,
       pct_time_green    = EXCLUDED.pct_time_green,
       pct_time_yellow   = EXCLUDED.pct_time_yellow,
       pct_time_red      = EXCLUDED.pct_time_red,
       therapist_talk_pct = EXCLUDED.therapist_talk_pct,
       patient_talk_pct  = EXCLUDED.patient_talk_pct,
       total_words       = EXCLUDED.total_words,
       crisis_count      = EXCLUDED.crisis_count`,
    analyticsId, monitoringId, avgEmpathy,
    greenPct, yellowPct, redPct,
    therapistPct, patientPct,
    totalWords, crisisCount,
  );

  return {
    monitoringId,
    avgEmpathy,
    trafficLightDistribution: { green: greenPct, yellow: yellowPct, red: redPct },
    conversationBalance: { therapistPct, patientPct, totalWords },
    crisisCount,
  };
}

// ─── Read endpoints ───────────────────────────────────────────────────────────

export async function getSessionTranscript(monitoringId: string): Promise<any[]> {
  return db.$queryRawUnsafe(
    `SELECT speaker, text, spoken_at, sentiment_score
       FROM session_transcripts
      WHERE monitoring_id = $1::uuid
      ORDER BY spoken_at`,
    monitoringId,
  );
}

export async function getEmpathyTimeline(monitoringId: string): Promise<any[]> {
  return db.$queryRawUnsafe(
    `SELECT snapshot_at, empathy_score, traffic_light, depth_level, crisis_risk
       FROM empathy_snapshots
      WHERE monitoring_id = $1::uuid
      ORDER BY snapshot_at`,
    monitoringId,
  );
}

export async function getSessionAnalytics(monitoringId: string): Promise<any | null> {
  const rows: any[] = await db.$queryRawUnsafe(
    `SELECT * FROM session_analytics WHERE monitoring_id = $1::uuid LIMIT 1`,
    monitoringId,
  );
  return rows.length > 0 ? rows[0] : null;
}
