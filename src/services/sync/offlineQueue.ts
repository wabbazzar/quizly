/**
 * Offline queue for sync mutations.
 *
 * Stores pending changes in localStorage as a JSON array.
 * Flushed to server during delta sync push phase.
 * Max 3 retries per entry, then silently discarded.
 * Mirrors shredly's offlineQueue.ts pattern.
 */

import { QUEUE_KEY } from './constants';

export type SyncDataType = 'deck' | 'progress';
export type SyncAction = 'upsert' | 'delete';

export interface QueueEntry {
  id: string;
  type: SyncDataType;
  action: SyncAction;
  payload: unknown;
  retries: number;
  createdAt: string;
}

const MAX_RETRIES = 3;

function readQueue(): QueueEntry[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueueEntry[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full or unavailable — silently drop
  }
}

/**
 * Add a mutation to the offline queue.
 */
export function enqueue(entry: Omit<QueueEntry, 'retries' | 'createdAt'>): void {
  const queue = readQueue();

  // Deduplicate: replace existing entry with same id+type
  const idx = queue.findIndex(e => e.id === entry.id && e.type === entry.type);
  const newEntry: QueueEntry = {
    ...entry,
    retries: 0,
    createdAt: new Date().toISOString(),
  };

  if (idx >= 0) {
    queue[idx] = newEntry;
  } else {
    queue.push(newEntry);
  }

  writeQueue(queue);
}

/**
 * Get all entries of a specific type (for push phase).
 */
export function getEntriesByType(type: SyncDataType): QueueEntry[] {
  return readQueue().filter(e => e.type === type);
}

/**
 * Remove an entry after successful sync.
 */
export function dequeue(id: string, type: SyncDataType): void {
  const queue = readQueue().filter(e => !(e.id === id && e.type === type));
  writeQueue(queue);
}

/**
 * Increment retry count. Discard if max retries exceeded.
 */
export function markRetry(id: string, type: SyncDataType): void {
  const queue = readQueue();
  const entry = queue.find(e => e.id === id && e.type === type);
  if (entry) {
    entry.retries++;
    if (entry.retries >= MAX_RETRIES) {
      // Silently discard
      writeQueue(queue.filter(e => !(e.id === id && e.type === type)));
    } else {
      writeQueue(queue);
    }
  }
}

/**
 * Clear the entire queue.
 */
export function clearQueue(): void {
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Get the total number of queued entries.
 */
export function queueSize(): number {
  return readQueue().length;
}
