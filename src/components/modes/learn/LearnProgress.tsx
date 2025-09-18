import { FC, memo } from 'react';
import cn from 'classnames';
import styles from './LearnProgress.module.css';

export interface LearnSessionProgress {
  questionsAnswered: number;
  totalQuestions: number;
  correctAnswers: number;
  currentStreak: number;
  maxStreak: number;
  passedCards: Set<number>; // Cards answered correctly in this session
  strugglingCards: Set<number>;
  averageResponseTime: number;
}

interface LearnProgressProps {
  progress: LearnSessionProgress;
  className?: string;
}

export const LearnProgress: FC<LearnProgressProps> = memo(({ progress, className }) => {
  const progressPercentage =
    progress.totalQuestions > 0 ? (progress.questionsAnswered / progress.totalQuestions) * 100 : 0;

  const accuracyPercentage =
    progress.questionsAnswered > 0
      ? (progress.correctAnswers / progress.questionsAnswered) * 100
      : 0;

  const formatTime = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className={cn(styles.progressContainer, className)}>
      {/* Progress Bar */}
      <div className={styles.progressBarWrapper}>
        <div
          className={styles.progressBar}
          role="progressbar"
          aria-valuenow={Math.round(progressPercentage)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: ${progress.questionsAnswered} of ${progress.totalQuestions} questions`}
        >
          <div className={styles.progressFill} style={{ width: `${progressPercentage}%` }}>
            {progressPercentage > 20 && (
              <span className={styles.progressText}>{Math.round(progressPercentage)}%</span>
            )}
          </div>
        </div>
        {progressPercentage <= 20 && (
          <span className={styles.progressTextOutside}>{Math.round(progressPercentage)}%</span>
        )}
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Progress</span>
          <span className={styles.statValue}>
            {progress.questionsAnswered}/{progress.totalQuestions}
          </span>
        </div>

        <div className={styles.statItem}>
          <span className={styles.statLabel}>Accuracy</span>
          <span
            className={cn(
              styles.statValue,
              accuracyPercentage >= 80 && styles.goodAccuracy,
              accuracyPercentage < 60 && styles.poorAccuracy
            )}
          >
            {Math.round(accuracyPercentage)}%
          </span>
        </div>

        <div className={styles.statItem}>
          <span className={styles.statLabel}>Streak</span>
          <span className={styles.statValue}>
            {progress.currentStreak}
            {progress.currentStreak >= 3 && (
              <span className={styles.streakFire} aria-label="fire streak">
                🔥
              </span>
            )}
          </span>
        </div>

        <div className={styles.statItem}>
          <span className={styles.statLabel}>Avg Time</span>
          <span className={styles.statValue}>{formatTime(progress.averageResponseTime)}</span>
        </div>
      </div>

      {/* Mastery Indicators */}
      <div className={styles.masterySection}>
        <div className={styles.masteryIndicators}>
          <div className={styles.masteryItem}>
            <div className={cn(styles.masteryDot, styles.masteredDot)} aria-hidden="true" />
            <span className={styles.masteryLabel}>
              Mastered
              <strong className={styles.masteryCount}>{progress.passedCards.size}</strong>
            </span>
          </div>

          <div className={styles.masteryItem}>
            <div className={cn(styles.masteryDot, styles.strugglingDot)} aria-hidden="true" />
            <span className={styles.masteryLabel}>
              Needs Practice
              <strong className={styles.masteryCount}>{progress.strugglingCards.size}</strong>
            </span>
          </div>

          {progress.maxStreak > 0 && (
            <div className={styles.masteryItem}>
              <span className={styles.masteryLabel}>
                Best Streak
                <strong className={styles.masteryCount}>{progress.maxStreak}</strong>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

LearnProgress.displayName = 'LearnProgress';
