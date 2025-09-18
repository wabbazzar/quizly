import { FC, memo } from 'react';
import { Question, Card } from '@/types';
import { MultipleChoiceOptions } from './MultipleChoiceOptions';
import { FreeTextInput } from './FreeTextInput';
import { FeedbackSection } from './FeedbackSection';
import styles from './QuestionCard.module.css';

interface QuestionCardProps {
  question: Question;
  card?: Card;
  onAnswer: (answer: string, isCorrect: boolean) => void;
  showFeedback: boolean;
  feedback?: {
    isCorrect: boolean;
    correctAnswer?: string;
    explanation?: string;
    isMastered?: boolean;
  };
  disabled?: boolean;
  onShowCardDetails?: () => void;
}

export const QuestionCard: FC<QuestionCardProps> = memo(
  ({
    question,
    card: _card,
    onAnswer,
    showFeedback,
    feedback,
    disabled = false,
    onShowCardDetails,
  }) => {
    return (
      <article
        className={styles.questionCard}
        role="region"
        aria-labelledby="question-text"
        data-testid="question-card"
        data-question-type={question.type}
      >
        <header className={styles.questionHeader}>
          <h2 id="question-text" className={styles.questionText}>
            {question.questionText}
          </h2>
          {question.difficulty && (
            <div
              className={styles.difficultyIndicator}
              aria-label={`Difficulty: ${Math.round(question.difficulty * 100)}%`}
            >
              <div
                className={styles.difficultyBar}
                style={{ width: `${question.difficulty * 100}%` }}
              />
            </div>
          )}
        </header>

        <div className={styles.questionContent}>
          {question.type === 'multiple_choice' ? (
            <MultipleChoiceOptions
              options={question.options!}
              correctAnswer={question.correctAnswer}
              onSelect={onAnswer}
              showFeedback={showFeedback}
              feedback={feedback}
              disabled={disabled}
              resetKey={question.id}
            />
          ) : (
            <FreeTextInput
              correctAnswer={question.correctAnswer}
              acceptedAnswers={question.acceptedAnswers}
              onSubmit={onAnswer}
              showFeedback={showFeedback}
              feedback={feedback}
              disabled={disabled || showFeedback}
              resetKey={question.id}
            />
          )}
        </div>

        {showFeedback && feedback && (
          <FeedbackSection
            isCorrect={feedback.isCorrect}
            correctAnswer={feedback.correctAnswer}
            explanation={feedback.explanation}
            isMastered={feedback.isMastered}
            onShowCardDetails={onShowCardDetails}
          />
        )}
      </article>
    );
  }
);

QuestionCard.displayName = 'QuestionCard';
