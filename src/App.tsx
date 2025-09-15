import { BrowserRouter } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AppRouter } from './router/AppRouter';
import { usePWAVisibility } from './hooks/usePWAVisibility';

// Loading overlay component for iOS PWA restoration
function RestorationOverlay({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        opacity: 0.9,
      }}
    >
      <div
        style={{
          textAlign: 'center',
          color: '#4A90E2',
          fontSize: '18px',
          fontWeight: '500',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e5e7eb',
            borderTop: '3px solid #4A90E2',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        Loading Quizly...
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function App() {
  const { isVisible, wasRestored, resumeCount, isIOS, isPWA, isRestoring } = usePWAVisibility();
  const [appKey, setAppKey] = useState(0);

  useEffect(() => {
    // Log visibility changes for debugging
    console.log('App visibility state:', {
      isVisible,
      wasRestored,
      resumeCount,
      isIOS,
      isPWA,
      isRestoring,
    });
  }, [isVisible, wasRestored, resumeCount, isIOS, isPWA, isRestoring]);

  // iOS PWA restoration handling
  useEffect(() => {
    if (wasRestored && isIOS && isPWA) {
      console.log('iOS PWA: App was restored, forcing refresh');
      setAppKey(prev => prev + 1);
    }
  }, [wasRestored, isIOS, isPWA]);

  // Force re-render when app becomes visible after restoration
  useEffect(() => {
    if (isVisible && resumeCount > 0 && !isRestoring) {
      // App has resumed from background and restoration is complete
      console.log('App resumed from background, triggering refresh...');

      // Dispatch global refresh event for any components that need to refresh
      window.dispatchEvent(new CustomEvent('app-refreshed', {
        detail: { resumeCount, wasRestored, isIOS, isPWA }
      }));
    }
  }, [isVisible, resumeCount, isRestoring, wasRestored, isIOS, isPWA]);

  return (
    <BrowserRouter>
      <RestorationOverlay isVisible={isRestoring} />
      <AppRouter key={`${resumeCount}-${appKey}`} />
    </BrowserRouter>
  );
}

export default App;