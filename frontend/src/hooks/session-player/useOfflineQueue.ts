import { useCallback, useMemo, useRef, useState } from 'react';
import { sessionPlayerIdb } from './indexedDb';
import type { SessionOutboxItem } from '../../types/sessionPlayer';

const jitter = (baseMs: number) => baseMs + Math.floor(Math.random() * 250);

export const useOfflineQueue = (
  sessionId: string,
  syncOne: (item: SessionOutboxItem) => Promise<void>,
  isOnline: boolean,
) => {
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const drainingRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    const items = await sessionPlayerIdb.listOutboxBySession(sessionId);
    setPendingCount(items.length);
  }, [sessionId]);

  const enqueue = useCallback(
    async (item: SessionOutboxItem) => {
      await sessionPlayerIdb.addOutboxItem(item);
      await refreshPendingCount();
    },
    [refreshPendingCount],
  );

  const drain = useCallback(async () => {
    if (!isOnline || drainingRef.current) return;
    drainingRef.current = true;
    setSyncing(true);

    try {
      let continueSync = true;
      while (continueSync) {
        const queue = await sessionPlayerIdb.listOutboxBySession(sessionId);
        if (queue.length === 0) {
          continueSync = false;
          break;
        }

        const next = queue[0];
        try {
          await syncOne(next);
          await sessionPlayerIdb.removeOutboxItem(next.id);
          await refreshPendingCount();
        } catch {
          const retries = next.retries + 1;
          await sessionPlayerIdb.updateOutboxItem({ ...next, retries });
          await refreshPendingCount();
          await new Promise((resolve) => setTimeout(resolve, jitter(Math.min(30_000, 1_000 * 2 ** Math.min(retries, 5)))));
          continueSync = isOnline;
        }
      }
    } finally {
      setSyncing(false);
      drainingRef.current = false;
    }
  }, [isOnline, refreshPendingCount, sessionId, syncOne]);

  const state = useMemo(
    () => ({ syncing, pendingCount }),
    [syncing, pendingCount],
  );

  return { enqueue, drain, refreshPendingCount, state };
};
