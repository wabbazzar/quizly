import { FC, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Deck, LearnModeSettings, LearnSessionState, LearnSessionResults } from '@/types';
import { useQuestionGenerator } from '@/hooks/useQuestionGenerator';
import { useCardScheduler } from '@/hooks/useCardScheduler';
import { QuestionCard } from './QuestionCard';
import SettingsIcon from '@/components/icons/SettingsIcon';
import styles from './LearnContainer.module.css';

interface LearnContainerProps {
  deck: Deck;
  settings: LearnModeSettings;
  onComplete: (results: LearnSessionResults) => void;
  onExit: () => void;
  onOpenSettings: () => void;
}

const LearnContainer: FC<LearnContainerProps> = ({
  deck,
  settings,
  onComplete,
  onExit,
  onOpenSettings,
}) => {
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

  const [isLoading, setIsLoading] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; correctAnswer?: string; explanation?: string } | undefined>(undefined);

  // Use the new hooks
  const questionGenerator = useQuestionGenerator(deck, settings);
  const scheduler = useCardScheduler(settings);

  // Initialize session with cards - only on deck change
  useEffect(() => {
    const initializeSession = () => {
      // Check if deck has content (this is now handled by parent, but keep as safety check)
      if (!deck.content || deck.content.length === 0) {
        setIsLoading(false);
        return;
      }

      // Select cards based on progression mode
      let cards = [...deck.content];

      switch (settings.progressionMode) {
        case 'sequential':
          // Keep original order
          break;
        case 'level':
          // Sort by level, then by index within level
          cards.sort((a, b) => {
            if (a.level !== b.level) return a.level - b.level;
            return a.idx - b.idx;
          });
          break;
        case 'random':
        default:
          // Randomize
          cards.sort(() => Math.random() - 0.5);
          break;
      }

      // Apply additional randomization if settings.randomize is true
      if (settings.randomize && settings.progressionMode !== 'random') {
        // Partial shuffle within groups
        cards = cards.map((card, i) => ({ card, sort: Math.random(), originalIndex: i }))
          .sort((a, b) => {
            // Keep general order but add some randomness
            const groupSize = 5;
            const aGroup = Math.floor(a.originalIndex / groupSize);
            const bGroup = Math.floor(b.originalIndex / groupSize);
            if (aGroup !== bGroup) return aGroup - bGroup;
            return a.sort - b.sort;
          })
          .map(item => item.card);
      }

      const roundCards = cards.slice(0, settings.cardsPerRound);

      // Generate questions using the new generator
      questionGenerator.generateRound(roundCards);

      setSessionState(prev => ({
        ...prev,
        roundCards,
        currentQuestion: questionGenerator.currentQuestion,
        responseStartTime: Date.now(),
      }));

      setIsLoading(false);
    };

    initializeSession();
    // Only re-initialize when deck changes, not settings
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.id]);

  // Update current question when generator changes
  useEffect(() => {
    if (questionGenerator.currentQuestion) {
      setSessionState(prev => ({
        ...prev,
        currentQuestion: questionGenerator.currentQuestion,
        questionIndex: questionGenerator.currentQuestionIndex,
      }));
    }
  }, [questionGenerator.currentQuestion, questionGenerator.currentQuestionIndex]);

  const handleAnswer = useCallback((_answer: string, isCorrect: boolean) => {
    // If we already have feedback and this is a correction (marking as correct)
    if (showFeedback && isCorrect) {
      // Update the state to reflect the corrected answer
      const cardId = `card_${sessionState.currentQuestion?.cardIndex}`;

      // Mark as correct in scheduler
      scheduler.markCardCorrect(cardId);

      // Update session state
      setSessionState(prev => {
        const newCorrectCards = new Set(prev.correctCards);
        const newIncorrectCards = new Set(prev.incorrectCards);

        // Move from incorrect to correct
        newIncorrectCards.delete(prev.questionIndex);
        newCorrectCards.add(prev.questionIndex);

        // Restore streak
        const newStreak = prev.currentStreak + 1;
        const newMaxStreak = Math.max(prev.maxStreak, newStreak);

        return {
          ...prev,
          correctCards: newCorrectCards,
          incorrectCards: newIncorrectCards,
          currentStreak: newStreak,
          maxStreak: newMaxStreak,
        };
      });

      // Update feedback to show it's now correct
      setFeedback({
        isCorrect: true,
        correctAnswer: sessionState.currentQuestion?.correctAnswer,
      });

      return;
    }

    // Prevent multiple initial selections
    if (showFeedback) return;

    setShowFeedback(true);
    setFeedback({
      isCorrect,
      correctAnswer: sessionState.currentQuestion?.correctAnswer,
    });

    const responseTime = Date.now() - sessionState.responseStartTime;
    const cardId = `card_${sessionState.currentQuestion?.cardIndex}`;

    // Track missed cards for scheduling
    if (!isCorrect && sessionState.currentQuestion) {
      scheduler.trackMissedCard(
        cardId,
        sessionState.currentQuestion.cardIndex,
        responseTime
      );
    } else if (isCorrect) {
      scheduler.markCardCorrect(cardId);

      // Mark MC question as correct for progressive learning
      if (sessionState.currentQuestion?.type === 'multiple_choice' &&
          !sessionState.currentQuestion?.isFollowUp) {
        questionGenerator.markMCCorrect(sessionState.currentQuestion.cardIndex);
      }
    }

    setSessionState(prev => {
      const newCorrectCards = new Set(prev.correctCards);
      const newIncorrectCards = new Set(prev.incorrectCards);

      if (isCorrect) {
        newCorrectCards.add(prev.questionIndex);
      } else {
        newIncorrectCards.add(prev.questionIndex);
      }

      const newStreak = isCorrect ? prev.currentStreak + 1 : 0;
      const newMaxStreak = Math.max(prev.maxStreak, newStreak);

      return {
        ...prev,
        correctCards: newCorrectCards,
        incorrectCards: newIncorrectCards,
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
      };
    });

    // Don't auto-advance - let user control when to move to next question
  }, [showFeedback, sessionState, scheduler, questionGenerator]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow Enter key to proceed to next question when feedback is shown
      if (e.key === 'Enter' && showFeedback) {
        e.preventDefault();
        handleNextQuestion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFeedback]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNextQuestion = useCallback(() => {
    // Reset selection state for new question
    setShowFeedback(false);
    setFeedback(undefined);

    if (!questionGenerator.hasNext) {
      // Session complete
      const results: LearnSessionResults = {
        deckId: deck.id,
        totalQuestions: sessionState.roundCards.length,
        correctAnswers: sessionState.correctCards.size,
        incorrectAnswers: sessionState.incorrectCards.size,
        accuracy: (sessionState.correctCards.size / sessionState.roundCards.length) * 100,
        averageResponseTime: 0, // Will be calculated properly in Phase 4
        maxStreak: sessionState.maxStreak,
        duration: Date.now() - sessionState.startTime,
        masteredCards: Array.from(sessionState.correctCards),
        strugglingCards: Array.from(sessionState.incorrectCards),
      };

      onComplete(results);
    } else {
      // Move to next question using the generator
      questionGenerator.nextQuestion();

      setSessionState(prev => ({
        ...prev,
        responseStartTime: Date.now(),
      }));
    }
  }, [questionGenerator, sessionState, deck, onComplete]);

  // Check for empty deck content
  if (!deck.content || deck.content.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <h2>No Cards Available</h2>
        <p>This deck doesn&apos;t have any cards yet.</p>
        <button onClick={onExit} className={styles.backButton}>
          Back to Deck
        </button>
      </div>
    );
  }

  if (isLoading || !sessionState.currentQuestion) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Preparing questions...</p>
      </div>
    );
  }

  const progress = ((sessionState.questionIndex + 1) / sessionState.roundCards.length) * 100;

  return (
    <div className={styles.learnContainer}>
      {/* Header */}
      <header className={styles.header}>
        <button onClick={onExit} className={styles.exitButton}>
          ← Exit
        </button>
        <div className={styles.deckName}>{deck.metadata.deck_name}</div>
        <div className={styles.headerRight}>
          <div className={styles.stats}>
            {sessionState.questionIndex + 1} / {sessionState.roundCards.length}
          </div>
          <button onClick={onOpenSettings} className={styles.settingsButton} aria-label="Settings">
            <SettingsIcon size={20} />
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className={styles.progressBar}>
        <motion.div
          className={styles.progressFill}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Main Content */}
      <main className={styles.mainContent}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${sessionState.currentQuestion.id}-${sessionState.questionIndex}`}
            className={styles.questionContainer}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <QuestionCard
              question={sessionState.currentQuestion}
              onAnswer={handleAnswer}
              showFeedback={showFeedback}
              feedback={feedback}
              disabled={showFeedback}
            />

            {/* Next button appears after feedback */}
            {showFeedback && (
              <motion.div
                className={styles.navigationButtons}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <button
                  onClick={handleNextQuestion}
                  className={styles.nextButton}
                  aria-label="Next question"
                >
                  Next →
                </button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Streak Indicator */}
        {sessionState.currentStreak > 0 && (
          <motion.div
            className={styles.streakIndicator}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            🔥 {sessionState.currentStreak}
          </motion.div>
        )}
      </main>

      {/* Footer Stats */}
      <footer className={styles.footer}>
        <div className={styles.footerStat}>
          <span className={styles.footerLabel}>Correct</span>
          <span className={styles.footerValue}>{sessionState.correctCards.size}</span>
        </div>
        <div className={styles.footerStat}>
          <span className={styles.footerLabel}>Incorrect</span>
          <span className={styles.footerValue}>{sessionState.incorrectCards.size}</span>
        </div>
        <div className={styles.footerStat}>
          <span className={styles.footerLabel}>Streak</span>
          <span className={styles.footerValue}>{sessionState.currentStreak}</span>
        </div>
      </footer>
    </div>
  );
};

export default LearnContainer;