import { FC, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Deck, LearnModeSettings, LearnSessionState, LearnSessionResults, Question } from '@/types';
import styles from './LearnContainer.module.css';

interface LearnContainerProps {
  deck: Deck;
  settings: LearnModeSettings;
  onComplete: (results: LearnSessionResults) => void;
  onExit: () => void;
}

const LearnContainer: FC<LearnContainerProps> = ({
  deck,
  settings,
  onComplete,
  onExit,
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
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // Initialize session with cards
  useEffect(() => {
    const initializeSession = () => {
      const cards = settings.randomize
        ? [...deck.content].sort(() => Math.random() - 0.5)
        : [...deck.content];

      const roundCards = cards.slice(0, settings.cardsPerRound);

      // For now, create a simple multiple choice question from the first card
      // This will be replaced with proper question generation in Phase 2
      const firstQuestion: Question = {
        id: '1',
        type: 'multiple_choice',
        cardIndex: 0,
        questionText: roundCards[0]?.side_a || '',
        questionSides: ['side_a'],
        correctAnswer: roundCards[0]?.side_b || '',
        options: generateMockOptions(roundCards[0]?.side_b || '', deck.content),
        difficulty: 1,
      };

      setSessionState(prev => ({
        ...prev,
        roundCards,
        currentQuestion: firstQuestion,
        responseStartTime: Date.now(),
      }));

      setIsLoading(false);
    };

    initializeSession();
  }, [deck, settings]);

  // Mock function to generate options (will be replaced in Phase 2)
  const generateMockOptions = (correctAnswer: string, allCards: any[]): string[] => {
    const options = [correctAnswer];
    const otherAnswers = allCards
      .map(c => c.side_b)
      .filter(answer => answer !== correctAnswer)
      .slice(0, 3);

    options.push(...otherAnswers);
    return options.sort(() => Math.random() - 0.5);
  };

  const handleAnswer = useCallback((answer: string, isCorrect: boolean) => {
    // Prevent multiple selections
    if (selectedAnswer || showFeedback) return;

    setSelectedAnswer(answer);
    setShowFeedback(true);

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

    // Move to next question after a delay
    setTimeout(() => {
      handleNextQuestion();
    }, 1500);
  }, [selectedAnswer, showFeedback]);

  const handleNextQuestion = useCallback(() => {
    // Reset selection state for new question
    setSelectedAnswer(null);
    setShowFeedback(false);

    if (sessionState.questionIndex >= sessionState.roundCards.length - 1) {
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
      // Generate next question (simplified for now)
      const nextIndex = sessionState.questionIndex + 1;
      const nextCard = sessionState.roundCards[nextIndex];

      const nextQuestion: Question = {
        id: `${nextIndex + 1}`,
        type: 'multiple_choice',
        cardIndex: nextIndex,
        questionText: nextCard.side_a,
        questionSides: ['side_a'],
        correctAnswer: nextCard.side_b,
        options: generateMockOptions(nextCard.side_b, deck.content),
        difficulty: 1,
      };

      setSessionState(prev => ({
        ...prev,
        questionIndex: nextIndex,
        currentQuestion: nextQuestion,
        responseStartTime: Date.now(),
      }));
    }
  }, [sessionState, deck, onComplete]);

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
        <div className={styles.stats}>
          {sessionState.questionIndex + 1} / {sessionState.roundCards.length}
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
            key={sessionState.currentQuestion.id}
            className={styles.questionContainer}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Question Text */}
            <h2 className={styles.questionText}>
              {sessionState.currentQuestion.questionText}
            </h2>

            {/* Multiple Choice Options (simplified for Phase 1) */}
            {sessionState.currentQuestion.type === 'multiple_choice' && (
              <div className={styles.optionsGrid}>
                {sessionState.currentQuestion.options?.map((option, index) => {
                  const isSelected = selectedAnswer === option;
                  const isCorrect = option === sessionState.currentQuestion?.correctAnswer;
                  const showCorrect = showFeedback && isCorrect;
                  const showIncorrect = showFeedback && isSelected && !isCorrect;

                  return (
                    <button
                      key={option}
                      className={`${styles.optionButton} ${
                        isSelected ? styles.selected : ''
                      } ${showCorrect ? styles.correct : ''} ${
                        showIncorrect ? styles.incorrect : ''
                      }`}
                      onClick={() => handleAnswer(option, isCorrect)}
                      disabled={showFeedback}
                    >
                      <span className={styles.optionLetter}>
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className={styles.optionText}>{option}</span>
                    </button>
                  );
                })}
              </div>
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