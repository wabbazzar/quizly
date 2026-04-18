/**
 * Sync store — exposes sync state to React components and
 * orchestrates login/logout/guest flows.
 *
 * Mirrors shredly's syncStore pattern.
 */

import { create } from 'zustand';
import {
  QUIZLY_SERVER_URL,
  TOKEN_KEY,
  CONFIG_KEY,
  LAST_SYNC_KEY,
  GUEST_MODE_KEY,
  LAST_USER_KEY,
  type SyncConfig,
} from '../services/sync/constants';
import {
  fullSync,
  startSync,
  stopSync,
  onPull,
  onSyncStatus,
  markDeviceSynced,
  requestSync as engineRequestSync,
  type SyncErrorType,
} from '../services/sync/syncEngine';
import { clearQueue } from '../services/sync/offlineQueue';
import { saveUserDeck } from '../services/userDeckDb';
import { Deck } from '../types';

interface SyncStoreState {
  // Connection state
  isConnected: boolean;
  isSyncing: boolean;
  syncError: string | null;
  syncErrorType: SyncErrorType;
  lastSyncAt: string | null;

  // User info
  username: string | null;
  userId: string | null;
  role: string | null;
  displayName: string | null;

  // Guest mode
  isGuest: boolean;

  // Actions
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  enterGuestMode: () => void;
  forceSync: () => void;
  initFromStorage: () => void;
}

export const useSyncStore = create<SyncStoreState>()((set, get) => {
  // Register sync status callback
  onSyncStatus((syncing, error, errorType) => {
    set({
      isSyncing: syncing,
      syncError: error,
      syncErrorType: errorType,
      lastSyncAt: syncing ? get().lastSyncAt : localStorage.getItem(LAST_SYNC_KEY),
    });
  });

  // Synchronously read initial state from localStorage to avoid
  // race with AuthGuard (which would redirect before useEffect runs)
  const isBrowser = typeof window !== 'undefined';
  const hasToken = isBrowser && !!localStorage.getItem(TOKEN_KEY);
  const isGuestInit = isBrowser && localStorage.getItem(GUEST_MODE_KEY) === 'true';
  let initConfig: SyncConfig | null = null;
  if (hasToken && isBrowser) {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (raw) initConfig = JSON.parse(raw);
    } catch { /* ignore */ }
  }

  return {
    isConnected: hasToken && !!initConfig,
    isSyncing: false,
    syncError: null,
    syncErrorType: null,
    lastSyncAt: isBrowser ? localStorage.getItem(LAST_SYNC_KEY) : null,
    username: initConfig?.username ?? null,
    userId: initConfig?.userId ?? null,
    role: initConfig?.role ?? null,
    displayName: null,
    isGuest: isGuestInit,

    /**
     * Login: authenticate, store token/config, run full sync, start timer.
     */
    login: async (username: string, password: string) => {
      // Authenticate
      const response = await fetch(`${QUIZLY_SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Login failed' }));
        throw new Error(data.error || `Login failed: ${response.status}`);
      }

      const { token, user } = await response.json();

      // Check for user switch — clear local data if different user
      const previousUserId = localStorage.getItem(LAST_USER_KEY);
      if (previousUserId && previousUserId !== user.id) {
        clearQueue();
        // TODO: clear local IndexedDB data for old user (Phase 4)
      }

      // Store auth state
      localStorage.setItem(TOKEN_KEY, token);
      const config: SyncConfig = {
        serverUrl: QUIZLY_SERVER_URL,
        username: user.username,
        userId: user.id,
        role: user.role,
      };
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      localStorage.removeItem(GUEST_MODE_KEY);

      set({
        isConnected: true,
        isGuest: false,
        username: user.username,
        userId: user.id,
        role: user.role,
        displayName: user.displayName,
        syncError: null,
        syncErrorType: null,
      });

      // Full sync — push local data, pull server data
      // TODO: gather local IndexedDB data to push (Phase 4 integration)
      await fullSync({ decks: [], progress: [] });

      markDeviceSynced(user.id);
      startSync();
    },

    /**
     * Logout: clear auth, stop sync, reset state.
     */
    logout: () => {
      stopSync();
      clearQueue();

      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(CONFIG_KEY);
      localStorage.removeItem(LAST_SYNC_KEY);
      localStorage.removeItem(GUEST_MODE_KEY);

      set({
        isConnected: false,
        isSyncing: false,
        syncError: null,
        syncErrorType: null,
        lastSyncAt: null,
        username: null,
        userId: null,
        role: null,
        displayName: null,
        isGuest: false,
      });
    },

    /**
     * Enter guest mode — no server contact.
     */
    enterGuestMode: () => {
      localStorage.setItem(GUEST_MODE_KEY, 'true');
      set({ isGuest: true, isConnected: false });
    },

    /**
     * Force an immediate delta sync.
     */
    forceSync: () => {
      engineRequestSync();
    },

    /**
     * Restore state from localStorage on app load.
     */
    initFromStorage: () => {
      const token = localStorage.getItem(TOKEN_KEY);
      const isGuest = localStorage.getItem(GUEST_MODE_KEY) === 'true';

      if (token) {
        try {
          const raw = localStorage.getItem(CONFIG_KEY);
          if (raw) {
            const config: SyncConfig = JSON.parse(raw);
            set({
              isConnected: true,
              isGuest: false,
              username: config.username,
              userId: config.userId,
              role: config.role,
              lastSyncAt: localStorage.getItem(LAST_SYNC_KEY),
            });
            startSync();
            return;
          }
        } catch {
          // Corrupted config — treat as logged out
        }
      }

      if (isGuest) {
        set({ isGuest: true, isConnected: false });
        return;
      }

      // Neither logged in nor guest
      set({ isConnected: false, isGuest: false });
    },
  };
});

/**
 * Register the onPull callback. Called once at app init.
 * Receives pulled server data and merges into local stores.
 */
export function initSyncPullHandler(): void {
  onPull(async (data) => {
    const pulledDecks = (data.decks ?? []) as Array<{ id: string; deckJson: string; deleted?: boolean }>;

    if (pulledDecks.length > 0) {
      // Parse and save each pulled deck to IndexedDB, then refresh deckStore
      for (const row of pulledDecks) {
        if (row.deleted) continue;
        try {
          const deck: Deck = typeof row.deckJson === 'string' ? JSON.parse(row.deckJson) : row.deckJson;
          if (deck.id && deck.metadata && deck.content) {
            await saveUserDeck(deck, false);
          }
        } catch {
          // Skip malformed deck data
        }
      }

      // Trigger a reload so the UI picks up pulled decks
      // Use dynamic import to avoid circular dependency
      const { useDeckStore } = await import('./deckStore');
      useDeckStore.setState({ decks: [] }); // Force re-fetch
      useDeckStore.getState().loadDecks();
    }
  });
}
