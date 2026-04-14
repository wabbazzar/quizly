import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../utils/testUtils';
import { FeedbackSection } from '@/components/modes/learn/FeedbackSection';

/**
 * Regression guard: the user has repeatedly asked for the correct answer to
 * be visible in free-text (and multiple choice) feedback even when they got
 * the answer right. This test locks that in so it cannot silently disappear
 * again during a refactor.
 */
describe('FeedbackSection — correct answer visibility', () => {
  it('shows the correct answer when the user is CORRECT', () => {
    render(<FeedbackSection isCorrect={true} correctAnswer="你好" />);

    expect(screen.getByTestId('feedback-section')).toBeInTheDocument();
    expect(screen.getByText('你好')).toBeInTheDocument();
    expect(screen.getByText(/^Answer:$/i)).toBeInTheDocument();
  });

  it('shows the correct answer when the user is INCORRECT', () => {
    render(<FeedbackSection isCorrect={false} correctAnswer="你好" />);

    expect(screen.getByText('你好')).toBeInTheDocument();
    expect(screen.getByText(/^Correct answer:$/i)).toBeInTheDocument();
  });

  it('still renders even without an explanation', () => {
    render(<FeedbackSection isCorrect={true} correctAnswer="thank you" />);
    expect(screen.getByText('thank you')).toBeInTheDocument();
  });
});
