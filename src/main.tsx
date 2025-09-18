import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './styles/theme.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker for PWA support with Vite PWA plugin
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Show a prompt to the user to refresh for new content
    if (confirm('New content available! Click OK to refresh.')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App is ready to work offline');
  },
  onRegisteredSW(swScriptUrl, registration) {
    console.log('Service Worker registered:', swScriptUrl);

    // Check for updates periodically
    if (registration) {
      setInterval(
        () => {
          registration.update();
        },
        60 * 60 * 1000
      ); // Check every hour
    }
  },
  onRegisterError(error) {
    console.error('Service Worker registration error:', error);
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
      console.log('iOS PWA: Quick restart detected, clearing unload marker');
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
