import { create } from 'zustand';

/**
 * PWA update lifecycle store, modeled on Shredly's `pwaStore`.
 *
 * The previous implementation registered the service worker with a no-op
 * `onNeedRefresh` and `skipWaiting: false`. The new SW would install and
 * sit in the "waiting" state forever, so the user kept getting the old
 * bundle until they manually uninstalled and reinstalled the PWA — which
 * is exactly the bug they reported.
 *
 * Now `main.tsx` captures the `updateSW` function and the `registration`
 * and pushes them in here. This store then exposes:
 *
 *   updateAvailable   — true once a new SW has installed and is waiting
 *   applyUpdate()     — message the waiting SW to skip-waiting, then reload
 *   checkForUpdates() — manual `registration.update()` ping
 *   forceHardRefresh()— nuclear: unregister all SWs, clear caches, reload
 *
 * Plus a one-time auto-apply: when the app is backgrounded for >30s and
 * an update is waiting, apply it silently before the user returns. The
 * page reload is invisible because it happens while the tab is hidden,
 * and the existing `quizly-last-route` persistence puts the user back
 * where they were when they foreground the app.
 */

type UpdateSWFn = (reload?: boolean) => Promise<void>;

interface PwaState {
  updateAvailable: boolean;
  isApplying: boolean;
  lastChecked: Date | null;
  registration: ServiceWorkerRegistration | null;
  updateSW: UpdateSWFn | null;

  setUpdateAvailable: (v: boolean) => void;
  setRegistration: (r: ServiceWorkerRegistration | null) => void;
  setUpdateSW: (fn: UpdateSWFn) => void;

  /** Apply the pending update — skip waiting on the new SW and reload. */
  applyUpdate: () => Promise<void>;
  /** Manually ask the browser to fetch and compare the SW. */
  checkForUpdates: () => Promise<boolean>;
  /** Unregister every SW, clear every Cache Storage entry, then reload. */
  forceHardRefresh: () => Promise<void>;
}

export const usePwaStore = create<PwaState>((set, get) => ({
  updateAvailable: false,
  isApplying: false,
  lastChecked: null,
  registration: null,
  updateSW: null,

  setUpdateAvailable: (v) => set({ updateAvailable: v }),
  setRegistration: (registration) => set({ registration }),
  setUpdateSW: (updateSW) => set({ updateSW }),

  applyUpdate: async () => {
    const { updateSW, isApplying } = get();
    if (isApplying) return;
    set({ isApplying: true });
    try {
      if (updateSW) {
        // updateSW(true) posts SKIP_WAITING to the waiting SW and reloads
        // the page once the new SW takes control.
        await updateSW(true);
      } else {
        // Fallback: no captured updateSW; just reload and hope the SW
        // picks up the new bundle on next install.
        window.location.reload();
      }
    } finally {
      // Reload is async — in practice we never reach here, but keep state
      // sane in case the reload is blocked.
      set({ isApplying: false });
    }
  },

  checkForUpdates: async () => {
    const { registration } = get();
    if (!registration) return false;
    try {
      await registration.update();
      set({ lastChecked: new Date() });
      return !!registration.waiting;
    } catch {
      return false;
    }
  },

  forceHardRefresh: async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
    } catch (err) {
      // Ignore; even if cleanup partially fails, the reload below still helps.
      console.error('[pwa] forceHardRefresh cleanup failed:', err);
    } finally {
      window.location.reload();
    }
  },
}));
