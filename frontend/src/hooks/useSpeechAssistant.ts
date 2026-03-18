import { useEffect, useRef, useState } from 'react';

type SpeechResultHandler = (transcript: string) => void;

type ListenOptions = {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  silenceMs?: number;
  onSpeechStart?: () => void;
};

type SpeakOptions = {
  lang?: string;
  preferIndianVoice?: boolean;
  voiceName?: string;
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
};

const INDIAN_VOICE_PATTERN = /(india|indian|en-in|hi-in|ta-in|te-in|kn-in|ml-in|mr-in)/i;
const MIC_ACCESS_PAUSED = false; // ← FIXED: was `true`, which disabled mic entirely

export const useSpeechAssistant = () => {
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const supportsSpeechRecognition =
    !MIC_ACCESS_PAUSED &&
    typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const supportsSpeechSynthesis =
    typeof window !== 'undefined' &&
    Boolean((window as any).speechSynthesis);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const startListening = (onResult: SpeechResultHandler, langOrOptions: string | ListenOptions = 'en-IN', maybeOptions: ListenOptions = {}) => {
    if (MIC_ACCESS_PAUSED) return;
    if (!supportsSpeechRecognition || isListening) return;

    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const options: ListenOptions = typeof langOrOptions === 'string'
      ? { ...maybeOptions, lang: langOrOptions }
      : langOrOptions;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = options.lang || 'en-IN';
    recognition.continuous = Boolean(options.continuous);
    recognition.interimResults = Boolean(options.interimResults);

    let hasDetectedSpeech = false;

    const armSilenceTimer = () => {
      const silenceMs = Number(options.silenceMs || 0);
      if (!silenceMs || silenceMs < 200) return;
      clearSilenceTimer();
      silenceTimerRef.current = window.setTimeout(() => {
        try {
          recognition.stop();
        } catch {
          // no-op
        }
      }, silenceMs);
    };

    recognition.onstart = () => {
      setIsListening(true);
      armSilenceTimer();
    };
    recognition.onend = () => {
      clearSilenceTimer();
      setIsListening(false);
    };
    recognition.onerror = () => {
      clearSilenceTimer();
      setIsListening(false);
    };
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = String(result?.[0]?.transcript || '').trim();
        if (!text) continue;
        if (result?.isFinal) {
          finalTranscript = `${finalTranscript} ${text}`.trim();
        } else {
          interimTranscript = `${interimTranscript} ${text}`.trim();
        }
      }

      const transcript = `${finalTranscript} ${interimTranscript}`.trim();
      if (!transcript) return;
      if (!hasDetectedSpeech) {
        hasDetectedSpeech = true;
        options.onSpeechStart?.();
      }
      armSilenceTimer();
      onResult(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    try {
      clearSilenceTimer();
      recognitionRef.current?.stop?.();
    } finally {
      setIsListening(false);
    }
  };

  const resolveVoice = (options: SpeakOptions): SpeechSynthesisVoice | null => {
    if (!availableVoices.length) return null;

    if (options.voiceName) {
      const exact = availableVoices.find((voice) => voice.name === options.voiceName);
      if (exact) return exact;
    }

    const lang = options.lang || 'en-IN';
    const langMatches = availableVoices.filter((voice) =>
      String(voice.lang || '').toLowerCase().startsWith(String(lang).toLowerCase().split('-')[0]),
    );

    if (options.preferIndianVoice) {
      const indianMatch = [...langMatches, ...availableVoices].find((voice) =>
        INDIAN_VOICE_PATTERN.test(`${voice.name} ${voice.lang}`),
      );
      if (indianMatch) return indianMatch;
    }

    return langMatches[0] || availableVoices[0] || null;
  };

  const speak = (text: string, options: SpeakOptions = {}) => {
    if (!supportsSpeechSynthesis) return;
    const message = String(text || '').trim();
    if (!message) return;

    const synth = (window as any).speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = options.lang || 'en-IN';
    utterance.rate = Number(options.rate || 1);
    utterance.pitch = Number(options.pitch || 1);

    const voice = resolveVoice(options);
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      options.onEnd?.();
    };
    utterance.onerror = () => {
      options.onEnd?.();
    };

    synth.speak(utterance);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).speechSynthesis) {
      const synth = (window as any).speechSynthesis;
      const updateVoices = () => {
        const voices = synth.getVoices?.() || [];
        setAvailableVoices(Array.isArray(voices) ? voices : []);
      };

      updateVoices();
      synth.addEventListener?.('voiceschanged', updateVoices);

      return () => {
        synth.removeEventListener?.('voiceschanged', updateVoices);
        try {
          clearSilenceTimer();
          recognitionRef.current?.stop?.();
        } catch {
          // no-op
        }
        synth.cancel();
      };
    }

    return () => {
      try {
        clearSilenceTimer();
        recognitionRef.current?.stop?.();
      } catch {
        // no-op
      }
      if (typeof window !== 'undefined' && (window as any).speechSynthesis) {
        (window as any).speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    supportsSpeechRecognition,
    supportsSpeechSynthesis,
    availableVoices,
    isListening,
    startListening,
    stopListening,
    speak,
  };
};

export default useSpeechAssistant;