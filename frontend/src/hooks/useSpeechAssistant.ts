import { useEffect, useRef, useState } from 'react';

type SpeechResultHandler = (transcript: string) => void;

type SpeakOptions = {
  lang?: string;
  preferIndianVoice?: boolean;
  voiceName?: string;
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
};

const INDIAN_VOICE_PATTERN = /(india|indian|en-in|hi-in|ta-in|te-in|kn-in|ml-in|mr-in)/i;

export const useSpeechAssistant = () => {
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const supportsSpeechRecognition =
    typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const supportsSpeechSynthesis =
    typeof window !== 'undefined' &&
    Boolean((window as any).speechSynthesis);

  const startListening = (onResult: SpeechResultHandler, lang = 'en-IN') => {
    if (!supportsSpeechRecognition || isListening) return;

    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results || [])
        .map((result: any) => result?.[0]?.transcript || '')
        .join(' ')
        .trim();
      if (transcript) onResult(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    try {
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
          recognitionRef.current?.stop?.();
        } catch {
          // no-op
        }
        synth.cancel();
      };
    }

    return () => {
      try {
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
