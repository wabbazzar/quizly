import { FC, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Deck, LearnModeSettings, LearnSessionState, LearnSessionResults } from '@/types';
import { useQuestionGenerator } from '@/hooks/useQuestionGenerator';
import { useCardScheduler } from '@/hooks/useCardScheduler';
import { TextMatcher } from '@/utils/textMatching';
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
  const [userTextInput, setUserTextInput] = useState('');

  // Use the new hooks
  const questionGenerator = useQuestionGenerator(deck, settings);
  const scheduler = useCardScheduler(settings);

  // Initialize session with cards
  useEffect(() => {
    const initializeSession = () => {
      const cards = settings.randomize
        ? [...deck.content].sort(() => Math.random() - 0.5)
        : [...deck.content];

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
  }, [deck, settings]);

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

  const handleAnswer = useCallback((answer: string, isCorrect: boolean) => {
    // Prevent multiple selections
    if (selectedAnswer || showFeedback) return;

    setSelectedAnswer(answer);
    setShowFeedback(true);

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

    // Move to next question after a delay
    setTimeout(() => {
      handleNextQuestion();
    }, 1500);
  }, [selectedAnswer, showFeedback, sessionState.responseStartTime, sessionState.currentQuestion, scheduler]);

  const handleNextQuestion = useCallback(() => {
    // Reset selection state for new question
    setSelectedAnswer(null);
    setShowFeedback(false);
    setUserTextInput('');

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

            {/* Multiple Choice Options */}
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

            {/* Free Text Input */}
            {sessionState.currentQuestion.type === 'free_text' && (
              <div className={styles.freeTextContainer}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!userTextInput.trim() || showFeedback) return;

                    const acceptedAnswers = [
                      sessionState.currentQuestion?.correctAnswer || '',
                      ...(sessionState.currentQuestion?.acceptedAnswers || [])
                    ];
                    const isCorrect = TextMatcher.isMatch(userTextInput, acceptedAnswers);
                    handleAnswer(userTextInput, isCorrect);
                  }}
                  className={styles.freeTextForm}
                >
                  <input
                    type="text"
                    value={userTextInput}
                    onChange={(e) => setUserTextInput(e.target.value)}
                    className={`${styles.textInput} ${
                      showFeedback && selectedAnswer === userTextInput
                        ? TextMatcher.isMatch(userTextInput, [sessionState.currentQuestion?.correctAnswer || ''])
                          ? styles.correct
                          : styles.incorrect
                        : ''
                    }`}
                    placeholder="Type your answer..."
                    disabled={showFeedback}
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={!userTextInput.trim() || showFeedback}
                  >
                    Submit
                  </button>
                </form>
                {showFeedback && !TextMatcher.isMatch(userTextInput, [sessionState.currentQuestion?.correctAnswer || '']) && (
                  <div className={styles.correctAnswerHint}>
                    Correct answer: {sessionState.currentQuestion?.correctAnswer}
                  </div>
                )}
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