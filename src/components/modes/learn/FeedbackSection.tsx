import { FC, memo } from 'react';
import cn from 'classnames';
import styles from './FeedbackSection.module.css';

interface FeedbackSectionProps {
  isCorrect: boolean;
  correctAnswer?: string;
  explanation?: string;
}

export const FeedbackSection: FC<FeedbackSectionProps> = memo(({
  isCorrect,
  correctAnswer,
  explanation,
}) => {
  return (
    <div
      className={cn(
        styles.feedbackSection,
        isCorrect ? styles.correct : styles.incorrect
      )}
      role="alert"
      aria-live="polite"
      data-testid="feedback-section"
    >
      <div className={styles.feedbackHeader}>
        <span className={styles.feedbackIcon} aria-hidden="true">
          {isCorrect ? '✓' : '✗'}
        </span>
        <h3 className={styles.feedbackTitle}>
          {isCorrect ? 'Correct!' : 'Not quite right'}
        </h3>
      </div>

      <div className={styles.feedbackContent}>
        {!isCorrect && correctAnswer && (
          <div className={styles.correctAnswerWrapper}>
            <span className={styles.correctAnswerLabel}>Correct answer:</span>
            <span className={styles.correctAnswerText}>{correctAnswer}</span>
          </div>
        )}

        {explanation && (
          <div className={styles.explanationWrapper}>
            <p className={styles.explanationText}>{explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
});

FeedbackSection.displayName = 'FeedbackSection';