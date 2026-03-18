/**
 * AudioExtractor
 * ──────────────
 * Taps into a patient's MediaStreamTrack (obtained from the Jitsi
 * remote participant) and streams Base64-encoded Float32 PCM chunks
 * to a caller-supplied callback at a configurable interval.
 *
 * Usage:
 *   const extractor = new AudioExtractor(patientAudioTrack);
 *   extractor.start((chunk) => aiClient.sendAudioChunk(chunk));
 *   // later:
 *   extractor.stop();
 */

const SCRIPT_PROCESSOR_BUFFER = 4096; // samples per channel
const DEFAULT_FLUSH_MS = 1000;        // batch and send every 1 second

export type AudioChunkCallback = (base64Chunk: string) => void;

export class AudioExtractor {
  private readonly track: MediaStreamTrack;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  // ScriptProcessorNode is deprecated but universally supported across all Jitsi-compatible browsers
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  private processor: ScriptProcessorNode | null = null;
  private buffer: Float32Array[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private callback: AudioChunkCallback | null = null;
  private readonly flushMs: number;

  constructor(track: MediaStreamTrack, flushMs = DEFAULT_FLUSH_MS) {
    this.track = track;
    this.flushMs = flushMs;
  }

  /** Start capturing audio and invoking `callback` with Base64 chunks. */
  start(callback: AudioChunkCallback): void {
    if (this.audioContext) {
      console.warn('[AudioExtractor] Already running');
      return;
    }

    this.callback = callback;

    try {
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const stream = new MediaStream([this.track]);
      this.source = this.audioContext.createMediaStreamSource(stream);

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore – ScriptProcessorNode is legacy but widely supported
      this.processor = this.audioContext.createScriptProcessor(SCRIPT_PROCESSOR_BUFFER, 1, 1);

      this.processor.onaudioprocess = (event: AudioProcessingEvent) => {
        const inputData = event.inputBuffer.getChannelData(0);
        // Clone into a new Float32Array to avoid re-use of the buffer
        this.buffer.push(new Float32Array(inputData));
      };

      this.source.connect(this.processor);
      // Connect to destination so the graph runs (audio is not played – volume = 0)
      const silentGain = this.audioContext.createGain();
      silentGain.gain.value = 0;
      this.processor.connect(silentGain);
      silentGain.connect(this.audioContext.destination);

      // Flush buffer at regular interval
      this.flushTimer = setInterval(() => this._flush(), this.flushMs);
    } catch (err) {
      console.error('[AudioExtractor] Failed to start:', err);
      this.stop();
    }
  }

  /** Stop capturing and clean up Web Audio resources. */
  stop(): void {
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
    this.buffer = [];
    this.callback = null;
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private _flush(): void {
    if (!this.buffer.length || !this.callback) return;

    const chunks = this.buffer.splice(0);
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    const base64 = AudioExtractor._float32ToBase64(combined);
    this.callback(base64);
  }

  /** Encode a Float32Array as a Base64 string. */
  private static _float32ToBase64(float32: Float32Array): string {
    const bytes = new Uint8Array(float32.buffer);
    let binary = '';
    const chunkSize = 0x8000; // avoid call stack limits for large arrays
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }
}
