import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import LoadingScreen from '@/components/common/LoadingScreen';

// Lazy load pages for code splitting
const Home = lazy(() => import('@/pages/Home'));
const Deck = lazy(() => import('@/pages/Deck'));
const Flashcards = lazy(() => import('@/pages/Flashcards'));
const Learn = lazy(() => import('@/pages/Learn'));

export function AppRouter() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/deck/:deckId" element={<Deck />} />
        <Route path="/flashcards/:deckId" element={<Flashcards />} />
        <Route path="/learn/:deckId" element={<Learn />} />
      </Routes>
    </Suspense>
  );
}