import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { PageLazyBoundary } from '@/components/common/LazyLoadBoundary';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { AuthGuard } from '@/components/auth/AuthGuard';
import AppErrorPage from '@/pages/AppErrorPage';
import ErrorPage from '@/pages/ErrorPage';
import {
  LazyHome,
  LazyDeck,
  LazyFlashcards,
  LazyLearn,
  LazyMatch,
  LazyLearnDemo,
  LazyResults,
  LazyRead,
  LazyAudioPlayer,
  LazyAllFlashcards,
  LazyAllMatch,
  LazyCreateDeck,
  LazyDeckEditor,
  LazyLogin,
  LazyAbout,
  preloadCriticalComponents,
} from '@/utils/lazyImports';

export function AppRouter() {
  const location = useLocation();

  // Preload critical components on router initialization
  useEffect(() => {
    preloadCriticalComponents().catch(error => {
      console.warn('Failed to preload critical components:', error);
    });
  }, []);

  return (
    <ErrorBoundary
      level="app"
      fallback={AppErrorPage}
      onError={(error, errorInfo) => {
        console.error('App-level error:', error, errorInfo);
      }}
    >
      <Routes>
        <Route
          path="/login"
          element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]} resetOnPropsChange>
              <PageLazyBoundary pageName="Login">
                <LazyLogin />
              </PageLazyBoundary>
            </ErrorBoundary>
          }
        />
        <Route
          path="/about"
          element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]} resetOnPropsChange>
              <PageLazyBoundary pageName="About">
                <LazyAbout />
              </PageLazyBoundary>
            </ErrorBoundary>
          }
        />
        <Route
          path="/"
          element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]} resetOnPropsChange>
              <AuthGuard>
                <PageLazyBoundary pageName="Home">
                  <LazyHome />
                </PageLazyBoundary>
              </AuthGuard>
            </ErrorBoundary>
          }
        />
        <Route
          path="/deck/:deckId"
          element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]} resetOnPropsChange>
              <AuthGuard>
                <PageLazyBoundary pageName="Deck">
                  <LazyDeck />
                </PageLazyBoundary>
              </AuthGuard>
            </ErrorBoundary>
          }
        />
        <Route
          path="/deck/:deckId/results"
          element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]} resetOnPropsChange>
              <AuthGuard>
                <PageLazyBoundary pageName="Results">
                  <LazyResults />
                </PageLazyBoundary>
              </AuthGuard>
            </ErrorBoundary>
          }
        />
        <Route
          path="/flashcards/:deckId"
          element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]} resetOnPropsChange>
              <AuthGuard>
                <PageLazyBoundary pageName="Flashcards">
                  <LazyFlashcards />
                </PageLazyBoundary>
              </AuthGuard>
            </ErrorBoundary>
          }
        />
        <Route
          path="/learn/:deckId"
          element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]} resetOnPropsChange>
              <AuthGuard>
                <PageLazyBoundary pageName="Learn">
                  <LazyLearn />
                </PageLazyBoundary>
              </AuthGuard>
            </ErrorBoundary>
          }
        />
        <Route
          path="/match/:deckId"
          element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]} resetOnPropsChange>
              <AuthGuard>
                <PageLazyBoundary pageName="Match">
                  <LazyMatch />
                </PageLazyBoundary>
              </AuthGuard>
            </ErrorBoundary>
          }
        />
        <Route
          path="/read/:deckId"
          element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]} resetOnPropsChange>
              <AuthGuard>
                <PageLazyBoundary pageName="Read">
                  <LazyRead />
                </PageLazyBoundary>
              </AuthGuard>
            </ErrorBoundary>
          }
        />
        <Route
          path="/learn-demo"
          element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]} resetOnPropsChange>
              <AuthGuard>
                <PageLazyBoundary pageName="Learn Demo">
                  <LazyLearnDemo />
                </PageLazyBoundary>
              </AuthGuard>
            </ErrorBoundary>
          }
        />
        <Route
          path="/audio"
          element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]} resetOnPropsChange>
              <AuthGuard>
                <PageLazyBoundary pageName="Audio Player">
                  <LazyAudioPlayer />
                </PageLazyBoundary>
              </AuthGuard>
            </ErrorBoundary>
          }
        />
        <Route
          path="/all-flashcards"
          element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]} resetOnPropsChange>
              <AuthGuard>
                <PageLazyBoundary pageName="All Flashcards">
                  <LazyAllFlashcards />
                </PageLazyBoundary>
              </AuthGuard>
            </ErrorBoundary>
          }
        />
        <Route
          path="/all-match"
          element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]} resetOnPropsChange>
              <AuthGuard>
                <PageLazyBoundary pageName="All Match">
                  <LazyAllMatch />
                </PageLazyBoundary>
              </AuthGuard>
            </ErrorBoundary>
          }
        />

        <Route
          path="/create-deck"
          element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]} resetOnPropsChange>
              <AuthGuard>
                <PageLazyBoundary pageName="Create Deck">
                  <LazyCreateDeck />
                </PageLazyBoundary>
              </AuthGuard>
            </ErrorBoundary>
          }
        />
        <Route
          path="/deck/:deckId/edit"
          element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]} resetOnPropsChange>
              <AuthGuard>
                <PageLazyBoundary pageName="Deck Editor">
                  <LazyDeckEditor />
                </PageLazyBoundary>
              </AuthGuard>
            </ErrorBoundary>
          }
        />

        {/* Error handling routes */}
        <Route path="/error" element={<ErrorPage />} />

        {/* Catch-all route for 404 errors */}
        <Route path="*" element={<ErrorPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
