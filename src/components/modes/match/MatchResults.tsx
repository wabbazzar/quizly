import { FC, memo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MatchResultsProps } from './types';
import { useMatchBestTimesStore, formatMatchTime } from '@/store/matchBestTimesStore';
import styles from './MatchResults.module.css';

const MatchResults: FC<MatchResultsProps> = memo(({
  visible,
  results,
  onContinueWithMissed,
  onStartNewRound,
  onBackToDeck
}) => {
  const navigate = useNavigate();
  const { updateBestTime, getBestTime } = useMatchBestTimesStore();
  const [isNewBest, setIsNewBest] = useState(false);
  const [previousBest, setPreviousBest] = useState<string | null>(null);

  // Update best time and check if it's a new record
  useEffect(() => {
    if (!results || !visible) return;

    const existingBest = getBestTime(results.deckId);
    const wasNewBest = updateBestTime(
      results.deckId,
      results.totalTime,
      { rows: 3, cols: 4 }, // Default grid size
      'two_way', // Default match type
      results.totalMatches
    );

    setIsNewBest(wasNewBest);
    setPreviousBest(existingBest ? formatMatchTime(existingBest.bestTimeMs) : null);
  }, [results, visible, updateBestTime, getBestTime]);

  // Keyboard shortcuts: 1 = Play Again, 2 = Back to Deck, 3 = Home
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          (target as any).isContentEditable)
      ) {
        return;
      }

      if (e.key === '1') {
        e.preventDefault();
        if (results?.missedCardIndices && results.missedCardIndices.length > 0) {
          onContinueWithMissed();
        } else {
          onStartNewRound();
        }
      } else if (e.key === '2') {
        e.preventDefault();
        onBackToDeck();
      } else if (e.key === '3') {
        e.preventDefault();
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, results, onContinueWithMissed, onStartNewRound, onBackToDeck, navigate]);

  if (!visible || !results) return null;

  const getPerformanceMessage = () => {
    const averageTimePerMatch = results.totalTime / results.totalMatches;

    if (isNewBest) {
      return { message: 'New Best Time!', emoji: '🏆', color: 'excellent' };
    } else if (averageTimePerMatch < 3000) { // Less than 3 seconds per match
      return { message: 'Lightning Fast!', emoji: '⚡', color: 'excellent' };
    } else if (averageTimePerMatch < 5000) {
      return { message: 'Great Speed!', emoji: '🌟', color: 'great' };
    } else if (averageTimePerMatch < 8000) {
      return { message: 'Good Work!', emoji: '👍', color: 'good' };
    } else {
      return { message: 'Complete!', emoji: '🎉', color: 'fair' };
    }
  };

  const performance = getPerformanceMessage();
  const currentTime = formatMatchTime(results.totalTime);
  const hasMissedCards = results.missedCardIndices && results.missedCardIndices.length > 0;

  return (
    <motion.div
      className={styles.sessionComplete}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      data-testid="match-results"
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
            You completed Round {results.roundNumber} of matching!
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
            <div className={styles.resultValue}>{currentTime}</div>
            <div className={styles.resultLabel}>Time</div>
          </motion.div>

          <motion.div
            className={styles.resultCard}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className={styles.resultValue}>{results.totalMatches}</div>
            <div className={styles.resultLabel}>Matches</div>
          </motion.div>

          <motion.div
            className={styles.resultCard}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className={styles.resultValue}>{results.roundNumber}</div>
            <div className={styles.resultLabel}>Round</div>
          </motion.div>

          {previousBest && (
            <motion.div
              className={styles.resultCard}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className={styles.resultValue}>
                {isNewBest ? previousBest : formatMatchTime(getBestTime(results.deckId)?.bestTimeMs || 0)}
              </div>
              <div className={styles.resultLabel}>
                {isNewBest ? 'Previous Best' : 'Your Best'}
              </div>
            </motion.div>
          )}
        </div>

        {/* Best Time Achievement */}
        {isNewBest && previousBest && (
          <motion.div
            className={styles.achievementSection}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <div className={styles.achievementItem}>
              <span className={`${styles.achievementIcon} ${styles.newBest}`}>🏆</span>
              <span className={styles.achievementText}>
                New personal best! You beat your previous time by{' '}
                <strong>{formatMatchTime(getBestTime(results.deckId)?.bestTimeMs! - results.totalTime)}</strong>
              </span>
            </div>
          </motion.div>
        )}

        {/* Missed Cards Info */}
        {hasMissedCards && (
          <motion.div
            className={styles.missedSection}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className={styles.missedItem}>
              <span className={`${styles.missedIcon} ${styles.review}`}>📚</span>
              <span className={styles.missedText}>
                <strong>{results.missedCardIndices.length}</strong> cards need more practice
              </span>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          className={styles.actions}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          {hasMissedCards ? (
            <>
              <button
                className={`${styles.actionButton} ${styles.primary}`}
                onClick={onContinueWithMissed}
                data-testid="practice-missed-button"
              >
                Practice Missed Cards
              </button>
              <button
                className={`${styles.actionButton} ${styles.secondary}`}
                onClick={onStartNewRound}
                data-testid="new-round-button"
              >
                New Full Round
              </button>
            </>
          ) : (
            <button
              className={`${styles.actionButton} ${styles.primary}`}
              onClick={onStartNewRound}
              data-testid="play-again-button"
            >
              Play Again
            </button>
          )}
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

        {/* Speed tip for slower times */}
        {results.totalTime / results.totalMatches > 8000 && (
          <motion.p
            className={styles.motivationalMessage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            Tip: Try to improve your speed with each round. The more you practice, the faster you'll get!
          </motion.p>
        )}
      </div>
    </motion.div>
  );
});

MatchResults.displayName = 'MatchResults';

export default MatchResults;