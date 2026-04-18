import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  openDatabase,
  dbGet,
  dbGetAll,
  dbPut,
  dbDelete,
  dbClear,
  dbPutMany,
  closeDatabase,
  deleteDatabase,
  STORES,
} from '../../src/services/db';

// fake-indexeddb/auto polyfills indexedDB globally for each test

describe('IndexedDB wrapper (db.ts)', () => {
  beforeEach(async () => {
    // Ensure clean state -- close + delete any leftover DB
    closeDatabase();
    await deleteDatabase();
  });

  afterEach(async () => {
    closeDatabase();
    await deleteDatabase();
  });

  it('opens the database and creates all object stores', async () => {
    const database = await openDatabase();
    expect(database).not.toBeNull();
    expect(database!.objectStoreNames.contains('decks')).toBe(true);
    expect(database!.objectStoreNames.contains('progress')).toBe(true);
    expect(database!.objectStoreNames.contains('sessions')).toBe(true);
  });

  it('returns cached connection on second call', async () => {
    const db1 = await openDatabase();
    const db2 = await openDatabase();
    expect(db1).toBe(db2);
  });

  describe('dbPut / dbGet round-trip', () => {
    it('stores and retrieves a deck record', async () => {
      const deck = { id: 'deck-1', name: 'Test Deck', updatedAt: new Date().toISOString() };
      await dbPut(STORES.DECKS, deck);

      const retrieved = await dbGet<typeof deck>(STORES.DECKS, 'deck-1');
      expect(retrieved).toEqual(deck);
    });

    it('stores and retrieves a progress record', async () => {
      const progress = { deckId: 'deck-1', mastery: 0.75, lastUpdated: Date.now() };
      await dbPut(STORES.PROGRESS, progress);

      const retrieved = await dbGet<typeof progress>(STORES.PROGRESS, 'deck-1');
      expect(retrieved).toEqual(progress);
    });

    it('stores and retrieves a session record', async () => {
      const session = { key: 'learn-session', deckId: 'deck-1', currentIndex: 5 };
      await dbPut(STORES.SESSIONS, session);

      const retrieved = await dbGet<typeof session>(STORES.SESSIONS, 'learn-session');
      expect(retrieved).toEqual(session);
    });
  });

  it('returns null for a missing key', async () => {
    await openDatabase();
    const result = await dbGet(STORES.DECKS, 'nonexistent');
    expect(result).toBeNull();
  });

  describe('dbGetAll', () => {
    it('returns all records from a store', async () => {
      await dbPut(STORES.DECKS, { id: 'a', name: 'A' });
      await dbPut(STORES.DECKS, { id: 'b', name: 'B' });
      await dbPut(STORES.DECKS, { id: 'c', name: 'C' });

      const all = await dbGetAll(STORES.DECKS);
      expect(all).toHaveLength(3);
    });

    it('returns empty array for empty store', async () => {
      await openDatabase();
      const all = await dbGetAll(STORES.DECKS);
      expect(all).toEqual([]);
    });
  });

  describe('dbDelete', () => {
    it('removes a record by key', async () => {
      await dbPut(STORES.DECKS, { id: 'deck-1', name: 'Test' });
      await dbDelete(STORES.DECKS, 'deck-1');

      const result = await dbGet(STORES.DECKS, 'deck-1');
      expect(result).toBeNull();
    });

    it('is a no-op for nonexistent key', async () => {
      await openDatabase();
      // Should not throw
      await dbDelete(STORES.DECKS, 'nonexistent');
    });
  });

  describe('dbClear', () => {
    it('removes all records from a store', async () => {
      await dbPut(STORES.DECKS, { id: 'a', name: 'A' });
      await dbPut(STORES.DECKS, { id: 'b', name: 'B' });

      await dbClear(STORES.DECKS);

      const all = await dbGetAll(STORES.DECKS);
      expect(all).toEqual([]);
    });

    it('does not affect other stores', async () => {
      await dbPut(STORES.DECKS, { id: 'a', name: 'A' });
      await dbPut(STORES.PROGRESS, { deckId: 'a', mastery: 0.5 });

      await dbClear(STORES.DECKS);

      const progress = await dbGet(STORES.PROGRESS, 'a');
      expect(progress).not.toBeNull();
    });
  });

  describe('dbPutMany', () => {
    it('inserts multiple records in a single transaction', async () => {
      const records = [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
        { id: 'c', name: 'C' },
      ];
      await dbPutMany(STORES.DECKS, records);

      const all = await dbGetAll(STORES.DECKS);
      expect(all).toHaveLength(3);
    });

    it('handles empty array gracefully', async () => {
      await dbPutMany(STORES.DECKS, []);
      const all = await dbGetAll(STORES.DECKS);
      expect(all).toEqual([]);
    });
  });

  describe('put overwrites existing record', () => {
    it('updates a record with the same key', async () => {
      await dbPut(STORES.DECKS, { id: 'deck-1', name: 'Original' });
      await dbPut(STORES.DECKS, { id: 'deck-1', name: 'Updated' });

      const result = await dbGet<{ id: string; name: string }>(STORES.DECKS, 'deck-1');
      expect(result?.name).toBe('Updated');

      const all = await dbGetAll(STORES.DECKS);
      expect(all).toHaveLength(1);
    });
  });
});
