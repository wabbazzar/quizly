import { FC, useState } from 'react';
import {
  QuestionCard,
  LearnProgress,
  LearnSessionProgress
} from '@/components/modes/learn';
import { Question } from '@/types';
import styles from './Learn.module.css';

// Demo questions for testing
const demoQuestions: Question[] = [
  {
    id: '1',
    type: 'multiple_choice',
    cardIndex: 0,
    questionText: 'What is the Chinese word for "hello"?',
    questionSides: ['side_a'],
    correctAnswer: '你好',
    options: ['你好', '谢谢', '再见', '早上好'],
    difficulty: 0.3,
  },
  {
    id: '2',
    type: 'free_text',
    cardIndex: 1,
    questionText: 'How do you say "thank you" in Chinese?',
    questionSides: ['side_a'],
    correctAnswer: '谢谢',
    acceptedAnswers: ['谢谢', 'xie xie', 'xiexie', 'xièxie'],
    difficulty: 0.5,
  },
  {
    id: '3',
    type: 'multiple_choice',
    cardIndex: 2,
    questionText: 'Which of these means "goodbye"?',
    questionSides: ['side_a'],
    correctAnswer: '再见',
    options: ['晚安', '早上好', '再见', '你好'],
    difficulty: 0.4,
  },
];

const LearnDemo: FC = () => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [progress, setProgress] = useState<LearnSessionProgress>({
    questionsAnswered: 0,
    totalQuestions: demoQuestions.length,
    correctAnswers: 0,
    currentStreak: 0,
    maxStreak: 0,
    masteredCards: new Set(),
    strugglingCards: new Set(),
    averageResponseTime: 3500,
  });

  const currentQuestion = demoQuestions[currentQuestionIndex];

  const handleAnswer = (_answer: string, correct: boolean) => {
    setIsCorrect(correct);
    setShowFeedback(true);

    // Update progress
    setProgress(prev => {
      const newCorrectAnswers = correct ? prev.correctAnswers + 1 : prev.correctAnswers;
      const newStreak = correct ? prev.currentStreak + 1 : 0;
      const newMaxStreak = Math.max(prev.maxStreak, newStreak);
      const newQuestionsAnswered = prev.questionsAnswered + 1;

      const newMasteredCards = new Set(prev.masteredCards);
      const newStrugglingCards = new Set(prev.strugglingCards);

      if (correct && newStreak >= 3) {
        newMasteredCards.add(currentQuestion.cardIndex);
        newStrugglingCards.delete(currentQuestion.cardIndex);
      } else if (!correct) {
        newStrugglingCards.add(currentQuestion.cardIndex);
      }

      return {
        ...prev,
        questionsAnswered: newQuestionsAnswered,
        correctAnswers: newCorrectAnswers,
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
        masteredCards: newMasteredCards,
        strugglingCards: newStrugglingCards,
      };
    });

    // Auto-advance after 2 seconds
    setTimeout(() => {
      handleNextQuestion();
    }, 2000);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < demoQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowFeedback(false);
      setIsCorrect(false);
    } else {
      // Session complete
      alert('Session complete! Great job!');
    }
  };

  return (
    <div className={styles.learnPage}>
      <header className={styles.header}>
        <h1 className={styles.title}>Learn Mode Demo</h1>
        <p className={styles.subtitle}>Test the Learn UI components</p>
      </header>

      <main className={styles.content}>
        <LearnProgress progress={progress} className={styles.progressSection} />

        <QuestionCard
          question={currentQuestion}
          onAnswer={handleAnswer}
          showFeedback={showFeedback}
          feedback={
            showFeedback
              ? {
                  isCorrect,
                  correctAnswer: currentQuestion.correctAnswer,
                  explanation: isCorrect
                    ? 'Great job! You got it right.'
                    : `The correct answer is "${currentQuestion.correctAnswer}".`,
                }
              : undefined
          }
          disabled={showFeedback}
        />

        {showFeedback && (
          <div className={styles.navigationButtons}>
            <button
              className={styles.continueButton}
              onClick={handleNextQuestion}
              data-testid="continue-button"
            >
              {currentQuestionIndex < demoQuestions.length - 1 ? 'Next Question' : 'Finish'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default LearnDemo;