import { FC, memo, useState, useCallback, FormEvent, useEffect } from 'react';
import cn from 'classnames';
import { TextMatcher } from '@/utils/textMatching';
import styles from './FreeTextInput.module.css';

interface FreeTextInputProps {
  correctAnswer: string;
  acceptedAnswers?: string[];
  onSubmit: (answer: string, isCorrect: boolean) => void;
  showFeedback: boolean;
  feedback?: { isCorrect: boolean };
  disabled: boolean;
  resetKey?: string | number; // Key to reset input when question changes
}

export const FreeTextInput: FC<FreeTextInputProps> = memo(({
  correctAnswer,
  acceptedAnswers,
  onSubmit,
  showFeedback,
  feedback,
  disabled,
  resetKey,
}) => {
  const [userInput, setUserInput] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Reset input when resetKey changes (new question)
  useEffect(() => {
    setUserInput('');
    setHasSubmitted(false);
  }, [resetKey]);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || hasSubmitted || disabled) return;

    const allAcceptedAnswers = [correctAnswer, ...(acceptedAnswers || [])];
    const isCorrect = TextMatcher.isMatch(userInput, allAcceptedAnswers);

    setHasSubmitted(true);
    onSubmit(userInput, isCorrect);
  }, [userInput, correctAnswer, acceptedAnswers, onSubmit, hasSubmitted, disabled]);

  const handleOverride = useCallback(() => {
    // Allow user to mark their answer as correct
    onSubmit(userInput, true);
  }, [userInput, onSubmit]);

  // Add keyboard listener for "1" key to trigger override
  useEffect(() => {
    if (!showFeedback || feedback?.isCorrect !== false) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Check if "1" key is pressed and no input/textarea is focused
      if (e.key === '1' &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        handleOverride();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showFeedback, feedback?.isCorrect, handleOverride]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Always stop propagation so global handlers (e.g., Continue on Enter) don't
    // trigger on the same key press as the submission.
    e.stopPropagation();

    // Only handle Enter key for submission if not already submitted
    if (e.key === 'Enter' && !e.shiftKey) {
      if (!hasSubmitted && !disabled) {
        handleSubmit(e as unknown as FormEvent);
      }
      // Do not let this Enter bubble; parent will handle next Enter after feedback
      // when the input becomes disabled.
    }
  }, [handleSubmit, hasSubmitted, disabled]);

  return (
    <form className={styles.freeTextForm} onSubmit={handleSubmit}>
      <div className={styles.inputGroup}>
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            styles.textInput,
            showFeedback && feedback?.isCorrect === true && styles.correct,
            showFeedback && feedback?.isCorrect === false && styles.incorrect,
            disabled && styles.disabled
          )}
          placeholder="Type your answer..."
          disabled={disabled || hasSubmitted}
          aria-label="Your answer"
          aria-invalid={showFeedback && !feedback?.isCorrect}
          aria-describedby={showFeedback ? "feedback-message" : undefined}
          autoComplete="off"
          autoFocus
          data-testid="text-input"
        />
        <button
          type="submit"
          className={cn(
            styles.submitButton,
            (!userInput.trim() || disabled || hasSubmitted) && styles.disabled
          )}
          disabled={!userInput.trim() || disabled || hasSubmitted}
          aria-label="Submit answer"
          data-testid="submit-button"
        >
          {hasSubmitted ? 'Submitted' : 'Submit'}
        </button>
      </div>

      {showFeedback && feedback?.isCorrect === false && (
        <div id="feedback-message" className={styles.feedbackWrapper}>
          <div className={styles.overrideSection}>
            <p className={styles.overrideText}>
              Think your answer was correct?
            </p>
            <button
              type="button"
              className={styles.overrideButton}
              onClick={handleOverride}
              aria-label="Mark my answer as correct"
              data-testid="override-button"
            >
              Actually, I was correct
            </button>
          </div>
        </div>
      )}
    </form>
  );
});

FreeTextInput.displayName = 'FreeTextInput';