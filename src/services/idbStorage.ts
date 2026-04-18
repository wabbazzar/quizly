/**
 * Zustand persist storage adapter backed by IndexedDB.
 *
 * Replaces localStorage for large data stores (progress, mastery, sessions).
 * On first load, migrates data from the old localStorage key if present.
 *
 * Usage with Zustand persist:
 *   persist(storeImpl, {
 *     name: 'my-store',
 *     storage: createIDBStorage(STORES.PROGRESS, 'my-store', 'old-localStorage-key'),
 *   })
 */

import type { StateStorage } from 'zustand/middleware';
import { dbGet, dbPut, dbDelete, openDatabase, STORES } from './db';

/** Shape of a Zustand persist record stored in IndexedDB. */
interface PersistedRecord {
  /** IndexedDB key — matches the store name for single-record stores. */
  key?: string;
  deckId?: string;
  /** The Zustand persist envelope: { state, version } */
  zustandState: string;
}

/**
 * Create a Zustand-compatible async StateStorage backed by our IndexedDB wrapper.
 *
 * @param idbStoreName  Which IndexedDB object store to use (from STORES constant).
 * @param recordKey     The key under which this store's state is kept inside the object store.
 *                      For PROGRESS store the keyPath is `deckId`, for SESSIONS it's `key`.
 * @param oldLSKey      The old localStorage key to migrate from (if any).
 */
export function createIDBStorage(
  idbStoreName: string,
  recordKey: string,
  oldLSKey?: string
): StateStorage {
  // Determine the correct key field name based on the store
  const keyField = idbStoreName === STORES.PROGRESS ? 'deckId'
    : idbStoreName === STORES.SESSIONS ? 'key'
    : 'id';

  return {
    getItem: async (_name: string): Promise<string | null> => {
      // Ensure DB is open
      await openDatabase();

      // Try IndexedDB first
      const record = await dbGet<PersistedRecord>(idbStoreName, recordKey);
      if (record?.zustandState) {
        return record.zustandState;
      }

      // Fallback: migrate from old localStorage key
      if (oldLSKey) {
        try {
          const oldData = localStorage.getItem(oldLSKey);
          if (oldData) {
            // Write to IndexedDB
            await dbPut(idbStoreName, {
              [keyField]: recordKey,
              zustandState: oldData,
            });
            // Remove old localStorage key
            localStorage.removeItem(oldLSKey);
            return oldData;
          }
        } catch {
          // localStorage may not be available; ignore
        }
      }

      return null;
    },

    setItem: async (_name: string, value: string): Promise<void> => {
      await openDatabase();
      await dbPut(idbStoreName, {
        [keyField]: recordKey,
        zustandState: value,
      });
    },

    removeItem: async (_name: string): Promise<void> => {
      await openDatabase();
      await dbDelete(idbStoreName, recordKey);
    },
  };
}
