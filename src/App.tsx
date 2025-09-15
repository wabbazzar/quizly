import { BrowserRouter } from 'react-router-dom';
import { useEffect } from 'react';
import { AppRouter } from './router/AppRouter';
import { usePWAVisibility } from './hooks/usePWAVisibility';

// Simple loading indicator for iOS PWA restoration
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
        backgroundColor: 'var(--bg-secondary, #F7F8FA)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    />
  );
}

function App() {
  const { wasRestored, resumeCount, isIOS, isPWA, isRestoring } = usePWAVisibility();

  // iOS PWA specific: Force refresh on restoration
  useEffect(() => {
    if (isIOS && isPWA && wasRestored && !isRestoring) {
      console.log('iOS PWA: Forcing component refresh after restoration');
      // Force React to re-render the entire app tree
      const root = document.getElementById('root');
      if (root) {
        root.style.display = 'none';
        // Use requestAnimationFrame to ensure browser has painted
        requestAnimationFrame(() => {
          root.style.display = '';
        });
      }
    }
  }, [wasRestored, isIOS, isPWA, isRestoring]);

  return (
    <BrowserRouter>
      <RestorationOverlay isVisible={isRestoring} />
      <AppRouter key={resumeCount} />
    </BrowserRouter>
  );
}

export default App;