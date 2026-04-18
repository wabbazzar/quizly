/**
 * IndexedDB Wrapper for Quizly Client-Side Persistence
 *
 * Single database with multiple object stores for decks, progress, and sessions.
 * Uses raw IndexedDB API (no external dependencies).
 * Mirrors shredly's scheduleDb.ts pattern.
 */

const DB_NAME = 'quizly-data';
const DB_VERSION = 1;

const STORE_DECKS = 'decks';
const STORE_PROGRESS = 'progress';
const STORE_SESSIONS = 'sessions';

const isBrowser = typeof window !== 'undefined' && typeof indexedDB !== 'undefined';

let db: IDBDatabase | null = null;

/**
 * Open the IndexedDB database, creating object stores if needed.
 * Returns cached connection if already open.
 * Returns null during SSR or when IndexedDB is unavailable.
 */
export async function openDatabase(): Promise<IDBDatabase | null> {
  if (!isBrowser) return null;
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;

      // Handle unexpected close (e.g. browser clearing storage)
      db.onclose = () => { db = null; };

      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // User-created/imported decks (full JSON blobs)
      if (!database.objectStoreNames.contains(STORE_DECKS)) {
        const store = database.createObjectStore(STORE_DECKS, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Per-deck progress, mastery, and best times
      if (!database.objectStoreNames.contains(STORE_PROGRESS)) {
        database.createObjectStore(STORE_PROGRESS, { keyPath: 'deckId' });
      }

      // Paused session state (learn, flashcard, match)
      if (!database.objectStoreNames.contains(STORE_SESSIONS)) {
        database.createObjectStore(STORE_SESSIONS, { keyPath: 'key' });
      }
    };
  });
}

// ---------------------------------------------------------------------------
// Generic typed CRUD helpers
// ---------------------------------------------------------------------------

/**
 * Get a single record by key from a store.
 * Returns null if not found or during SSR.
 */
export async function dbGet<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
  const database = await openDatabase();
  if (!database) return null;

  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as T) ?? null);
  });
}

/**
 * Get all records from a store.
 * Returns empty array during SSR.
 */
export async function dbGetAll<T>(storeName: string): Promise<T[]> {
  const database = await openDatabase();
  if (!database) return [];

  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as T[]) ?? []);
  });
}

/**
 * Put (insert or update) a record in a store.
 * No-op during SSR.
 */
export async function dbPut<T>(storeName: string, value: T): Promise<void> {
  const database = await openDatabase();
  if (!database) return;

  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(value);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Delete a record by key from a store.
 * No-op during SSR.
 */
export async function dbDelete(storeName: string, key: IDBValidKey): Promise<void> {
  const database = await openDatabase();
  if (!database) return;

  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Clear all records from a store.
 * No-op during SSR.
 */
export async function dbClear(storeName: string): Promise<void> {
  const database = await openDatabase();
  if (!database) return;

  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Put multiple records in a single transaction.
 * More efficient than calling dbPut in a loop.
 * No-op during SSR.
 */
export async function dbPutMany<T>(storeName: string, values: T[]): Promise<void> {
  if (values.length === 0) return;
  const database = await openDatabase();
  if (!database) return;

  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
    for (const value of values) {
      store.put(value);
    }
  });
}

// ---------------------------------------------------------------------------
// Store name constants (export for typed usage)
// ---------------------------------------------------------------------------

export const STORES = {
  DECKS: STORE_DECKS,
  PROGRESS: STORE_PROGRESS,
  SESSIONS: STORE_SESSIONS,
} as const;

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Close the database connection. Useful for testing or cleanup.
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Delete the entire database.
 * WARNING: Removes all data permanently.
 */
export async function deleteDatabase(): Promise<void> {
  closeDatabase();
  if (!isBrowser) return;

  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
