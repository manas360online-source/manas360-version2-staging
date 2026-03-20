import { useState, useEffect, useCallback } from 'react';

interface OfflineState {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnlineTime: Date | null;
  queuedActions: QueuedAction[];
}

interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: Date;
  retryCount: number;
}

export function useOfflineSupport() {
  const [state, setState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    wasOffline: false,
    lastOnlineTime: navigator.onLine ? new Date() : null,
    queuedActions: [],
  });

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({
        ...prev,
        isOnline: true,
        wasOffline: prev.wasOffline || !prev.isOnline,
        lastOnlineTime: new Date(),
      }));
    };

    const handleOffline = () => {
      setState(prev => ({
        ...prev,
        isOnline: false,
        wasOffline: true,
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Queue actions for offline execution
  const queueAction = useCallback((action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>) => {
    const queuedAction: QueuedAction = {
      ...action,
      id: `action-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      retryCount: 0,
    };

    setState(prev => ({
      ...prev,
      queuedActions: [...prev.queuedActions, queuedAction],
    }));

    return queuedAction.id;
  }, []);

  // Remove action from queue
  const removeQueuedAction = useCallback((actionId: string) => {
    setState(prev => ({
      ...prev,
      queuedActions: prev.queuedActions.filter(action => action.id !== actionId),
    }));
  }, []);

  // Retry queued actions when back online
  const retryQueuedActions = useCallback(async () => {
    if (!state.isOnline || state.queuedActions.length === 0) return;

    const actionsToRetry = state.queuedActions.filter(action => action.retryCount < 3);

    for (const action of actionsToRetry) {
      try {
        // Execute the queued action (this would be customized based on action type)
        await executeQueuedAction(action);
        removeQueuedAction(action.id);
      } catch (error) {
        // Increment retry count or mark as failed
        setState(prev => ({
          ...prev,
          queuedActions: prev.queuedActions.map(a =>
            a.id === action.id
              ? { ...a, retryCount: a.retryCount + 1 }
              : a
          ),
        }));
      }
    }
  }, [state.isOnline, state.queuedActions, removeQueuedAction]);

  // Auto-retry when coming back online
  useEffect(() => {
    if (state.isOnline && state.wasOffline) {
      retryQueuedActions();
    }
  }, [state.isOnline, state.wasOffline, retryQueuedActions]);

  return {
    isOnline: state.isOnline,
    wasOffline: state.wasOffline,
    lastOnlineTime: state.lastOnlineTime,
    queuedActionsCount: state.queuedActions.length,
    queueAction,
    removeQueuedAction,
    retryQueuedActions,
  };
}

// Service Worker registration hook
export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registrationError, setRegistrationError] = useState<Error | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          setRegistration(reg);

          // Listen for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                }
              });
            }
          });
        })
        .catch((error) => {
          setRegistrationError(error);
        });
    }
  }, []);

  const updateServiceWorker = useCallback(() => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, [registration]);

  return {
    registration,
    updateAvailable,
    registrationError,
    updateServiceWorker,
  };
}

// Cache management hook
export function useCache() {
  const [cacheStatus, setCacheStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');

  useEffect(() => {
    const checkCache = async () => {
      try {
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          setCacheStatus(cacheNames.length > 0 ? 'available' : 'unavailable');
        } else {
          setCacheStatus('unavailable');
        }
      } catch (error) {
        setCacheStatus('unavailable');
      }
    };

    checkCache();
  }, []);

  const clearCache = useCallback(async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      setCacheStatus('unavailable');
    }
  }, []);

  return {
    cacheStatus,
    clearCache,
  };
}

// Background sync hook
export function useBackgroundSync() {
  const [syncSupported, setSyncSupported] = useState(false);

  useEffect(() => {
    const hasSync = 'serviceWorker' in navigator && !!(window as any).ServiceWorkerRegistration?.prototype?.sync;
    setSyncSupported(hasSync);
  }, []);

  const registerSync = useCallback(async (tag: string) => {
    if (!syncSupported || !navigator.serviceWorker.controller) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      // Use type assertion for background sync API
      const syncManager = (registration as any).sync;
      if (syncManager) {
        await syncManager.register(tag);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Background sync registration failed:', error);
      return false;
    }
  }, [syncSupported]);

  return {
    syncSupported,
    registerSync,
  };
}

// Helper function to execute queued actions (would be customized based on action types)
async function executeQueuedAction(action: QueuedAction): Promise<void> {
  switch (action.type) {
    case 'SAVE_ASSESSMENT':
      // Implement assessment save logic
      break;
    case 'UPDATE_PATIENT':
      // Implement patient update logic
      break;
    case 'LOG_ACTIVITY':
      // Implement activity logging logic
      break;
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}