import { FC, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LearnSessionResults } from '@/types';
import styles from './SessionComplete.module.css';

interface SessionCompleteProps {
  results: LearnSessionResults;
  deckName: string;
  onRetry: () => void;
  onBackToDeck: () => void;
}

export const SessionComplete: FC<SessionCompleteProps> = memo(({
  results,
  deckName,
  onRetry,
  onBackToDeck,
}) => {
  const navigate = useNavigate();

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const getPerformanceMessage = () => {
    const accuracy = results.accuracy;

    if (accuracy >= 90) {
      return { message: 'Outstanding!', emoji: '🌟', color: 'excellent' };
    } else if (accuracy >= 80) {
      return { message: 'Great job!', emoji: '🎉', color: 'great' };
    } else if (accuracy >= 70) {
      return { message: 'Good work!', emoji: '👍', color: 'good' };
    } else if (accuracy >= 60) {
      return { message: 'Keep practicing!', emoji: '💪', color: 'fair' };
    } else {
      return { message: "Don't give up!", emoji: '🚀', color: 'needsWork' };
    }
  };

  const performance = getPerformanceMessage();

  return (
    <motion.div
      className={styles.sessionComplete}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      data-testid="session-complete"
    >
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <motion.div
            className={styles.emoji}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            {performance.emoji}
          </motion.div>
          <h1 className={`${styles.title} ${styles[performance.color]}`}>
            {performance.message}
          </h1>
          <p className={styles.subtitle}>
            You completed the Learn session for {deckName}
          </p>
        </header>

        {/* Results Summary */}
        <div className={styles.resultsGrid}>
          <motion.div
            className={styles.resultCard}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className={styles.resultValue}>
              {Math.round(results.accuracy)}%
            </div>
            <div className={styles.resultLabel}>Accuracy</div>
          </motion.div>

          <motion.div
            className={styles.resultCard}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className={styles.resultValue}>
              {results.correctAnswers}/{results.totalQuestions}
            </div>
            <div className={styles.resultLabel}>Correct</div>
          </motion.div>

          <motion.div
            className={styles.resultCard}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className={styles.resultValue}>
              {results.maxStreak}
            </div>
            <div className={styles.resultLabel}>Best Streak</div>
          </motion.div>

          <motion.div
            className={styles.resultCard}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className={styles.resultValue}>
              {formatTime(results.averageResponseTime)}
            </div>
            <div className={styles.resultLabel}>Avg Time</div>
          </motion.div>
        </div>

        {/* Card Mastery */}
        {(results.masteredCards.length > 0 || results.strugglingCards.length > 0) && (
          <motion.div
            className={styles.masterySection}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            {results.masteredCards.length > 0 && (
              <div className={styles.masteryItem}>
                <span className={`${styles.masteryIcon} ${styles.mastered}`}>✨</span>
                <span className={styles.masteryText}>
                  Mastered <strong>{results.masteredCards.length}</strong> cards
                </span>
              </div>
            )}
            {results.strugglingCards.length > 0 && (
              <div className={styles.masteryItem}>
                <span className={`${styles.masteryIcon} ${styles.struggling}`}>📚</span>
                <span className={styles.masteryText}>
                  <strong>{results.strugglingCards.length}</strong> cards need more practice
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Session Duration */}
        <motion.div
          className={styles.duration}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Session duration: {formatTime(results.duration)}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className={styles.actions}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <button
            className={`${styles.actionButton} ${styles.primary}`}
            onClick={onRetry}
            data-testid="retry-button"
          >
            Practice Again
          </button>
          <button
            className={`${styles.actionButton} ${styles.secondary}`}
            onClick={onBackToDeck}
            data-testid="back-button"
          >
            Back to Deck
          </button>
          <button
            className={`${styles.actionButton} ${styles.tertiary}`}
            onClick={() => navigate('/')}
            data-testid="home-button"
          >
            Home
          </button>
        </motion.div>

        {/* Motivational Message */}
        {results.accuracy < 70 && (
          <motion.p
            className={styles.motivationalMessage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            Remember: Every expert was once a beginner. Keep practicing and you&apos;ll
            improve with each session!
          </motion.p>
        )}
      </div>
    </motion.div>
  );
});

SessionComplete.displayName = 'SessionComplete';