import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SaveState } from '../../types/sessionPlayer';

interface UseAutoSaveParams<TPayload> {
  payloadFactory: () => TPayload | null;
  onSave: (payload: TPayload, reason: 'interval' | 'question-change' | 'before-unload') => Promise<void>;
  isOnline: boolean;
  intervalMs?: number;
}

export const useAutoSave = <TPayload>({
  payloadFactory,
  onSave,
  isOnline,
  intervalMs = 30_000,
}: UseAutoSaveParams<TPayload>) => {
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const lastChecksumRef = useRef('');
  const savingRef = useRef(false);

  const saveNow = useCallback(
    async (reason: 'interval' | 'question-change' | 'before-unload') => {
      const payload = payloadFactory();
      if (!payload) return;

      const checksum = JSON.stringify(payload);
      if (reason !== 'before-unload' && checksum === lastChecksumRef.current) return;
      if (savingRef.current) return;

      if (!isOnline) {
        setSaveState('offline');
        return;
      }

      savingRef.current = true;
      setSaveState('saving');
      try {
        await onSave(payload, reason);
        lastChecksumRef.current = checksum;
        setSaveState('saved');
      } catch {
        setSaveState('error');
      } finally {
        savingRef.current = false;
      }
    },
    [isOnline, onSave, payloadFactory],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      void saveNow('interval');
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs, saveNow]);

  useEffect(() => {
    const handler = () => {
      void saveNow('before-unload');
    };

    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
    };
  }, [saveNow]);

  return useMemo(
    () => ({ saveState, saveNow }),
    [saveNow, saveState],
  );
};
