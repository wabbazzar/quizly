import { useState, useCallback, useEffect } from 'react';
import {
  Deck,
  Card,
  Question,
  LearnModeSettings,
  LearnSessionState,
  LearnSessionResults
} from '@/types';
import { LearnSessionProgress } from '@/components/modes/learn/LearnProgress';
import { QuestionGenerator } from '@/services/questionGenerator';
import { useCardScheduler } from './useCardScheduler';

interface LearnSessionOptions {
  cardsPerRound: number;
  questionTypes: ('multiple_choice' | 'free_text')[];
  adaptiveDifficulty: boolean;
  masteryThreshold: number;
}

export const useLearnSession = (
  deck: Deck,
  options: LearnSessionOptions
) => {
  const [sessionState, setSessionState] = useState<LearnSessionState>({
    currentQuestion: null,
    questionIndex: 0,
    roundCards: [],
    correctCards: new Set(),
    incorrectCards: new Set(),
    currentStreak: 0,
    maxStreak: 0,
    startTime: Date.now(),
    responseStartTime: Date.now(),
  });

  const [progress, setProgress] = useState<LearnSessionProgress>({
    questionsAnswered: 0,
    totalQuestions: 0,
    correctAnswers: 0,
    currentStreak: 0,
    maxStreak: 0,
    masteredCards: new Set(),
    strugglingCards: new Set(),
    averageResponseTime: 0,
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);

  const scheduler = useCardScheduler({
    schedulingAlgorithm: 'smart_spaced',
    aggressiveness: 'balanced',
    minSpacing: 2,
    maxSpacing: 8,
    clusterLimit: 2,
    progressRatio: 0.3,
    difficultyWeight: 0.5,
  } as LearnModeSettings);

  // Initialize session with cards
  const startRound = useCallback((cards: Card[]) => {
    const roundCards = cards.slice(0, options.cardsPerRound);

    // Generate questions from cards
    const newQuestions = QuestionGenerator.generateQuestions(roundCards, {
      questionTypes: options.questionTypes,
      frontSides: ['side_a'],
      backSides: ['side_b'],
      difficulty: 1,
    });

    setQuestions(newQuestions);
    setSessionState(prev => ({
      ...prev,
      roundCards,
      currentQuestion: newQuestions[0] || null,
      questionIndex: 0,
      responseStartTime: Date.now(),
    }));

    setProgress(prev => ({
      ...prev,
      totalQuestions: newQuestions.length,
      questionsAnswered: 0,
    }));

    setIsComplete(false);
  }, [options]);

  // Answer current question
  const answerQuestion = useCallback((
    _answer: string,
    isCorrect: boolean
  ) => {
    const responseTime = Date.now() - sessionState.responseStartTime;
    setResponseTimes(prev => [...prev, responseTime]);

    // Update progress
    setProgress(prev => {
      const newCorrectAnswers = isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers;
      const newStreak = isCorrect ? prev.currentStreak + 1 : 0;
      const newMaxStreak = Math.max(prev.maxStreak, newStreak);
      const newQuestionsAnswered = prev.questionsAnswered + 1;

      // Update mastered/struggling cards
      const cardIndex = sessionState.currentQuestion?.cardIndex;
      const newMasteredCards = new Set(prev.masteredCards);
      const newStrugglingCards = new Set(prev.strugglingCards);

      if (cardIndex !== undefined) {
        if (isCorrect && newStreak >= options.masteryThreshold) {
          newMasteredCards.add(cardIndex);
          newStrugglingCards.delete(cardIndex);
        } else if (!isCorrect) {
          newStrugglingCards.add(cardIndex);
          // Track missed card for scheduling
          const card = sessionState.roundCards[cardIndex];
          if (card) {
            scheduler.trackMissedCard(
              `card_${cardIndex}`,
              cardIndex,
              responseTime
            );
          }
        }
      }

      // Calculate average response time
      const allResponseTimes = [...responseTimes, responseTime];
      const avgResponseTime = allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length;

      return {
        ...prev,
        questionsAnswered: newQuestionsAnswered,
        correctAnswers: newCorrectAnswers,
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
        masteredCards: newMasteredCards,
        strugglingCards: newStrugglingCards,
        averageResponseTime: avgResponseTime,
      };
    });

    // Update session state
    setSessionState(prev => {
      const newCorrectCards = new Set(prev.correctCards);
      const newIncorrectCards = new Set(prev.incorrectCards);

      if (sessionState.currentQuestion) {
        if (isCorrect) {
          newCorrectCards.add(sessionState.currentQuestion.cardIndex);
          scheduler.markCardCorrect(`card_${sessionState.currentQuestion.cardIndex}`);
        } else {
          newIncorrectCards.add(sessionState.currentQuestion.cardIndex);
        }
      }

      return {
        ...prev,
        correctCards: newCorrectCards,
        incorrectCards: newIncorrectCards,
        currentStreak: isCorrect ? prev.currentStreak + 1 : 0,
        maxStreak: Math.max(
          prev.maxStreak,
          isCorrect ? prev.currentStreak + 1 : prev.currentStreak
        ),
      };
    });
  }, [sessionState, options, scheduler, responseTimes]);

  // Move to next question
  const nextQuestion = useCallback(() => {
    const hasNext = sessionState.questionIndex < questions.length - 1;

    if (hasNext) {
      setSessionState(prev => ({
        ...prev,
        questionIndex: prev.questionIndex + 1,
        currentQuestion: questions[prev.questionIndex + 1],
        responseStartTime: Date.now(),
      }));
    } else {
      // Session complete
      setIsComplete(true);
    }
  }, [sessionState.questionIndex, questions]);

  // Get session results
  const getResults = useCallback((): LearnSessionResults => {
    const duration = Date.now() - sessionState.startTime;

    return {
      deckId: deck.id,
      totalQuestions: progress.totalQuestions,
      correctAnswers: progress.correctAnswers,
      incorrectAnswers: progress.totalQuestions - progress.correctAnswers,
      accuracy: progress.totalQuestions > 0
        ? (progress.correctAnswers / progress.totalQuestions) * 100
        : 0,
      averageResponseTime: progress.averageResponseTime,
      maxStreak: progress.maxStreak,
      duration,
      masteredCards: Array.from(progress.masteredCards),
      strugglingCards: Array.from(progress.strugglingCards),
    };
  }, [deck.id, sessionState.startTime, progress]);

  // Reset session
  const resetSession = useCallback(() => {
    setSessionState({
      currentQuestion: null,
      questionIndex: 0,
      roundCards: [],
      correctCards: new Set(),
      incorrectCards: new Set(),
      currentStreak: 0,
      maxStreak: 0,
      startTime: Date.now(),
      responseStartTime: Date.now(),
    });

    setProgress({
      questionsAnswered: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      currentStreak: 0,
      maxStreak: 0,
      masteredCards: new Set(),
      strugglingCards: new Set(),
      averageResponseTime: 0,
    });

    setQuestions([]);
    setIsComplete(false);
    setResponseTimes([]);
  }, []);

  // Initialize session on mount
  useEffect(() => {
    if (deck && deck.content.length > 0) {
      startRound(deck.content);
    }
  }, [deck]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // State
    sessionState,
    progress,
    currentQuestion: sessionState.currentQuestion,
    isComplete,

    // Actions
    startRound,
    answerQuestion,
    nextQuestion,
    getResults,
    resetSession,

    // Scheduler
    scheduler,
  };
};