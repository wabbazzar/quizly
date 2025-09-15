import { FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './FlashcardsCompletionModal.module.css';

export interface FlashcardSessionResults {
  deckId: string;
  totalCards: number;
  correctCards: number;
  incorrectCards: number;
  accuracy: number;
  roundNumber: number;
  isComplete: boolean;
  missedCardIndices: number[];
  startTime: number;
  endTime: number;
}

interface FlashcardsCompletionModalProps {
  visible: boolean;
  results: FlashcardSessionResults | null;
  onContinueWithMissed: () => void;
  onStartNewRound: () => void;
  onBackToDeck: () => void;
  onClose: () => void;
}

const FlashcardsCompletionModal: FC<FlashcardsCompletionModalProps> = ({
  visible,
  results,
  onContinueWithMissed,
  onStartNewRound,
  onBackToDeck,
  onClose,
}) => {
  if (!results) return null;

  const accuracyPercentage = Math.round(results.accuracy);
  const duration = results.endTime - results.startTime;
  const timeInSeconds = Math.round(duration / 1000);
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  const hasMissedCards = results.missedCardIndices.length > 0;

  const getPerformanceEmoji = () => {
    if (accuracyPercentage === 100) return '🏆';
    if (accuracyPercentage >= 90) return '🌟';
    if (accuracyPercentage >= 75) return '✨';
    if (accuracyPercentage >= 60) return '👍';
    return '💪';
  };

  const getPerformanceMessage = () => {
    if (accuracyPercentage === 100) return 'Perfect Round!';
    if (accuracyPercentage >= 90) return 'Outstanding!';
    if (accuracyPercentage >= 75) return 'Great job!';
    if (accuracyPercentage >= 60) return 'Good effort!';
    return 'Keep practicing!';
  };

  const getRoundMessage = () => {
    if (results.roundNumber === 1) {
      return hasMissedCards
        ? `You completed Round ${results.roundNumber} with ${results.incorrectCards} card${results.incorrectCards === 1 ? '' : 's'} to review.`
        : `You completed Round ${results.roundNumber} perfectly!`;
    }
    return hasMissedCards
      ? `Round ${results.roundNumber} complete! ${results.incorrectCards} card${results.incorrectCards === 1 ? '' : 's'} still need review.`
      : `Round ${results.roundNumber} complete! All cards mastered!`;
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Performance Header */}
            <div className={styles.performanceHeader}>
              <div className={styles.performanceEmoji}>{getPerformanceEmoji()}</div>
              <h2 className={styles.performanceMessage}>{getPerformanceMessage()}</h2>
              <p className={styles.roundMessage}>{getRoundMessage()}</p>
            </div>

            {/* Main Score */}
            <div className={styles.mainScore}>
              <div className={styles.accuracyDisplay}>
                <span className={styles.accuracyNumber}>{accuracyPercentage}</span>
                <span className={styles.accuracyPercent}>%</span>
              </div>
              <p className={styles.accuracyLabel}>Accuracy</p>
            </div>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{results.correctCards}</div>
                <div className={styles.statLabel}>Correct</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{results.incorrectCards}</div>
                <div className={styles.statLabel}>Incorrect</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{results.totalCards}</div>
                <div className={styles.statLabel}>Total Cards</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>
                  {minutes}:{seconds.toString().padStart(2, '0')}
                </div>
                <div className={styles.statLabel}>Time</div>
              </div>
            </div>

            {/* Round Info */}
            <div className={styles.roundInfo}>
              <div className={styles.roundBadge}>Round {results.roundNumber}</div>
              {hasMissedCards && (
                <div className={styles.missedCardsInfo}>
                  {results.incorrectCards} card{results.incorrectCards === 1 ? '' : 's'} to review
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className={styles.actionButtons}>
              {hasMissedCards ? (
                <>
                  <button
                    onClick={onContinueWithMissed}
                    className={`${styles.actionButton} ${styles.primaryButton}`}
                  >
                    Continue with Missed Cards ({results.incorrectCards})
                  </button>
                  <button
                    onClick={onStartNewRound}
                    className={`${styles.actionButton} ${styles.secondaryButton}`}
                  >
                    Start Full Deck Again
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onStartNewRound}
                    className={`${styles.actionButton} ${styles.primaryButton}`}
                  >
                    Start New Round
                  </button>
                </>
              )}
              <button
                onClick={onBackToDeck}
                className={`${styles.actionButton} ${styles.tertiaryButton}`}
              >
                Back to Deck
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FlashcardsCompletionModal;