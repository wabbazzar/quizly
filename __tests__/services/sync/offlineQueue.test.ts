import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  enqueue,
  getEntriesByType,
  dequeue,
  markRetry,
  clearQueue,
  queueSize,
} from '../../../src/services/sync/offlineQueue';

// The test setup already mocks localStorage via vi.stubGlobal

describe('offlineQueue', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => store[key] ?? null);
    vi.mocked(localStorage.setItem).mockImplementation((key: string, val: string) => { store[key] = val; });
    vi.mocked(localStorage.removeItem).mockImplementation((key: string) => { delete store[key]; });
  });

  it('enqueues and retrieves entries by type', () => {
    enqueue({ id: 'deck-1', type: 'deck', action: 'upsert', payload: { name: 'Test' } });
    enqueue({ id: 'prog-1', type: 'progress', action: 'upsert', payload: { mastery: 50 } });

    const decks = getEntriesByType('deck');
    expect(decks).toHaveLength(1);
    expect(decks[0].id).toBe('deck-1');

    const progress = getEntriesByType('progress');
    expect(progress).toHaveLength(1);
    expect(progress[0].id).toBe('prog-1');
  });

  it('deduplicates on enqueue (same id+type replaces)', () => {
    enqueue({ id: 'deck-1', type: 'deck', action: 'upsert', payload: { v: 1 } });
    enqueue({ id: 'deck-1', type: 'deck', action: 'upsert', payload: { v: 2 } });

    const entries = getEntriesByType('deck');
    expect(entries).toHaveLength(1);
    expect((entries[0].payload as { v: number }).v).toBe(2);
  });

  it('dequeue removes the entry', () => {
    enqueue({ id: 'deck-1', type: 'deck', action: 'upsert', payload: {} });
    enqueue({ id: 'deck-2', type: 'deck', action: 'upsert', payload: {} });

    dequeue('deck-1', 'deck');

    const entries = getEntriesByType('deck');
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('deck-2');
  });

  it('markRetry increments retries', () => {
    enqueue({ id: 'deck-1', type: 'deck', action: 'upsert', payload: {} });

    markRetry('deck-1', 'deck');
    let entries = getEntriesByType('deck');
    expect(entries[0].retries).toBe(1);

    markRetry('deck-1', 'deck');
    entries = getEntriesByType('deck');
    expect(entries[0].retries).toBe(2);
  });

  it('discards entry after max retries (3)', () => {
    enqueue({ id: 'deck-1', type: 'deck', action: 'upsert', payload: {} });

    markRetry('deck-1', 'deck');
    markRetry('deck-1', 'deck');
    markRetry('deck-1', 'deck'); // 3rd retry -> discard

    const entries = getEntriesByType('deck');
    expect(entries).toHaveLength(0);
  });

  it('clearQueue removes all entries', () => {
    enqueue({ id: 'a', type: 'deck', action: 'upsert', payload: {} });
    enqueue({ id: 'b', type: 'progress', action: 'upsert', payload: {} });

    clearQueue();

    expect(queueSize()).toBe(0);
  });

  it('queueSize returns total count', () => {
    expect(queueSize()).toBe(0);

    enqueue({ id: 'a', type: 'deck', action: 'upsert', payload: {} });
    enqueue({ id: 'b', type: 'deck', action: 'upsert', payload: {} });
    enqueue({ id: 'c', type: 'progress', action: 'upsert', payload: {} });

    expect(queueSize()).toBe(3);
  });

  it('handles corrupted localStorage gracefully', () => {
    store['quizly_sync_queue'] = '{not valid json';

    // Should not throw, returns empty
    expect(getEntriesByType('deck')).toEqual([]);
    expect(queueSize()).toBe(0);
  });
});
