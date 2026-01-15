import { useEffect, useState, useCallback } from 'react';

interface VisibilityState {
  isVisible: boolean;
  wasRestored: boolean;
  lastVisibleTime: number;
  resumeCount: number;
  isIOS: boolean;
  isPWA: boolean;
  isRestoring: boolean;
}

// iOS PWA detection
const isIOSDevice = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isPWAMode = () => {
  // Check if running as PWA (standalone mode)
  return (
    (window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  );
};

// State persistence for iOS PWA termination handling
const PWA_STATE_KEY = 'quizly-pwa-state';
const PWA_HEARTBEAT_KEY = 'quizly-pwa-heartbeat';

export function usePWAVisibility() {
  const [state, setState] = useState<VisibilityState>(() => {
    const isIOS = isIOSDevice();
    const isPWA = isPWAMode();

    // Check if this is a restoration from termination
    const lastHeartbeat = parseInt(localStorage.getItem(PWA_HEARTBEAT_KEY) || '0');
    const now = Date.now();
    const wasTerminated = isIOS && isPWA && now - lastHeartbeat > 5000; // 5 seconds gap indicates termination

    return {
      isVisible: !document.hidden,
      wasRestored: wasTerminated,
      lastVisibleTime: Date.now(),
      resumeCount: wasTerminated ? 1 : 0,
      isIOS,
      isPWA,
      isRestoring: wasTerminated,
    };
  });

  // Update heartbeat only on mount and when visibility changes (not continuously)
  useEffect(() => {
    if (!state.isIOS || !state.isPWA) return;

    // Write heartbeat once on mount
    localStorage.setItem(PWA_HEARTBEAT_KEY, Date.now().toString());
  }, [state.isIOS, state.isPWA]);

  // Persist critical app state before backgrounding
  const persistAppState = useCallback(() => {
    if (!state.isIOS || !state.isPWA) return;

    const appState = {
      timestamp: Date.now(),
      url: window.location.href,
      scrollPosition: window.scrollY,
    };

    localStorage.setItem(PWA_STATE_KEY, JSON.stringify(appState));
    // Update heartbeat when going to background so we can detect termination
    localStorage.setItem(PWA_HEARTBEAT_KEY, Date.now().toString());
  }, [state.isIOS, state.isPWA]);

  // Restore app state after restoration
  const restoreAppState = useCallback(() => {
    if (!state.isIOS || !state.isPWA) return null;

    try {
      const savedState = localStorage.getItem(PWA_STATE_KEY);
      if (savedState) {
        const appState = JSON.parse(savedState);
        // Restore scroll position after a brief delay
        setTimeout(() => {
          window.scrollTo(0, appState.scrollPosition || 0);
        }, 100);
        return appState;
      }
    } catch (error) {
      console.warn('Failed to restore app state:', error);
    }
    return null;
  }, [state.isIOS, state.isPWA]);

  const handleVisibilityChange = useCallback(() => {
    const isNowVisible = !document.hidden;
    const now = Date.now();

    setState(prev => {
      if (isNowVisible && !prev.isVisible) {
        // App becoming visible
        const timeInBackground = now - prev.lastVisibleTime;

        // For iOS PWA, treat any backgrounding > 3 seconds as potential termination
        const wasLikelyTerminated = prev.isIOS && prev.isPWA && timeInBackground > 3000;

        return {
          ...prev,
          isVisible: true,
          lastVisibleTime: now,
          resumeCount: prev.resumeCount + 1,
          wasRestored: wasLikelyTerminated,
          isRestoring: wasLikelyTerminated,
        };
      } else if (!isNowVisible && prev.isVisible) {
        // App becoming hidden - persist state for iOS PWA
        persistAppState();

        return {
          ...prev,
          isVisible: false,
          lastVisibleTime: now,
        };
      }

      return prev;
    });
  }, [persistAppState]);

  // iOS-specific page restoration handling
  const handlePageShow = useCallback(
    (event: PageTransitionEvent) => {
      if (event.persisted && state.isIOS && state.isPWA) {
        console.log('iOS PWA: Page restored from cache');

        // Restore app state
        restoreAppState();

        setState(prev => ({
          ...prev,
          wasRestored: true,
          isVisible: true,
          lastVisibleTime: Date.now(),
          resumeCount: prev.resumeCount + 1,
          isRestoring: false,
        }));
      }
    },
    [state.isIOS, state.isPWA, restoreAppState]
  );

  // Enhanced focus handling for iOS PWA
  const handleFocus = useCallback(() => {
    if (state.isIOS && state.isPWA) {
      console.log('iOS PWA: Window focused');

      // Force visibility check as iOS doesn't always fire visibilitychange
      if (document.hidden) {
        document.dispatchEvent(new Event('visibilitychange'));
      }

      setState(prev => ({
        ...prev,
        isVisible: true,
        lastVisibleTime: Date.now(),
      }));
    }
  }, [state.isIOS, state.isPWA]);

  useEffect(() => {
    // Core visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // iOS-specific event listeners
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleFocus);

    // Additional iOS PWA event listeners
    if (state.isIOS && state.isPWA) {
      const handlePageHide = () => {
        persistAppState();
      };

      const handleBeforeUnload = () => {
        persistAppState();
      };

      window.addEventListener('pagehide', handlePageHide);
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('pageshow', handlePageShow);
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('pagehide', handlePageHide);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleFocus);
    };
  }, [
    handleVisibilityChange,
    handlePageShow,
    handleFocus,
    state.isIOS,
    state.isPWA,
    persistAppState,
  ]);

  // Force refresh function for manual app restoration
  const forceRefresh = useCallback(() => {
    setState(prev => ({
      ...prev,
      resumeCount: prev.resumeCount + 1,
      wasRestored: true,
      isRestoring: false,
    }));
  }, []);

  // Clear restoration state after component updates
  useEffect(() => {
    if (state.wasRestored && state.isRestoring) {
      const timer = setTimeout(() => {
        setState(prev => ({
          ...prev,
          wasRestored: false,
          isRestoring: false,
        }));
      }, 1000);

      return () => clearTimeout(timer);
    }
    // Return undefined when condition is not met
    return undefined;
  }, [state.wasRestored, state.isRestoring]);

  return {
    isVisible: state.isVisible,
    wasRestored: state.wasRestored,
    isRestoring: state.isRestoring,
    lastVisibleTime: state.lastVisibleTime,
    resumeCount: state.resumeCount,
    isIOS: state.isIOS,
    isPWA: state.isPWA,
    forceRefresh,
  };
}
