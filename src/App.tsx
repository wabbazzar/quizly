import { BrowserRouter } from 'react-router-dom';
import { useEffect } from 'react';
import { AppRouter } from './router/AppRouter';
import { useDeckStore } from './store/deckStore';
import { useSyncStore, initSyncPullHandler } from './store/syncStore';
import Notification from './components/common/Notification';
import { BottomNavBar } from './components/navigation/BottomNavBar';

// Register sync pull handler once at module load
initSyncPullHandler();

// Main App component with global notification support
function App() {
  const { loadDecks } = useDeckStore();
  const { initFromStorage } = useSyncStore();

  // Initialize sync state from localStorage (checks for existing session/guest)
  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  // Load all decks on app initialization
  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  // Ask the browser to persist storage so localStorage / IndexedDB aren't
  // evicted under pressure — important for the "resume to last page" behavior
  // and offline deck data.
  useEffect(() => {
    if (!navigator.storage?.persist) return;
    navigator.storage.persist().catch(() => {
      // Best-effort; ignore failures (e.g. permissions denied).
    });
  }, []);

  // NOTE: A previous version rendered a full-viewport RestorationOverlay while
  // usePWAVisibility().isRestoring was true, and remounted the whole router
  // tree via <AppRouter key={resumeCount} />. Both caused the "black screen
  // that only clears after a full app restart" bug, especially in Audio mode:
  //
  //   1. The overlay was a content-less solid-color div (z-index 9999) backed
  //      by --bg-secondary, which reads as black in dark mode.
  //   2. It was supposed to auto-dismiss after 1s, but on iOS PWA setTimeout
  //      callbacks can stall indefinitely after background→foreground
  //      transitions until a user gesture, leaving a permanent black screen.
  //   3. The router-key remount destroyed the <audio> element mid-playback on
  //      every >3s backgrounding, so audio listeners saw a stuck overlay
  //      every time they glanced at another app.
  //
  // React re-renders correctly on resume without the forced remount, so the
  // simpler fix is to trust the framework: no overlay, no key remount.

  const basename = import.meta.env.BASE_URL || '/';

  return (
    <BrowserRouter basename={basename}>
      <Notification />
      <AppRouter />
      <BottomNavBar />
    </BrowserRouter>
  );
}

export default App;
