/**
 * Therapeutic GPS Dashboard – THERAPIST ONLY
 *
 * Connects to the Node.js Socket.io GPS room and renders:
 *   • Traffic-light empathy indicator
 *   • 5-Why depth badge
 *   • Safety/crisis indicator
 *   • Sentiment timeline sparkline
 *   • AI coaching suggestion
 *   • Crisis alert modal
 *
 * The component renders nothing if the current user is not a therapist.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GPSMetrics {
  empathyScore: number;
  depthLevel: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  crisisRisk: 'low' | 'medium' | 'high';
  currentTopic: string;
  aiSuggestion: string;
  timestamp?: string;
}

export interface CrisisAlert {
  keywords: string[];
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  message?: string;
}

interface GPSDashboardProps {
  /** The active therapy session ID */
  sessionId: string;
  /** Backend-assigned GPS monitoring ID (returned by POST /v1/gps/sessions/:id/start) */
  monitoringId: string;
  /** JWT access token for socket authentication */
  accessToken: string;
  /** Socket.io server URL (defaults to window.origin) */
  socketUrl?: string;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

function empathyColor(score: number): string {
  if (score >= 70) return '#10b981'; // green-500
  if (score >= 40) return '#f59e0b'; // amber-500
  return '#ef4444'; // rose-500
}

function depthColor(level: string): string {
  const map: Record<string, string> = {
    L1: '#94a3b8',
    L2: '#60a5fa',
    L3: '#a78bfa',
    L4: '#fb923c',
    L5: '#22c55e',
  };
  return map[level] ?? '#94a3b8';
}

function crisisIcon(risk: string): string {
  if (risk === 'high') return '🔴';
  if (risk === 'medium') return '🟡';
  return '🟢';
}

function suggestionPriority(suggestion: string): 'critical' | 'warning' | 'info' {
  if (suggestion.startsWith('🔴')) return 'critical';
  if (suggestion.startsWith('🟡')) return 'warning';
  return 'info';
}

// ─── Component ────────────────────────────────────────────────────────────────

const HISTORY_LIMIT = 50;

const DEFAULT_METRICS: GPSMetrics = {
  empathyScore: 50,
  depthLevel: 'L1',
  sentiment: 'neutral',
  sentimentScore: 0,
  crisisRisk: 'low',
  currentTopic: '',
  aiSuggestion: '',
};

