import { FC, memo } from 'react';
import { SessionMetricsProps } from '../types';
import styles from './SessionMetrics.module.css';

export const SessionMetrics: FC<SessionMetricsProps> = memo(({
  correctCount,
  incorrectCount,
  currentStreak,
  maxStreak,
  timeElapsed,
  progressPercentage,
  totalCards,
  masteredCount,
}) => {
  // Format time elapsed
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Calculate accuracy
  const totalAnswered = correctCount + incorrectCount;
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

  return (
    <div className={styles.metricsContainer} data-testid="session-metrics">
      {/* Progress Bar */}
      <div className={styles.progressSection}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className={styles.progressText}>
          {Math.round(progressPercentage)}% Complete ({totalAnswered}/{totalCards} cards)
        </div>
      </div>

      {/* Metrics Grid */}
      <div className={styles.metricsGrid}>
        {/* Accuracy */}
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Accuracy</div>
          <div className={styles.metricValue}>{accuracy}%</div>
          <div className={styles.metricDetails}>
            {correctCount} correct, {incorrectCount} incorrect
          </div>
        </div>

        {/* Streak */}
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Streak</div>
          <div className={styles.metricValue}>{currentStreak}</div>
          <div className={styles.metricDetails}>
            Max: {maxStreak}
          </div>
        </div>

        {/* Mastered Cards */}
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Mastered</div>
          <div className={styles.metricValue}>{masteredCount}</div>
          <div className={styles.metricDetails}>
            cards mastered
          </div>
        </div>

        {/* Time */}
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Time</div>
          <div className={styles.metricValue}>{formatTime(timeElapsed)}</div>
          <div className={styles.metricDetails}>
            elapsed
          </div>
        </div>
      </div>
    </div>
  );
});