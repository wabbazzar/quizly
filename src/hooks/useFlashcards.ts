import { useState, useEffect, useCallback } from 'react';
import { useDeckStore } from '@/store/deckStore';
import { FlashcardsSettings, Card } from '@/types';

export const useFlashcards = (deckId: string) => {
  const {
    activeDeck,
    currentSession,
    selectDeck,
    startSession,
    updateSessionProgress,
    nextCard,
    endSession,
  } = useDeckStore();

  const [isFlipped, setIsFlipped] = useState(false);
  const [settings, setSettings] = useState<FlashcardsSettings>({
    frontSides: ['side_a'],
    backSides: ['side_b', 'side_c'],
    enableTimer: false,
    timerSeconds: 20,
    enableAudio: false,
    groupSides: {},
  });

  useEffect(() => {
    selectDeck(deckId);
    startSession(deckId, 'flashcards', settings);

    return () => {
      endSession();
    };
  }, [deckId]);

  const currentCard: Card | null =
    activeDeck && currentSession
      ? activeDeck.content[currentSession.currentCardIndex]
      : null;

  const progress = currentSession && activeDeck
    ? ((currentSession.currentCardIndex + 1) / activeDeck.content.length) * 100
    : 0;

  const isComplete = currentSession && activeDeck
    ? currentSession.currentCardIndex >= activeDeck.content.length - 1
    : false;

  const flipCard = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleSwipeLeft = useCallback(() => {
    if (!currentSession || !currentCard) return;

    updateSessionProgress(false, currentCard.idx);
    setIsFlipped(false);

    if (!isComplete) {
      setTimeout(() => {
        nextCard();
      }, 300);
    }
  }, [currentSession, currentCard, isComplete, updateSessionProgress, nextCard]);

  const handleSwipeRight = useCallback(() => {
    if (!currentSession || !currentCard) return;

    updateSessionProgress(true, currentCard.idx);
    setIsFlipped(false);

    if (!isComplete) {
      setTimeout(() => {
        nextCard();
      }, 300);
    }
  }, [currentSession, currentCard, isComplete, updateSessionProgress, nextCard]);

  const updateSettings = useCallback((newSettings: FlashcardsSettings) => {
    setSettings(newSettings);
  }, []);

  const resetSession = useCallback(() => {
    startSession(deckId, 'flashcards', settings);
    setIsFlipped(false);
  }, [deckId, settings, startSession]);

  return {
    currentCard,
    isFlipped,
    correctCount: currentSession?.correctCount || 0,
    incorrectCount: currentSession?.incorrectCount || 0,
    progress,
    isComplete,
    flipCard,
    handleSwipeLeft,
    handleSwipeRight,
    settings,
    updateSettings,
    resetSession,
  };
};