import { FC } from 'react';
import styles from './ReadProgress.module.css';

interface Props {
  currentLineIndex: number;
  totalLines: number;
  correctCount: number;
  incorrectCount: number;
}

export const ReadProgress: FC<Props> = ({
  currentLineIndex,
  totalLines,
  correctCount,
  incorrectCount
}) => {
  const progressPercentage = ((currentLineIndex + 1) / totalLines) * 100;
  const accuracy = correctCount + incorrectCount > 0
    ? (correctCount / (correctCount + incorrectCount)) * 100
    : 0;

  return (
    <div className={styles.container}>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Line</span>
          <span className={styles.statValue}>
            {currentLineIndex + 1} / {totalLines}
          </span>
        </div>
        {(correctCount > 0 || incorrectCount > 0) && (
          <>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Correct</span>
              <span className={`${styles.statValue} ${styles.correct}`}>
                {correctCount}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Incorrect</span>
              <span className={`${styles.statValue} ${styles.incorrect}`}>
                {incorrectCount}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Accuracy</span>
              <span className={styles.statValue}>
                {accuracy.toFixed(0)}%
              </span>
            </div>
          </>
        )}
      </div>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
};