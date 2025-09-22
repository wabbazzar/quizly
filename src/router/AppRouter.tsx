import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { PageLazyBoundary } from '@/components/common/LazyLoadBoundary';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
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
          path="/"
          element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]} resetOnPropsChange>
              <PageLazyBoundary pageName="Home">
                <LazyHome />
              </PageLazyBoundary>
            </ErrorBoundary>
          }
        />
        <Route
          path="/deck/:deckId"
          element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]} resetOnPropsChange>
              <PageLazyBoundary pageName="Deck">
                <LazyDeck />
              </PageLazyBoundary>
            </ErrorBoundary>
          }
        />
        <Route
          path="/deck/:deckId/results"
          element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]} resetOnPropsChange>
              <PageLazyBoundary pageName="Results">
                <LazyResults />
              </PageLazyBoundary>
            </ErrorBoundary>
          }
        />
        <Route
          path="/flashcards/:deckId"
          element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]} resetOnPropsChange>
              <PageLazyBoundary pageName="Flashcards">
                <LazyFlashcards />
              </PageLazyBoundary>
            </ErrorBoundary>
          }
        />
        <Route
          path="/learn/:deckId"
          element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]} resetOnPropsChange>
              <PageLazyBoundary pageName="Learn">
                <LazyLearn />
              </PageLazyBoundary>
            </ErrorBoundary>
          }
        />
        <Route
          path="/match/:deckId"
          element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]} resetOnPropsChange>
              <PageLazyBoundary pageName="Match">
                <LazyMatch />
              </PageLazyBoundary>
            </ErrorBoundary>
          }
        />
        <Route
          path="/learn-demo"
          element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]} resetOnPropsChange>
              <PageLazyBoundary pageName="Learn Demo">
                <LazyLearnDemo />
              </PageLazyBoundary>
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
