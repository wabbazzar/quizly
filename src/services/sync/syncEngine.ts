/**
 * Client-side sync engine for Quizly.
 *
 * Delta sync every 5 minutes, full sync on login.
 * Exponential backoff on failure. Offline queue integration.
 * Mirrors shredly's syncEngine.ts pattern.
 */

import {
  QUIZLY_SERVER_URL,
  TOKEN_KEY,
  CONFIG_KEY,
  LAST_SYNC_KEY,
  DEVICE_SYNCED_KEY,
  LAST_USER_KEY,
  type SyncConfig,
} from './constants';
import {
  getEntriesByType,
  dequeue,
  markRetry,
  clearQueue,
  type SyncDataType,
} from './offlineQueue';

const browser = typeof window !== 'undefined';

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_BACKOFF_MS = 30 * 60 * 1000; // 30 minutes
const FETCH_TIMEOUT_MS = 10_000; // 10 seconds standard
const FULL_SYNC_TIMEOUT_MS = 60_000; // 60 seconds for full sync

export type SyncErrorType = 'network' | 'server' | null;

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let isSyncing = false;
let consecutiveFailures = 0;

// Callbacks for store integration
type SyncPullCallback = (data: {
  decks?: unknown[];
  progress?: unknown[];
}) => void | Promise<void>;

type SyncStatusCallback = (
  syncing: boolean,
  error: string | null,
  errorType: SyncErrorType
) => void;

let onPullCallback: SyncPullCallback | null = null;
let onSyncStatusChange: SyncStatusCallback | null = null;

/**
 * Register a callback to receive pulled data from the server.
 */
export function onPull(callback: SyncPullCallback): void {
  onPullCallback = callback;
}

/**
 * Register a callback for sync status changes.
 */
export function onSyncStatus(callback: SyncStatusCallback): void {
  onSyncStatusChange = callback;
}

// ---------------------------------------------------------------------------
// Fetch with timeout
// ---------------------------------------------------------------------------

export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

function getToken(): string | null {
  if (!browser) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getConfig(): SyncConfig | null {
  if (!browser) return null;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getLastSync(): string {
  if (!browser) return '1970-01-01T00:00:00.000Z';
  return localStorage.getItem(LAST_SYNC_KEY) || '1970-01-01T00:00:00.000Z';
}

function setLastSync(ts: string): void {
  if (browser) localStorage.setItem(LAST_SYNC_KEY, ts);
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function classifyError(err: unknown): SyncErrorType {
  if (err instanceof TypeError) return 'network'; // fetch failures
  if (err instanceof DOMException && err.name === 'AbortError') return 'network';
  return 'server';
}

// ---------------------------------------------------------------------------
// Full sync (first login)
// ---------------------------------------------------------------------------

/**
 * Full sync: push all local data, pull all server data.
 * Called once on login.
 */
export async function fullSync(localData: {
  decks?: unknown[];
  progress?: unknown[];
}): Promise<void> {
  if (!browser || isSyncing) return;
  isSyncing = true;
  onSyncStatusChange?.(true, null, null);

  try {
    const response = await fetchWithTimeout(
      `${QUIZLY_SERVER_URL}/api/sync/full`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(localData),
      },
      FULL_SYNC_TIMEOUT_MS
    );

    if (!response.ok) {
      throw new Error(`Full sync failed: ${response.status}`);
    }

    const data = await response.json();
    await onPullCallback?.(data);

    if (data.syncedAt) {
      setLastSync(data.syncedAt);
    }

    // Clear offline queue after successful full sync
    clearQueue();
    consecutiveFailures = 0;
    onSyncStatusChange?.(false, null, null);
  } catch (err) {
    const errorType = classifyError(err);
    const message = err instanceof Error ? err.message : 'Full sync failed';
    onSyncStatusChange?.(false, message, errorType);
    throw err;
  } finally {
    isSyncing = false;
  }
}

// ---------------------------------------------------------------------------
// Delta sync
// ---------------------------------------------------------------------------

/**
 * Delta sync: push queued changes, pull changes since last sync.
 */
export async function deltaSync(): Promise<void> {
  if (!browser || isSyncing || !getToken()) return;
  isSyncing = true;
  onSyncStatusChange?.(true, null, null);

  try {
    // --- Push phase ---
    await pushQueuedChanges('deck');
    await pushQueuedChanges('progress');

    // --- Pull phase ---
    const since = getLastSync();

    const [decksRes, progressRes] = await Promise.all([
      fetchWithTimeout(
        `${QUIZLY_SERVER_URL}/api/sync/decks?since=${encodeURIComponent(since)}`,
        { method: 'GET', headers: authHeaders() }
      ),
      fetchWithTimeout(
        `${QUIZLY_SERVER_URL}/api/sync/progress?since=${encodeURIComponent(since)}`,
        { method: 'GET', headers: authHeaders() }
      ),
    ]);

    if (!decksRes.ok || !progressRes.ok) {
      throw new Error(`Delta pull failed: decks=${decksRes.status} progress=${progressRes.status}`);
    }

    const decksData = await decksRes.json();
    const progressData = await progressRes.json();

    const pulledDecks = decksData.decks || [];
    const pulledProgress = progressData.progress || [];

    if (pulledDecks.length > 0 || pulledProgress.length > 0) {
      await onPullCallback?.({
        decks: pulledDecks,
        progress: pulledProgress,
      });
    }

    setLastSync(new Date().toISOString());
    consecutiveFailures = 0;
    onSyncStatusChange?.(false, null, null);
  } catch (err) {
    consecutiveFailures++;
    const errorType = classifyError(err);
    const message = err instanceof Error ? err.message : 'Sync failed';
    onSyncStatusChange?.(false, message, errorType);
  } finally {
    isSyncing = false;
    scheduleNextSync();
  }
}

async function pushQueuedChanges(type: SyncDataType): Promise<void> {
  const entries = getEntriesByType(type);
  if (entries.length === 0) return;

  const endpoint = type === 'deck' ? 'decks' : 'progress';
  const payloadKey = type === 'deck' ? 'decks' : 'progress';

  try {
    const response = await fetchWithTimeout(
      `${QUIZLY_SERVER_URL}/api/sync/${endpoint}`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ [payloadKey]: entries.map(e => e.payload) }),
      }
    );

    if (response.ok) {
      // Dequeue all successfully pushed entries
      for (const entry of entries) {
        dequeue(entry.id, type);
      }
    } else {
      // Mark retry on all entries
      for (const entry of entries) {
        markRetry(entry.id, type);
      }
    }
  } catch {
    for (const entry of entries) {
      markRetry(entry.id, type);
    }
  }
}

