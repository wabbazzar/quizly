/**
 * Sync hooks: bridge between Zustand store mutations and the offline queue.
 *
 * Call these after local mutations to enqueue changes for sync.
 * Only enqueues when user is logged in (not guest).
 */

import { enqueue } from './offlineQueue';
import { requestSync } from './syncEngine';
import { TOKEN_KEY } from './constants';
import { Deck } from '@/types';

function isLoggedIn(): boolean {
  return typeof window !== 'undefined' && !!localStorage.getItem(TOKEN_KEY);
}

/**
 * Enqueue a deck upsert for sync.
 */
export function syncDeckUpsert(deck: Deck): void {
  if (!isLoggedIn()) return;
  enqueue({
    id: deck.id,
    type: 'deck',
    action: 'upsert',
    payload: {
      id: deck.id,
      deckJson: JSON.stringify(deck),
      updatedAt: new Date().toISOString(),
    },
  });
  requestSync();
}

/**
 * Enqueue a deck deletion for sync.
 */
export function syncDeckDelete(deckId: string): void {
  if (!isLoggedIn()) return;
  enqueue({
    id: deckId,
    type: 'deck',
    action: 'delete',
    payload: {
      id: deckId,
      deleted: true,
      updatedAt: new Date().toISOString(),
    },
  });
  requestSync();
}

/**
 * Enqueue a progress update for sync.
 */
export function syncProgressUpsert(deckId: string, progressData: unknown): void {
  if (!isLoggedIn()) return;
  enqueue({
    id: deckId,
    type: 'progress',
    action: 'upsert',
    payload: {
      deckId,
      progressJson: JSON.stringify(progressData),
      updatedAt: new Date().toISOString(),
    },
  });
  requestSync();
}
