import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Web Speech API Type Definitions
 */
type SpeechRecognitionResultLike = {
  0: { transcript: string };
  isFinal: boolean;
};

type SpeechRecognitionEventLike = {
  results: SpeechRecognitionResultLike[];
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

/**
 * Props for VoiceInputComponent
 */
export type VoiceInputProps = {
  fieldId: string;
  currentValue: string;
  onUpdate: (value: string) => void;
  isListening?: boolean;
  onListeningChange?: (isListening: boolean) => void;
  label?: string;
  language?: string;
};

/**
 * Animated Wave Bars Component (displayed during listening)
 */
function AnimatedWaveBars() {
  const bars = [0, 1, 2, 3, 4, 5];
  return (
    <div className="ml-2 inline-flex h-4 items-end gap-1">
      {bars.map((bar) => (
        <motion.span
          key={bar}
          className="w-1 rounded-full bg-calm-sage"
          animate={{ height: [4, 16, 7, 14, 5] }}
          transition={{ repeat: Infinity, duration: 0.9, delay: bar * 0.08, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/**
 * Voice Input Button Component
 * 
 * Features:
 * - Click to start/stop voice recording
 * - Real-time transcription using Web Speech API
 * - Animated listening state with wave bars
 * - Error handling for unsupported browsers
 * - Appends transcript to existing text
 * - Toast notifications for feedback
 */
export function VoiceInputButton({
  fieldId: _fieldId,
  currentValue,
  onUpdate,
  isListening = false,
  onListeningChange,
  label = 'Use Voice Input',
  language = 'en-US',
}: VoiceInputProps) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [localIsListening, setLocalIsListening] = useState(false);

  // Determine actual listening state (prefer prop, fallback to local)
  const listening = onListeningChange !== undefined ? isListening : localIsListening;

  useEffect(() => {
    return () => {
      // Cleanup: stop recognition on unmount
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  /**
   * Get Web Speech API Constructor
   */
  const getSpeechCtor = (): (new () => SpeechRecognitionLike) | null => {
    const ctor =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    return (ctor as new () => SpeechRecognitionLike) || null;
  };

  /**
   * Start voice recognition
   */
  const startListening = () => {
    const SpeechCtor = getSpeechCtor();

    if (!SpeechCtor) {
      toast.error('Voice input is not supported in your browser. Please use Chrome, Firefox, or Edge.');
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognizer = new SpeechCtor();
    recognitionRef.current = recognizer;

    recognizer.lang = language;
    recognizer.interimResults = true;
    recognizer.continuous = true;
    recognizer.maxAlternatives = 1;

    // Update listening state
    if (onListeningChange) {
      onListeningChange(true);
    } else {
      setLocalIsListening(true);
    }

    /**
     * Handle speech recognition results
     * Appends transcript to existing text field
     */
    recognizer.onresult = (event) => {
      let transcript = '';

      // Collect all recognized results
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += `${event.results[i][0].transcript} `;
      }

      // Append to existing text (don't replace)
      const combined = `${currentValue} ${transcript}`.replace(/\s+/g, ' ').trim();
      onUpdate(combined);
    };

    /**
     * Handle recognition errors
     */
    recognizer.onerror = () => {
      if (onListeningChange) {
        onListeningChange(false);
      } else {
        setLocalIsListening(false);
      }
      toast.error('Voice capture failed. Please check your microphone and try again.');
    };

    /**
     * Handle end of recognition
     */
    recognizer.onend = () => {
      if (onListeningChange) {
        onListeningChange(false);
      } else {
        setLocalIsListening(false);
      }
    };

    recognizer.start();
    toast.success('Listening... Speak clearly into your microphone.');
  };

  /**
   * Stop voice recognition
   */
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    if (onListeningChange) {
      onListeningChange(false);
    } else {
      setLocalIsListening(false);
    }
  };

  /**
   * Toggle listening on/off
   */
  const handleToggle = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`mt-2 inline-flex min-h-[38px] items-center rounded-full border px-4 py-2 text-xs font-semibold transition ${
        listening
          ? 'border-calm-sage bg-calm-sage/10 text-calm-sage'
          : 'border-charcoal/20 bg-white text-charcoal hover:border-charcoal/40'
      }`}
      title={listening ? 'Click to stop listening' : 'Click to start voice input'}
    >
      {listening ? (
        <>
          <MicOff className="mr-2 h-4 w-4" />
          Listening...
          <AnimatedWaveBars />
        </>
      ) : (
        <>
          <Mic className="mr-2 h-4 w-4" />
          {label}
        </>
      )}
    </button>
  );
}

/**
 * Voice Input with Text Field Component
 * 
 * Complete implementation with textarea
 * Perfect for meditation/reflection fields
 */
export type VoiceTextAreaProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  fieldId?: string;
  label?: string;
  disabled?: boolean;
};

export function VoiceTextArea({
  value,
  onChange,
  placeholder = 'Type or speak your thoughts here...',
  rows = 4,
  fieldId = 'voice-textarea',
  label = 'Use Voice Input',
  disabled = false,
}: VoiceTextAreaProps) {
  const [isListening, setIsListening] = useState(false);

  return (
    <div className="w-full">
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-calm-sage disabled:bg-gray-100 disabled:text-gray-500"
      />
      <VoiceInputButton
        fieldId={fieldId}
        currentValue={value}
        onUpdate={onChange}
        isListening={isListening}
        onListeningChange={setIsListening}
        label={label}
      />
    </div>
  );
}

/**
 * Voice Input with Text Input Component
 * 
 * Single-line version for shorter prompts
 */
export type VoiceInputFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fieldId?: string;
  label?: string;
  disabled?: boolean;
};

export function VoiceInputField({
  value,
  onChange,
  placeholder = 'Type or speak...',
  fieldId = 'voice-input',
  label = 'Use Voice Input',
  disabled = false,
}: VoiceInputFieldProps) {
  const [isListening, setIsListening] = useState(false);

  return (
    <div className="w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm text-charcoal outline-none focus:border-calm-sage disabled:bg-gray-100 disabled:text-gray-500"
      />
      <VoiceInputButton
        fieldId={fieldId}
        currentValue={value}
        onUpdate={onChange}
        isListening={isListening}
        onListeningChange={setIsListening}
        label={label}
      />
    </div>
  );
}

/**
 * Standalone Voice Recorder Component
 * 
 * Just the mic button, no text field
 * Use when you want to integrate with custom fields
 */
export function VoiceMicButton({
  fieldId = 'voice-mic',
  currentValue = '',
  onUpdate,
  label = 'Use Voice Input',
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);

  return (
    <VoiceInputButton
      fieldId={fieldId}
      currentValue={currentValue}
      onUpdate={onUpdate}
      isListening={isListening}
      onListeningChange={setIsListening}
      label={label}
    />
  );
}

export default VoiceInputButton;