// ---------------------------------------------------------------------------
// Sync timer
// ---------------------------------------------------------------------------

function getBackoffMs(): number {
  if (consecutiveFailures === 0) return SYNC_INTERVAL_MS;
  const backoff = SYNC_INTERVAL_MS * Math.pow(2, consecutiveFailures);
  return Math.min(backoff, MAX_BACKOFF_MS);
}

function scheduleNextSync(): void {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }

  if (!getToken()) return; // Not logged in, don't schedule

  const delay = getBackoffMs();
  syncTimer = setTimeout(() => {
    deltaSync();
  }, delay);
}

/**
 * Start the sync timer. Call after login.
 */
export function startSync(): void {
  if (!browser) return;
  scheduleNextSync();
}

/**
 * Stop the sync timer. Call on logout.
 */
export function stopSync(): void {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  consecutiveFailures = 0;
}

/**
 * Request an immediate sync (debounced). Used after local mutations.
 */
let immediateSyncTimer: ReturnType<typeof setTimeout> | null = null;

export function requestSync(): void {
  if (!browser || !getToken()) return;

  if (immediateSyncTimer) clearTimeout(immediateSyncTimer);
  immediateSyncTimer = setTimeout(() => {
    immediateSyncTimer = null;
    deltaSync();
  }, 200); // 200ms debounce
}

/**
 * Mark this device as having completed first sync for a user.
 */
export function markDeviceSynced(userId: string): void {
  if (!browser) return;
  try {
    const raw = localStorage.getItem(DEVICE_SYNCED_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[userId] = new Date().toISOString();
    localStorage.setItem(DEVICE_SYNCED_KEY, JSON.stringify(data));
    localStorage.setItem(LAST_USER_KEY, userId);
  } catch {
    // ignore
  }
}

/**
 * Check if this device has synced before for a given user.
 */
export function isFirstLoginOnDevice(userId: string): boolean {
  if (!browser) return true;
  try {
    const raw = localStorage.getItem(DEVICE_SYNCED_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return !data[userId];
  } catch {
    return true;
  }
}
