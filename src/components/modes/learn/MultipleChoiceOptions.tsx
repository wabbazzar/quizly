import { FC, memo, useState, useCallback, useEffect } from 'react';
import cn from 'classnames';
import styles from './MultipleChoiceOptions.module.css';

interface MultipleChoiceOptionsProps {
  options: string[];
  correctAnswer: string;
  onSelect: (answer: string, isCorrect: boolean) => void;
  showFeedback: boolean;
  feedback?: { isCorrect: boolean };
  disabled: boolean;
  resetKey?: string | number; // Key to reset selection when question changes
}

export const MultipleChoiceOptions: FC<MultipleChoiceOptionsProps> = memo(({
  options,
  correctAnswer,
  onSelect,
  showFeedback,
  feedback: _feedback,
  disabled,
  resetKey,
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Reset selection when resetKey changes (new question)
  useEffect(() => {
    setSelectedOption(null);
  }, [resetKey]);

  const handleOptionClick = useCallback((option: string) => {
    if (disabled || selectedOption) return;

    setSelectedOption(option);
    const isCorrect = option === correctAnswer;
    onSelect(option, isCorrect);
  }, [correctAnswer, onSelect, disabled, selectedOption]);

  // Handle keyboard shortcuts (1, 2, 3, 4) for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process if not disabled and no option selected yet
      if (disabled || selectedOption) return;

      // Check if the target is an input element (to avoid conflicts with text input)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      // Map keys 1-4 to option indices 0-3
      const keyMap: { [key: string]: number } = {
        '1': 0,
        '2': 1,
        '3': 2,
        '4': 3,
      };

      if (e.key in keyMap) {
        const optionIndex = keyMap[e.key];
        if (optionIndex < options.length) {
          e.preventDefault();
          handleOptionClick(options[optionIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, selectedOption, options, handleOptionClick]);

  const getOptionStatus = (option: string) => {
    if (!showFeedback) return null;

    if (option === correctAnswer) return 'correct';
    if (selectedOption === option && option !== correctAnswer) return 'incorrect';

    return null;
  };

  return (
    <div
      className={styles.multipleChoice}
      role="radiogroup"
      aria-label="Answer options"
      aria-describedby="keyboard-hint"
    >
      {options.map((option, index) => {
        const status = getOptionStatus(option);
        const isSelected = selectedOption === option;

        return (
          <button
            key={`${option}-${index}`}
            className={cn(
              styles.option,
              isSelected && styles.selected,
              status === 'correct' && styles.correct,
              status === 'incorrect' && styles.incorrect,
              disabled && styles.disabled
            )}
            onClick={() => handleOptionClick(option)}
            disabled={disabled || selectedOption !== null}
            role="radio"
            aria-checked={isSelected}
            aria-label={`Option ${index + 1}: ${option}`}
            data-testid={`option-${index}`}
            title={`Press ${index + 1} to select`}
          >
            <span className={styles.optionLetter}>
              {index + 1}
            </span>
            <span className={styles.optionText}>{option}</span>
            {showFeedback && status && (
              <span className={styles.statusIcon} aria-hidden="true">
                {status === 'correct' ? '✓' : '✗'}
              </span>
            )}
          </button>
        );
      })}
      {!disabled && !selectedOption && (
        <div id="keyboard-hint" className={styles.keyboardHint}>
          <span className={styles.hintIcon}>⌨️</span>
          <span>Press 1-{Math.min(options.length, 4)} to select</span>
        </div>
      )}
    </div>
  );
});

MultipleChoiceOptions.displayName = 'MultipleChoiceOptions';