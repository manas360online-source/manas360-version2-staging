/**
 * JitsiSessionManager
 * ────────────────────
 * Manages the Jitsi Meet iframe embed and wires it to the AI Engine for
 * therapist-only GPS monitoring.
 *
 * Responsibilities:
 *   • Embed Jitsi Meet in a container div via the Jitsi External API
 *   • Detect the patient's remote audio track (therapist view)
 *   • Feed that track to AudioExtractor → AIEngineClient
 *   • Clean up on destroy
 *
 * The External API script must be loaded before this class is used.
 * Add the following to your page (or load dynamically):
 *   <script src="https://meet.jit.si/external_api.js" />  (for JaaS)
 * or
 *   <script src="https://your-jitsi-server/external_api.js" />
 *
 * For maximum future-compatibility, audio capture is optional:
 * if the browser blocks AudioContext or the track isn't available,
 * the session continues without AI analysis.
 */

import { AudioExtractor } from './AudioExtractor';
import { AIEngineClient } from './AIEngineClient';

interface JitsiOptions {
  roomName: string;
  parentNode: HTMLElement;
  userInfo?: { displayName?: string; email?: string };
  configOverwrite?: Record<string, unknown>;
  interfaceConfigOverwrite?: Record<string, unknown>;
  jwt?: string;
  width?: string | number;
  height?: string | number;
}

interface JitsiAPI {
  addEventListeners(listeners: Record<string, (event: unknown) => void>): void;
  executeCommand(command: string, ...args: unknown[]): void;
  getParticipantsInfo(): Array<{ displayName: string; participantId: string }>;
  dispose(): void;
}

export interface JitsiSessionManagerOptions {
  /** Jitsi server domain, e.g. "meet.jit.si" or "jitsi.manas360.com" */
  domain: string;
  /** Jitsi room name / meeting ID */
  roomName: string;
  /** DOM element to embed the iframe into */
  container: HTMLElement;
  /** Jitsi JWT token (if using secured rooms) */
  jitsiJwt?: string;
  /** Display name shown in the meeting */
  displayName?: string;
  /** Whether the current user is the therapist */
  isTherapist: boolean;
  /** Manas360 session ID (for GPS monitoring) */
  sessionId: string;
  /** Manas360 GPS monitoring ID */
  monitoringId?: string;
  /** AI Engine WebSocket URL */
  aiEngineUrl?: string;
  /** Callbacks */
  onGPSUpdate?: (metrics: Record<string, unknown>) => void;
  onTranscriptUpdate?: (transcript: Record<string, unknown>) => void;
  onCrisisAlert?: (alert: Record<string, unknown>) => void;
  onConnectionState?: (connected: boolean) => void;
}

export class JitsiSessionManager {
  private api: JitsiAPI | null = null;
  private audioExtractor: AudioExtractor | null = null;
  private aiClient: AIEngineClient | null = null;
  private readonly opts: JitsiSessionManagerOptions;

  constructor(opts: JitsiSessionManagerOptions) {
    this.opts = opts;
  }

  /** Mount the Jitsi iframe and set up AI Engine connection (therapist only). */
  async init(): Promise<void> {
    const jitsiCtor = (window as unknown as {
      JitsiMeetExternalAPI?: new (domain: string, options: JitsiOptions) => JitsiAPI;
    }).JitsiMeetExternalAPI;

    if (!jitsiCtor) {
      throw new Error(
        'JitsiMeetExternalAPI not loaded. ' +
        'Add <script src="https://your-jitsi-domain/external_api.js"> to your page.',
      );
    }

    const { domain, roomName, container, jitsiJwt, displayName, isTherapist } = this.opts;

    this.api = new jitsiCtor(domain, {
      roomName,
      parentNode: container,
      userInfo: displayName ? { displayName } : undefined,
      jwt: jitsiJwt,
      width: '100%',
      height: '100%',
      configOverwrite: {
        prejoinPageEnabled: false,
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        disableDeepLinking: true,
        disableAudioOutputSelect: true,
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup', 'fullscreen'],
      },
    });

    if (isTherapist) {
      this._initAIEngine();
      this._listenForPatientTrack();
    }

    this.api.addEventListeners({
      videoConferenceLeft: () => this.destroy(),
    });
  }

  /** Tear down the Jitsi embed and AI Engine connection. */
  destroy(): void {
    this.audioExtractor?.stop();
    this.audioExtractor = null;
    this.aiClient?.disconnect();
    this.aiClient = null;
    try {
      this.api?.dispose();
    } catch {
      // ignore dispose errors from stale/previously destroyed iframe instances
    }
    this.api = null;
  }

  /** Returns the active Jitsi External API instance (if initialized). */
  getApi(): JitsiAPI | null {
    return this.api;
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private _initAIEngine(): void {
    const { sessionId, aiEngineUrl, onGPSUpdate, onTranscriptUpdate, onCrisisAlert, onConnectionState } = this.opts;

    if (!aiEngineUrl) return;

    this.aiClient = new AIEngineClient({
      url: aiEngineUrl,
      sessionId,
      userRole: 'therapist',
    });

    if (onGPSUpdate) this.aiClient.onGPSUpdate(onGPSUpdate);
    if (onTranscriptUpdate) this.aiClient.onTranscriptUpdate(onTranscriptUpdate);
    if (onCrisisAlert) this.aiClient.onCrisisAlert(onCrisisAlert);
    if (onConnectionState) this.aiClient.onConnectionState(onConnectionState);

    this.aiClient.connect();
  }

  /**
   * Listen for a participant audio track from the Jitsi External API.
   * Jitsi fires `track` events with the track type and a `JitsiTrack` object.
   * We intercept the first REMOTE AUDIO track (which belongs to the patient
   * in a 1:1 session) and hand it to AudioExtractor.
   */
  private _listenForPatientTrack(): void {
    if (!this.api) return;

    this.api.addEventListeners({
      // `trackAdded` is a custom Jitsi External API event name
      // (available in self-hosted Jitsi or via IFrame API "participantTrackAdded")
      trackAdded: (event: unknown) => {
        const e = event as { track?: { isLocal?: () => boolean; getType?: () => string; getOriginalStream?: () => MediaStream } };
        if (!e.track) return;
        if (e.track.isLocal?.()) return; // skip own track
        if (e.track.getType?.() !== 'audio') return;

        const stream = e.track.getOriginalStream?.();
        if (!stream) return;
        const tracks = stream.getAudioTracks();
        if (!tracks.length) return;

        const patientTrack = tracks[0];
        this.audioExtractor = new AudioExtractor(patientTrack);
        this.audioExtractor.start((chunk) => {
          this.aiClient?.sendAudioChunk(chunk);
        });
      },

      trackRemoved: (event: unknown) => {
        const e = event as { track?: { isLocal?: () => boolean; getType?: () => string } };
        if (e.track?.getType?.() === 'audio' && !e.track.isLocal?.()) {
          this.audioExtractor?.stop();
          this.audioExtractor = null;
        }
      },
    });
  }
}
