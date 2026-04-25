/**
 * AIEngineClient
 * ──────────────
 * WebSocket client that connects the therapist's browser to the Python AI
 * Engine WebSocket server (ws[s]://host:8765).
 *
 * Responsibilities:
 *   • Establish + re-establish the WebSocket connection
 *   • Send `init` on connect with sessionId / userRole
 *   • Stream Base64 audio chunks via `audio_chunk` messages
 *   • Surface GPS updates / crisis alerts through typed callbacks
 *
 * This class is used by JitsiSessionManager on the therapist side
 * to pipe patient audio to the AI Engine.
 */

export type GPSUpdateCallback = (metrics: Record<string, unknown>) => void;
export type CrisisAlertCallback = (alert: Record<string, unknown>) => void;
export type TranscriptUpdateCallback = (transcript: Record<string, unknown>) => void;
export type ConnectionStateCallback = (connected: boolean) => void;

interface AIEngineClientOptions {
  /** Full WebSocket URL, e.g. wss://api.manas360.com/ai-engine */
  url: string;
  sessionId: string;
  userRole: 'therapist' | 'patient';
  /** Reconnect delay in ms (default: 5000) */
  reconnectDelayMs?: number;
  /** Max reconnect attempts, 0 = unlimited (default: 0) */
  maxReconnects?: number;
}

export class AIEngineClient {
  private readonly opts: Required<AIEngineClientOptions>;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  private _onGPSUpdate: GPSUpdateCallback | null = null;
  private _onCrisisAlert: CrisisAlertCallback | null = null;
  private _onTranscriptUpdate: TranscriptUpdateCallback | null = null;
  private _onConnectionState: ConnectionStateCallback | null = null;

  constructor(options: AIEngineClientOptions) {
    this.opts = {
      reconnectDelayMs: 5000,
      maxReconnects: 0,
      ...options,
    };
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /** Register a GPS update callback. */
  onGPSUpdate(cb: GPSUpdateCallback): this {
    this._onGPSUpdate = cb;
    return this;
  }

  /** Register a crisis alert callback. */
  onCrisisAlert(cb: CrisisAlertCallback): this {
    this._onCrisisAlert = cb;
    return this;
  }

  /** Register a transcript update callback. */
  onTranscriptUpdate(cb: TranscriptUpdateCallback): this {
    this._onTranscriptUpdate = cb;
    return this;
  }

  /** Register a connection state callback. */
  onConnectionState(cb: ConnectionStateCallback): this {
    this._onConnectionState = cb;
    return this;
  }

  /** Connect to the AI Engine WebSocket server. */
  connect(): void {
    this.stopped = false;
    this._openSocket();
  }

  /** Send a Base64-encoded audio chunk to the AI Engine. */
  sendAudioChunk(base64Audio: string): void {
    this._send({
      type: 'audio_chunk',
      sessionId: this.opts.sessionId,
      timestamp: Date.now(),
      audio: base64Audio,
    });
  }

  /** Gracefully disconnect. No reconnect will be attempted. */
  disconnect(): void {
    this.stopped = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private _openSocket(): void {
    try {
      this.ws = new WebSocket(this.opts.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this._onConnectionState?.(true);
        this._send({
          type: 'init',
          sessionId: this.opts.sessionId,
          userRole: this.opts.userRole,
        });
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as Record<string, unknown>;
          this._handleMessage(data);
        } catch (e) {
          console.warn('[AIEngineClient] Failed to parse message:', e);
        }
      };

      this.ws.onerror = (event) => {
        console.warn('[AIEngineClient] WebSocket error', event);
      };

      this.ws.onclose = (event) => {
        this.ws = null;
        this._onConnectionState?.(false);
        if (!this.stopped) {
          this._scheduleReconnect();
        }
        if (event.code !== 1000) {
          console.warn('[AIEngineClient] Closed with code', event.code, event.reason);
        }
      };
    } catch (err) {
      console.error('[AIEngineClient] Failed to create WebSocket:', err);
      this._scheduleReconnect();
    }
  }

  private _handleMessage(data: Record<string, unknown>): void {
    const type = data['type'] as string;
    switch (type) {
      case 'gps_update':
        this._onGPSUpdate?.(data['metrics'] as Record<string, unknown>);
        break;
      case 'crisis_alert':
        this._onCrisisAlert?.(data['alert'] as Record<string, unknown>);
        break;
      case 'transcript_update':
        this._onTranscriptUpdate?.(data['transcript'] as Record<string, unknown>);
        break;
      case 'pong':
        // heartbeat – no-op
        break;
      case 'error':
        console.error('[AIEngineClient] Server error:', data['message']);
        break;
      default:
        // unknown message type – silently ignore
        break;
    }
  }

  private _send(payload: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private _scheduleReconnect(): void {
    const { maxReconnects, reconnectDelayMs } = this.opts;
    if (maxReconnects > 0 && this.reconnectAttempts >= maxReconnects) {
      console.warn('[AIEngineClient] Max reconnect attempts reached – giving up');
      return;
    }
    this.reconnectAttempts += 1;
    const delay = Math.min(reconnectDelayMs * this.reconnectAttempts, 30_000);
    this.reconnectTimer = setTimeout(() => {
      if (!this.stopped) this._openSocket();
    }, delay);
  }
}
