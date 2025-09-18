import { useState, useCallback, useMemo } from 'react';
import { Deck, LearnModeSettings, LearnSessionState } from '@/types';
import { SessionStateManager, SessionMetrics, CardTrackingState } from '../types';

const initialSessionState: LearnSessionState = {
  currentQuestion: null,
  questionIndex: 0,
  roundCards: [],
  correctCards: new Set(),
  incorrectCards: new Set(),
  currentStreak: 0,
  maxStreak: 0,
  startTime: Date.now(),
  responseStartTime: Date.now(),
};

export const useSessionState = (
  deck: Deck,
  _settings: LearnModeSettings
): SessionStateManager & { cardTracking: CardTrackingState } => {
  const [sessionState, setSessionState] = useState<LearnSessionState>(initialSessionState);

  // Card tracking state
  const [masteredCardIndices, setMasteredCardIndices] = useState<Set<number>>(new Set());
  const [strugglingCardIndices, setStrugglingCardIndices] = useState<Set<number>>(new Set());
  const [newlyMasteredCards, setNewlyMasteredCards] = useState<Set<number>>(new Set());

  // Update session state
  const updateSessionState = useCallback((updates: Partial<LearnSessionState>) => {
    setSessionState(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // Reset session
  const resetSession = useCallback(() => {
    setSessionState({
      ...initialSessionState,
      startTime: Date.now(),
      responseStartTime: Date.now(),
    });
    setMasteredCardIndices(new Set());
    setStrugglingCardIndices(new Set());
    setNewlyMasteredCards(new Set());
  }, []);

  // Handle answer submission
  const handleAnswer = useCallback((_answer: string, isCorrect: boolean, cardIdx: number) => {
    setSessionState(prev => {
      const newCorrectCards = new Set(prev.correctCards);
      const newIncorrectCards = new Set(prev.incorrectCards);

      if (isCorrect) {
        newCorrectCards.add(cardIdx);
        // Remove from incorrect if it was there
        newIncorrectCards.delete(cardIdx);

        // Update mastered cards
        setMasteredCardIndices(prevMastered => {
          const newMastered = new Set(prevMastered);
          newMastered.add(cardIdx);
          return newMastered;
        });

        // Remove from struggling if correct
        setStrugglingCardIndices(prevStruggling => {
          const newStruggling = new Set(prevStruggling);
          newStruggling.delete(cardIdx);
          return newStruggling;
        });
      } else {
        newIncorrectCards.add(cardIdx);

        // Add to struggling cards
        setStrugglingCardIndices(prevStruggling => {
          const newStruggling = new Set(prevStruggling);
          newStruggling.add(cardIdx);
          return newStruggling;
        });
      }

      const newStreak = isCorrect ? prev.currentStreak + 1 : 0;
      const newMaxStreak = Math.max(newStreak, prev.maxStreak);

      return {
        ...prev,
        correctCards: newCorrectCards,
        incorrectCards: newIncorrectCards,
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
      };
    });
  }, []);

  // Move to next question
  const nextQuestion = useCallback(() => {
    setSessionState(prev => ({
      ...prev,
      questionIndex: prev.questionIndex + 1,
      responseStartTime: Date.now(),
    }));
  }, []);

  // Calculate metrics
  const metrics = useMemo<SessionMetrics>(() => {
    const totalCards = sessionState.roundCards.length || deck.content.length;
    const correctCount = sessionState.correctCards.size;
    const incorrectCount = sessionState.incorrectCards.size;
    const answeredCount = correctCount + incorrectCount;
    const progressPercentage = totalCards > 0 ? (answeredCount / totalCards) * 100 : 0;
    const timeElapsed = Date.now() - sessionState.startTime;

    return {
      correctCount,
      incorrectCount,
      currentStreak: sessionState.currentStreak,
      maxStreak: sessionState.maxStreak,
      timeElapsed,
      progressPercentage,
      totalCards,
      masteredCount: masteredCardIndices.size,
    };
  }, [
    sessionState.correctCards,
    sessionState.incorrectCards,
    sessionState.currentStreak,
    sessionState.maxStreak,
    sessionState.startTime,
    sessionState.roundCards,
    deck.content.length,
    masteredCardIndices.size,
  ]);

  return {
    sessionState,
    updateSessionState,
    resetSession,
    handleAnswer,
    nextQuestion,
    metrics,
    cardTracking: {
      masteredCardIndices,
      strugglingCardIndices,
      newlyMasteredCards,
    },
  };
};