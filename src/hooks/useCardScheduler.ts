import { useState, useCallback, useMemo } from 'react';
import { Card, MissedCard, LearnModeSettings, SchedulerConfig } from '@/types';
import { CardSchedulerFactory } from '@/services/cardScheduler';

interface UseCardSchedulerReturn {
  missedCards: Map<string, MissedCard>;
  trackMissedCard: (cardId: string, cardIndex: number, responseTime: number) => void;
  markCardCorrect: (cardId: string) => void;
  scheduleCards: (upcomingCards: Card[]) => Card[];
  changeAlgorithm: (algorithm: string) => void;
  availableAlgorithms: Array<{ key: string; name: string; description: string }>;
  currentAlgorithm: string;
  resetScheduler: () => void;
}

export const useCardScheduler = (settings: LearnModeSettings): UseCardSchedulerReturn => {
  const [missedCards, setMissedCards] = useState<Map<string, MissedCard>>(new Map());

  // Map scheduling algorithm to supported ones
  const getValidAlgorithm = (algorithm?: string): 'smart_spaced' | 'leitner_box' => {
    if (algorithm === 'leitner_box') return 'leitner_box';
    // Default all other options to smart_spaced for now
    return 'smart_spaced';
  };

  const [currentAlgorithm, setCurrentAlgorithm] = useState<'smart_spaced' | 'leitner_box'>(
    getValidAlgorithm(settings.schedulingAlgorithm)
  );

  const scheduler = useMemo(() => {
    return CardSchedulerFactory.getScheduler(currentAlgorithm);
  }, [currentAlgorithm]);

  const config = useMemo<SchedulerConfig>(() => ({
    algorithm: currentAlgorithm as 'smart_spaced' | 'leitner_box',
    aggressiveness: settings.aggressiveness || 'balanced',
    minSpacing: settings.minSpacing || 2,
    maxSpacing: settings.maxSpacing || 8,
    clusterLimit: settings.clusterLimit || 2,
    progressRatio: settings.progressRatio || 0.3,
    difficultyWeight: settings.difficultyWeight || 0.5,
  }), [settings, currentAlgorithm]);

  const trackMissedCard = useCallback((
    cardId: string,
    cardIndex: number,
    responseTime: number
  ) => {
    setMissedCards(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(cardId);

      const updated: MissedCard = existing ? {
        ...existing,
        missCount: existing.missCount + 1,
        lastSeen: Date.now(),
        responseTime,
        difficulty: Math.min(1, existing.difficulty + 0.1),
      } : {
        cardId,
        cardIndex,
        missCount: 1,
        lastSeen: Date.now(),
        difficulty: 0.5,
        responseTime,
      };

      // Calculate difficulty based on miss count and response time
      updated.difficulty = Math.min(1,
        (updated.missCount * 0.2) +
        (responseTime > 10000 ? 0.3 : 0)
      );

      newMap.set(cardId, updated);
      return newMap;
    });
  }, []);

  const markCardCorrect = useCallback((cardId: string) => {
    setMissedCards(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(cardId);

      if (!existing) return prev;

      // If card was only missed once and now correct, remove it
      if (existing.missCount === 1) {
        newMap.delete(cardId);
      } else {
        // Reduce difficulty and miss count
        newMap.set(cardId, {
          ...existing,
          difficulty: existing.difficulty * 0.7,
          missCount: Math.max(0, existing.missCount - 1),
        });
      }

      return newMap;
    });
  }, []);

  const scheduleCards = useCallback((upcomingCards: Card[]): Card[] => {
    if (missedCards.size === 0) return upcomingCards;

    const missedArray = Array.from(missedCards.values());
    return scheduler.schedule(missedArray, upcomingCards, config);
  }, [missedCards, scheduler, config]);

  const changeAlgorithm = useCallback((algorithm: string) => {
    setCurrentAlgorithm(algorithm as 'smart_spaced' | 'leitner_box');
  }, []);

  const resetScheduler = useCallback(() => {
    setMissedCards(new Map());
  }, []);

  const availableAlgorithms = useMemo(() => {
    return CardSchedulerFactory.getAvailableAlgorithms();
  }, []);

  return {
    missedCards,
    trackMissedCard,
    markCardCorrect,
    scheduleCards,
    changeAlgorithm,
    availableAlgorithms,
    currentAlgorithm,
    resetScheduler,
  };
};