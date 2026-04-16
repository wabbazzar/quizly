import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './styles/theme.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker for PWA support with Vite PWA plugin.
//
// IMPORTANT: do NOT call updateSW(true) anywhere in the success path and do
// NOT show a confirm() that can bounce the page. The previous version used
// registerType:'autoUpdate' which, via workbox-window, calls
// window.location.reload() the moment a new SW activates. That is what
// produced the "page loads, then reloads after 1-2s" symptom the user sees
// on every visit after a deploy. With registerType:'prompt' and skipWaiting
// disabled in the workbox config, the new SW installs silently and waits;
// it only takes effect on the next natural navigation, never mid-session.
registerSW({
  immediate: true,
  onNeedRefresh() {
    // Intentionally a no-op: new content is cached, but we don't interrupt
    // the user. They will get the update on their next full page load.
  },
  onOfflineReady() {
    // App is ready to work offline
  },
  onRegisteredSW(_swScriptUrl, registration) {
    // Check for updates periodically, but never force a reload here.
    if (registration) {
      setInterval(
        () => {
          registration.update();
        },
        60 * 60 * 1000
      ); // Check every hour
    }
  },
  onRegisterError(_error) {
    // Service Worker registration error
  },
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
