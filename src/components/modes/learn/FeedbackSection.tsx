import { FC, memo } from 'react';
import cn from 'classnames';
import styles from './FeedbackSection.module.css';

interface FeedbackSectionProps {
  isCorrect: boolean;
  correctAnswer?: string;
  explanation?: string;
  isMastered?: boolean;
  onShowCardDetails?: () => void;
}

export const FeedbackSection: FC<FeedbackSectionProps> = memo(
  ({ isCorrect, correctAnswer, explanation, isMastered, onShowCardDetails }) => {
    return (
      <div
        className={cn(styles.feedbackSection, isCorrect ? styles.correct : styles.incorrect)}
        role="alert"
        aria-live="polite"
        data-testid="feedback-section"
      >
        <div className={styles.feedbackHeader}>
          <span className={styles.feedbackIcon} aria-hidden="true">
            {isCorrect ? '✓' : '✗'}
          </span>
          <h3 className={styles.feedbackTitle}>
            {isCorrect ? (isMastered ? 'Card Mastered! 🎯' : 'Correct!') : 'Not quite right'}
          </h3>
        </div>

        <div className={styles.feedbackContent}>
          {!isCorrect && correctAnswer && (
            <div
              className={cn(styles.correctAnswerWrapper, onShowCardDetails && styles.clickable)}
              onClick={onShowCardDetails}
              role={onShowCardDetails ? 'button' : undefined}
              tabIndex={onShowCardDetails ? 0 : undefined}
              onKeyDown={
                onShowCardDetails
                  ? e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onShowCardDetails();
                      }
                    }
                  : undefined
              }
              aria-label={onShowCardDetails ? 'Click to view full card details' : undefined}
            >
              <span className={styles.correctAnswerLabel}>Correct answer:</span>
              <span className={styles.correctAnswerText}>{correctAnswer}</span>
              {onShowCardDetails && (
                <span className={styles.viewDetailsHint} aria-hidden="true">
                  Click to view card details
                </span>
              )}
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
  }
);

FeedbackSection.displayName = 'FeedbackSection';
