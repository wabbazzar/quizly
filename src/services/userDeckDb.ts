/**
 * IndexedDB persistence for user-created and user-edited decks.
 *
 * Library decks from public/data/ are the base layer.
 * User decks in IndexedDB override library decks with the same ID
 * and add net-new user-created decks.
 */

import { dbGet, dbGetAll, dbPut, dbDelete, STORES } from './db';
import { Deck } from '@/types';

/** Shape stored in IndexedDB `decks` object store (keyPath: 'id') */
interface StoredDeck {
  id: string;
  deck: Deck;
  updatedAt: string;
  isLibraryOverride: boolean; // true = edited copy of a library deck
}

/**
 * Save a deck to IndexedDB.
 * @param deck The deck to save
 * @param isLibraryOverride true if this is an edited copy of a library deck
 */
export async function saveUserDeck(deck: Deck, isLibraryOverride = false): Promise<void> {
  const record: StoredDeck = {
    id: deck.id,
    deck,
    updatedAt: new Date().toISOString(),
    isLibraryOverride,
  };
  await dbPut(STORES.DECKS, record);
}

/**
 * Load all user decks from IndexedDB.
 */
export async function loadUserDecks(): Promise<StoredDeck[]> {
  return dbGetAll<StoredDeck>(STORES.DECKS);
}

/**
 * Load a single user deck by ID.
 */
export async function getUserDeck(id: string): Promise<StoredDeck | null> {
  return dbGet<StoredDeck>(STORES.DECKS, id);
}

/**
 * Delete a user deck from IndexedDB.
 */
export async function deleteUserDeck(id: string): Promise<void> {
  await dbDelete(STORES.DECKS, id);
}

/**
 * Merge library decks with user decks from IndexedDB.
 * User decks override library decks with the same ID.
 * Net-new user decks are appended.
 */
export async function mergeWithUserDecks(libraryDecks: Deck[]): Promise<Deck[]> {
  const userRecords = await loadUserDecks();
  if (userRecords.length === 0) return libraryDecks;

  const userDeckMap = new Map<string, Deck>();
  for (const record of userRecords) {
    userDeckMap.set(record.id, record.deck);
  }

  // Override library decks with user versions
  const merged = libraryDecks.map(libDeck => {
    const userVersion = userDeckMap.get(libDeck.id);
    if (userVersion) {
      userDeckMap.delete(libDeck.id); // consumed
      return userVersion;
    }
    return libDeck;
  });

  // Append net-new user decks (not overriding any library deck)
  for (const deck of userDeckMap.values()) {
    merged.push(deck);
  }

  return merged;
}
