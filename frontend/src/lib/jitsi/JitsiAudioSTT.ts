/**
 * JitsiAudioSTT
 * ──────────────
 * Captures audio from Jitsi call and sends it to backend for speech-to-text processing.
 * Uses the patient's audio stream from the call (not surrounding environment).
 */

export type TranscriptCallback = (transcript: string, isFinal: boolean) => void;

export class JitsiAudioSTT {
  private sessionId: string;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private buffer: Float32Array[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private callback: TranscriptCallback | null = null;
  private ws: WebSocket | null = null;
  private isRunning = false;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /** Start capturing audio from Jitsi remote track and sending to STT backend. */
  async start(remoteAudioTrack: MediaStreamTrack, callback: TranscriptCallback): Promise<void> {
    if (this.isRunning) {
      console.warn('[JitsiAudioSTT] Already running');
      return;
    }

    this.isRunning = true;
    this.callback = callback;

    try {
      // Create AudioContext for Jitsi audio
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const stream = new MediaStream([remoteAudioTrack]);
      this.source = this.audioContext.createMediaStreamSource(stream);

      // Create ScriptProcessorNode to capture audio
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.processor.onaudioprocess = (event: AudioProcessingEvent) => {
        const inputData = event.inputBuffer.getChannelData(0);
        this.buffer.push(new Float32Array(inputData));
      };

      this.source.connect(this.processor);
      const silentGain = this.audioContext.createGain();
      silentGain.gain.value = 0;
      this.processor.connect(silentGain);
      silentGain.connect(this.audioContext.destination);

      // Connect to WebSocket for STT
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const sttUrl = `${protocol}//${window.location.host}/api/stt/stream`;
      this.ws = new WebSocket(sttUrl);

      this.ws.onopen = () => {
        // Send session metadata
        this.ws?.send(JSON.stringify({ type: 'session', sessionId: this.sessionId }));
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.transcript) {
            this.callback?.(data.transcript, data.isFinal || false);
          }
        } catch (err) {
          console.error('[JitsiAudioSTT] Failed to parse STT response:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.error('[JitsiAudioSTT] WebSocket error:', err);
      };

      // Flush buffer to WebSocket every second
      this.flushTimer = setInterval(() => this._flush(), 1000);
    } catch (err) {
      console.error('[JitsiAudioSTT] Failed to start:', err);
      this.stop();
      this.isRunning = false;
    }
  }

  /** Stop capturing and clean up. */
  stop(): void {
    this.isRunning = false;

    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.buffer = [];
    this.callback = null;
  }

  private _flush(): void {
    if (!this.buffer.length || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Concatenate buffered samples
    const totalLength = this.buffer.reduce((sum, arr) => sum + arr.length, 0);
    const concatenated = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.buffer) {
      concatenated.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert Float32 to base64
    const base64 = this._float32ToBase64(concatenated);
    this.ws.send(JSON.stringify({ type: 'audio', data: base64 }));
    this.buffer = [];
  }

  private _float32ToBase64(float32: Float32Array): string {
    const buffer = new ArrayBuffer(float32.length * 2);
    const view = new Int16Array(buffer);
    for (let i = 0; i < float32.length; i++) {
      view[i] = float32[i] < 0 ? float32[i] * 0x8000 : float32[i] * 0x7fff;
    }
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
