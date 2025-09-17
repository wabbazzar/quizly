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
import { useCardMasteryStore } from '@/store/cardMasteryStore';

interface LearnSessionOptions {
  cardsPerRound: number;
  questionTypes: ('multiple_choice' | 'free_text')[];
  adaptiveDifficulty: boolean;
  masteryThreshold: number;
  progressiveLearning?: boolean; // Enable progressive learning (free text after correct MC)
}

export const useLearnSession = (
  deck: Deck,
  options: LearnSessionOptions
) => {
  const { getMasteredCards } = useCardMasteryStore();
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
    passedCards: new Set(),
    strugglingCards: new Set(),
    averageResponseTime: 0,
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const [correctMCCards, setCorrectMCCards] = useState<Set<number>>(new Set()); // Track cards that had correct MC answers

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

    // Get mastered cards for the current deck
    const masteredCardIndices = getMasteredCards(deck.id);

    // Generate questions from cards - start with mostly multiple choice
    const newQuestions = QuestionGenerator.generateQuestions(
      roundCards,
      {
        questionTypes: options.questionTypes,
        frontSides: ['side_a'],
        backSides: ['side_b'],
        difficulty: 1,
        forceMultipleChoice: options.progressiveLearning, // Force MC if progressive learning is on
      },
      masteredCardIndices,
      cards  // Pass all cards for distractor selection
    );

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
  }, [options, deck.id, getMasteredCards]);

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
      const newPassedCards = new Set(prev.passedCards);
      const newStrugglingCards = new Set(prev.strugglingCards);

      if (cardIndex !== undefined) {
        if (isCorrect) {
          newPassedCards.add(cardIndex);
          newStrugglingCards.delete(cardIndex);
        } else {
          newStrugglingCards.add(cardIndex);
          newPassedCards.delete(cardIndex);
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
        passedCards: newPassedCards,
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

          // Track MC correct answers for progressive learning
          if (sessionState.currentQuestion.type === 'multiple_choice' &&
              !sessionState.currentQuestion.isFollowUp) {
            setCorrectMCCards(prev => new Set(prev).add(sessionState.currentQuestion!.cardIndex));
          }
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

  // Generate follow-up free text question for correctly answered MC
  const generateFollowUpQuestion = useCallback((originalQuestion: Question): Question | null => {
    if (!options.progressiveLearning || !options.questionTypes.includes('free_text')) {
      return null;
    }

    const card = sessionState.roundCards[originalQuestion.cardIndex];
    if (!card) return null;

    // Generate a free text follow-up question
    const followUpQuestion = QuestionGenerator.generateFreeText(
      card,
      { front: ['side_a'], back: ['side_b'] },
      originalQuestion.cardIndex
    );

    return {
      ...followUpQuestion,
      id: `ft_followup_${originalQuestion.id}_${Date.now()}`,
      isFollowUp: true,
      parentQuestionId: originalQuestion.id,
      questionText: `Now type the answer: ${followUpQuestion.questionText}`,
    };
  }, [options, sessionState.roundCards]);

  // Move to next question
  const nextQuestion = useCallback(() => {
    const currentQ = sessionState.currentQuestion;

    // Check if we should generate a follow-up free text question
    if (options.progressiveLearning &&
        currentQ &&
        currentQ.type === 'multiple_choice' &&
        !currentQ.isFollowUp &&
        correctMCCards.has(currentQ.cardIndex)) {

      // Generate and insert a follow-up free text question
      const followUpQ = generateFollowUpQuestion(currentQ);
      if (followUpQ) {
        // Insert the follow-up question immediately
        setQuestions(prev => {
          const newQuestions = [...prev];
          newQuestions.splice(sessionState.questionIndex + 1, 0, followUpQ);
          return newQuestions;
        });

        setSessionState(prev => ({
          ...prev,
          questionIndex: prev.questionIndex + 1,
          currentQuestion: followUpQ,
          responseStartTime: Date.now(),
        }));
        return;
      }
    }

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
  }, [sessionState, questions, options.progressiveLearning, correctMCCards, generateFollowUpQuestion]);

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
      passedCards: Array.from(progress.passedCards),
      strugglingCards: Array.from(progress.strugglingCards),
      masteredCards: [], // Will be tracked separately in the component
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
      passedCards: new Set(),
      strugglingCards: new Set(),
      averageResponseTime: 0,
    });

    setQuestions([]);
    setIsComplete(false);
    setResponseTimes([]);
    setCorrectMCCards(new Set());
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