import { FC, memo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QuestionFlowProps } from '../types';
import { QuestionCard } from '../QuestionCard';
import styles from './QuestionFlow.module.css';

export const QuestionFlow: FC<QuestionFlowProps> = memo(
  ({
    currentCard,
    currentQuestion,
    showFeedback,
    feedback,
    onAnswerSubmit,
    onQuestionComplete,
    onShowCardDetails,
  }) => {
    // Handle answer submission
    const handleAnswerSubmit = useCallback(
      (answer: string, isCorrect: boolean) => {
        if (!currentCard) return;
        onAnswerSubmit(answer, isCorrect, currentCard.idx);
      },
      [currentCard, onAnswerSubmit]
    );

    // Handle show card details
    const handleShowDetails = useCallback(() => {
      if (currentCard) {
        onShowCardDetails(currentCard);
      }
    }, [currentCard, onShowCardDetails]);

    // Handle keyboard shortcut for continue button (Enter key)
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!showFeedback || e.key !== 'Enter') return;

        const target = e.target as HTMLElement | null;
        const isTypingTarget =
          !!target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.getAttribute('contenteditable') === 'true');

        if (isTypingTarget) return;

        e.preventDefault();
        onQuestionComplete();
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showFeedback, onQuestionComplete]);

    if (!currentQuestion) {
      return (
        <div className={styles.noQuestion}>
          <p>No questions available</p>
        </div>
      );
    }

    return (
      <div className={styles.questionFlowContainer} data-testid="question-flow">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion?.id || 'no-question'}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className={styles.questionWrapper}
          >
            {/* Question Card handles all the question display and feedback */}
            <QuestionCard
              question={currentQuestion}
              card={currentCard || undefined}
              onAnswer={handleAnswerSubmit}
              showFeedback={showFeedback}
              feedback={feedback}
              onShowCardDetails={handleShowDetails}
            />

            {/* Continue button when feedback is shown */}
            {showFeedback && (
              <div className={styles.continueSection}>
                <button
                  onClick={onQuestionComplete}
                  className={styles.continueButton}
                  autoFocus
                  data-testid="continue-button"
                >
                  Continue (Enter)
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }
);
