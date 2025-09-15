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
            aria-label={`Option ${String.fromCharCode(65 + index)}: ${option}`}
            data-testid={`option-${index}`}
          >
            <span className={styles.optionLetter}>
              {String.fromCharCode(65 + index)}
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
    </div>
  );
});

MultipleChoiceOptions.displayName = 'MultipleChoiceOptions';