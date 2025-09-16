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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e as unknown as FormEvent);
    }
  }, [handleSubmit]);

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