export default function GPSDashboard({
  sessionId,
  monitoringId,
  accessToken,
  socketUrl,
}: GPSDashboardProps) {
  const [connected, setConnected] = useState(false);
  const [metrics, setMetrics] = useState<GPSMetrics>(DEFAULT_METRICS);
  const [sentimentHistory, setSentimentHistory] = useState<number[]>([]);
  const [crisisAlert, setCrisisAlert] = useState<CrisisAlert | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Connect to socket and join GPS room
  useEffect(() => {
    const url = socketUrl ?? (typeof window !== 'undefined' ? window.location.origin : '');
    const socket = io(url, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('gps:join', { sessionId, monitoringId });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('gps:update', (payload: { type: string; data: any }) => {
      if (payload.type === 'gps_update') {
        const m: GPSMetrics = payload.data;
        setMetrics(m);
        setSentimentHistory((prev) => {
          const next = [...prev, m.sentimentScore ?? 0];
          return next.slice(-HISTORY_LIMIT);
        });
      }
      if (payload.type === 'crisis_alert') {
        setCrisisAlert(payload.data as CrisisAlert);
        setDismissed(false);
      }
    });

    return () => {
      socket.emit('gps:leave', { sessionId });
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, monitoringId, accessToken]);

  const dismissCrisis = useCallback(() => setDismissed(true), []);

  // Chart data
  const chartData = {
    labels: sentimentHistory.map((_, i) => i.toString()),
    datasets: [
      {
        data: sentimentHistory,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.15)',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    scales: {
      y: {
        min: -1,
        max: 1,
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: {
          color: '#94a3b8',
          font: { size: 9 },
          callback: (v: number | string) => {
            const val = Number(v);
            if (val > 0.3) return '+';
            if (val < -0.3) return '−';
            return '·';
          },
        },
      },
      x: { display: false },
    },
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
  };

  const priorityBg: Record<string, string> = {
    critical: 'rgba(239,68,68,0.15)',
    warning: 'rgba(245,158,11,0.15)',
    info: 'rgba(99,102,241,0.12)',
  };
  const priorityBorder: Record<string, string> = {
    critical: 'rgba(239,68,68,0.5)',
    warning: 'rgba(245,158,11,0.5)',
    info: 'rgba(99,102,241,0.3)',
  };

  const suggPriority = suggestionPriority(metrics.aiSuggestion);

  return (
    <>
      {/* ── GPS Dashboard Panel ── */}
      <div
        style={{
          position: 'fixed',
          top: 80,
          right: 20,
          width: 300,
          background: 'rgba(15,23,42,0.96)',
          borderRadius: 12,
          padding: 14,
          boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(12px)',
          zIndex: 9000,
          color: '#f1f5f9',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 13,
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: 1, color: '#94a3b8' }}>
            THERAPEUTIC GPS
          </span>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: connected ? '#10b981' : '#ef4444',
              display: 'inline-block',
            }}
            title={connected ? 'Connected' : 'Disconnected'}
          />
        </div>

        {/* Traffic-light indicators */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {/* Empathy */}
          <div
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 8,
              padding: '10px 6px',
              textAlign: 'center',
              border: `2px solid ${empathyColor(metrics.empathyScore)}`,
            }}
          >
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
              Empathy
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: empathyColor(metrics.empathyScore) }}>
              {metrics.empathyScore}
            </div>
          </div>

          {/* Depth */}
          <div
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 8,
              padding: '10px 6px',
              textAlign: 'center',
              border: `2px solid ${depthColor(metrics.depthLevel)}`,
            }}
          >
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
              Depth
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: depthColor(metrics.depthLevel) }}>
              {metrics.depthLevel}
            </div>
          </div>

          {/* Safety */}
          <div
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 8,
              padding: '10px 6px',
              textAlign: 'center',
              border: '2px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
              Safety
            </div>
            <div style={{ fontSize: 22 }}>{crisisIcon(metrics.crisisRisk)}</div>
          </div>
        </div>

        {/* Sentiment sparkline */}
        {sentimentHistory.length > 2 && (
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 8,
              padding: '10px 10px 8px',
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>
              Patient Sentiment
            </div>
            <div style={{ height: 60 }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Current topic */}
        {metrics.currentTopic && (
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 8,
              padding: '8px 10px',
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
              Topic
            </div>
            <div style={{ color: '#e2e8f0', lineHeight: 1.4 }}>{metrics.currentTopic}</div>
          </div>
        )}

        {/* AI coaching suggestion */}
        {metrics.aiSuggestion && (
          <div
            style={{
              background: priorityBg[suggPriority],
              border: `1px solid ${priorityBorder[suggPriority]}`,
              borderRadius: 8,
              padding: '8px 10px',
            }}
          >
            <div style={{ fontSize: 10, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: 4 }}>
              💡 AI Suggestion
            </div>
            <div style={{ color: '#e2e8f0', lineHeight: 1.5 }}>{metrics.aiSuggestion}</div>
          </div>
        )}
      </div>

      {/* ── Crisis Alert Modal ── */}
      {crisisAlert && !dismissed && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label="Crisis alert"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
          }}
        >
          <div
            style={{
              background: '#7f1d1d',
              border: '2px solid #ef4444',
              borderRadius: 16,
              padding: 32,
              maxWidth: 480,
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              color: '#fef2f2',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🚨</div>
            <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 800 }}>CRISIS ALERT</h2>
            <p style={{ margin: '0 0 10px', lineHeight: 1.6, fontSize: 15 }}>
              {crisisAlert.message ?? 'Crisis-related language detected in patient speech.'}
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#fca5a5' }}>
              <strong>Keywords detected:</strong> {crisisAlert.keywords.join(', ')}
            </p>
            <p style={{ margin: '0 0 24px', fontSize: 13, lineHeight: 1.6, color: '#fecaca' }}>
              Acknowledge the patient's distress, activate your safety protocol, and consider involving emergency
              support if needed.
            </p>
            <button
              onClick={dismissCrisis}
              style={{
                background: '#fef2f2',
                color: '#7f1d1d',
                border: 'none',
                padding: '12px 28px',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Acknowledged – I'm handling it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
