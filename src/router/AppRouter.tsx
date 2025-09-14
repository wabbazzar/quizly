import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import LoadingScreen from '@/components/common/LoadingScreen';

// Lazy load pages for code splitting
const Home = lazy(() => import('@/pages/Home'));
const Flashcards = lazy(() => import('@/pages/Flashcards'));

export function AppRouter() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/flashcards/:deckId" element={<Flashcards />} />
      </Routes>
    </Suspense>
  );
}