import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './styles/theme.css';
import { registerSW } from 'virtual:pwa-register';
import { usePwaStore } from './store/pwaStore';

// PWA update flow, modeled on Shredly's:
//   1. registerType is 'prompt' + workbox skipWaiting:false, so the new SW
//      installs and parks in the waiting state — no mid-session takeover.
//   2. We capture the `updateSW` function the plugin returns and stash it
//      in `pwaStore` so the rest of the app (UI banner, settings page,
//      auto-apply effect below) can call it on demand.
//   3. When `onNeedRefresh` fires (= a new SW is waiting), we flip the
//      store flag rather than no-op-ing. That bug — the no-op — is what
//      caused the user to "have to reinstall the PWA" to get updates.
//   4. Background→foreground auto-apply: if the user is away from the tab
//      for >30s and an update is waiting, we silently call updateSW(true)
//      before they come back. The reload happens while the tab is hidden,
//      and `useLastRoutePersistence` puts them back on their last route.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    usePwaStore.getState().setUpdateAvailable(true);
  },
  onOfflineReady() {
    // App is ready to work offline.
  },
  onRegisteredSW(_swScriptUrl, registration) {
    if (!registration) return;
    usePwaStore.getState().setRegistration(registration);

    // Periodic check (every 30 min).
    setInterval(() => {
      registration.update().catch(() => {});
    }, 30 * 60 * 1000);

    // Also check when the page is brought back into focus — covers the
    // common case of the user backgrounding the PWA for a while.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        registration.update().catch(() => {});
      }
    });

    // Already-waiting worker (the page loaded after install completed).
    if (registration.waiting) {
      usePwaStore.getState().setUpdateAvailable(true);
    }
  },
  onRegisterError(error) {
    console.error('[pwa] SW registration failed:', error);
  },
});

usePwaStore.getState().setUpdateSW(updateSW);

// Background→foreground silent auto-apply.
let lastHiddenAt: number | null = null;
const BACKGROUND_THRESHOLD_MS = 30_000; // user truly left the tab
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    lastHiddenAt = Date.now();
  } else if (document.visibilityState === 'visible') {
    const { updateAvailable, applyUpdate } = usePwaStore.getState();
    if (
      updateAvailable &&
      lastHiddenAt &&
      Date.now() - lastHiddenAt >= BACKGROUND_THRESHOLD_MS
    ) {
      // User was away long enough that a reload won't feel like a glitch —
      // and `quizly-last-route` will land them back on whatever page they
      // were viewing.
      applyUpdate();
    }
    lastHiddenAt = null;
  }
});

// iOS PWA specific handling - minimal event handling here since usePWAVisibility handles most lifecycle
const isIOSPWA =
  /iPhone|iPad|iPod/i.test(navigator.userAgent) &&
  ((window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches);

if (isIOSPWA) {
  // Prevent iOS keyboard viewport issues
  window.addEventListener('resize', () => {
    if (!document.hidden && window.innerHeight < 500) {
      // Likely keyboard showing on mobile - scroll to top to prevent issues
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 100);
    }
  });

  // iOS-specific memory pressure handling
  window.addEventListener('beforeunload', () => {
    // Mark that the app is being unloaded (helps distinguish from backgrounding)
    sessionStorage.setItem('quizly-ios-unload', Date.now().toString());
  });

  // Check if this is a restoration from termination
  const unloadTime = sessionStorage.getItem('quizly-ios-unload');
  if (unloadTime) {
    const timeSinceUnload = Date.now() - parseInt(unloadTime);
    if (timeSinceUnload < 10000) {
      // Within 10 seconds, likely a refresh
      // iOS PWA: Quick restart detected
    }
    sessionStorage.removeItem('quizly-ios-unload');
  }
}

// Initialize app
const rootElement = document.getElementById('root')!;
const root = ReactDOM.createRoot(rootElement);

// Add global styles for iOS PWA restoration loading
if (isIOSPWA) {
  // Ensure smooth transitions during restoration
  document.documentElement.style.setProperty('--ios-pwa-transition', 'opacity 0.3s ease-in-out');
}

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
