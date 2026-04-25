import type { SessionDraftSnapshot, SessionOutboxItem } from '../../types/sessionPlayer';

const DB_NAME = 'manas360-cbt-player';
const DB_VERSION = 1;
const DRAFT_STORE = 'drafts';
const OUTBOX_STORE = 'outbox';

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        db.createObjectStore(DRAFT_STORE, { keyPath: 'sessionId' });
      }
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        const outbox = db.createObjectStore(OUTBOX_STORE, { keyPath: 'id' });
        outbox.createIndex('sessionId', 'sessionId', { unique: false });
        outbox.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });

const runTransaction = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  exec: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: any) => void) => void,
): Promise<T> => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    exec(store, resolve, reject);
    tx.onerror = () => reject(tx.error);
  });
};

export const sessionPlayerIdb = {
  getDraft: async (sessionId: string): Promise<SessionDraftSnapshot | null> =>
    runTransaction<SessionDraftSnapshot | null>(DRAFT_STORE, 'readonly', (store, resolve, reject) => {
      const req = store.get(sessionId);
      req.onsuccess = () => resolve((req.result as SessionDraftSnapshot | undefined) ?? null);
      req.onerror = () => reject(req.error);
    }),

  putDraft: async (snapshot: SessionDraftSnapshot): Promise<void> =>
    runTransaction<void>(DRAFT_STORE, 'readwrite', (store, resolve, reject) => {
      const req = store.put(snapshot);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }),

  addOutboxItem: async (item: SessionOutboxItem): Promise<void> =>
    runTransaction<void>(OUTBOX_STORE, 'readwrite', (store, resolve, reject) => {
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }),

  listOutboxBySession: async (sessionId: string): Promise<SessionOutboxItem[]> =>
    runTransaction<SessionOutboxItem[]>(OUTBOX_STORE, 'readonly', (store, resolve, reject) => {
      const index = store.index('sessionId');
      const req = index.getAll(sessionId);
      req.onsuccess = () => {
        const rows = (req.result as SessionOutboxItem[]) || [];
        rows.sort((a, b) => a.createdAt - b.createdAt);
        resolve(rows);
      };
      req.onerror = () => reject(req.error);
    }),

  removeOutboxItem: async (id: string): Promise<void> =>
    runTransaction<void>(OUTBOX_STORE, 'readwrite', (store, resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }),

  updateOutboxItem: async (item: SessionOutboxItem): Promise<void> =>
    runTransaction<void>(OUTBOX_STORE, 'readwrite', (store, resolve, reject) => {
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }),
};
