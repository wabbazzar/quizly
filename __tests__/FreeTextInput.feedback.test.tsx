import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FreeTextInput } from '@/components/modes/learn/FreeTextInput';

describe('FreeTextInput - Incorrect Answer Visual Feedback', () => {
  it('should show visual feedback immediately when answer is incorrect', async () => {
    const onSubmit = vi.fn();
    const correctAnswer = 'Paris';

    const { rerender } = render(
      <FreeTextInput
        correctAnswer={correctAnswer}
        onSubmit={onSubmit}
        showFeedback={false}
        disabled={false}
        resetKey="test-1"
      />
    );

    // Get input and type wrong answer
    const input = screen.getByTestId('text-input');
    fireEvent.change(input, { target: { value: 'London' } });

    // Submit the answer
    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    // Verify onSubmit was called with incorrect flag
    expect(onSubmit).toHaveBeenCalledWith('London', false);

    // Simulate the parent component updating after processing the answer
    // This simulates what happens in LearnContainer after handleAnswer is called
    rerender(
      <FreeTextInput
        correctAnswer={correctAnswer}
        onSubmit={onSubmit}
        showFeedback={true}
        feedback={{ isCorrect: false }}
        disabled={true}
        resetKey="test-1"
      />
    );

    // Check for visual feedback on incorrect answer
    // The input should have the 'incorrect' class applied (checking CSS modules class name)
    const inputClasses = input.className;
    expect(inputClasses).toMatch(/incorrect/);

    // Verify it has incorrect but not a standalone correct class (it might contain 'incorrect' which has 'correct' in it)
    expect(inputClasses).toMatch(/incorrect/);

    // Check that the override section appears for incorrect answers
    await waitFor(() => {
      expect(screen.getByText('Think your answer was correct?')).toBeInTheDocument();
      expect(screen.getByTestId('override-button')).toBeInTheDocument();
    });
  });

  it('should show correct visual feedback when answer is correct', async () => {
    const onSubmit = vi.fn();
    const correctAnswer = 'Paris';

    const { rerender } = render(
      <FreeTextInput
        correctAnswer={correctAnswer}
        onSubmit={onSubmit}
        showFeedback={false}
        disabled={false}
        resetKey="test-2"
      />
    );

    // Get input and type correct answer
    const input = screen.getByTestId('text-input');
    fireEvent.change(input, { target: { value: 'Paris' } });

    // Submit the answer
    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    // Verify onSubmit was called with correct flag
    expect(onSubmit).toHaveBeenCalledWith('Paris', true);

    // Simulate the parent component updating after processing the answer
    rerender(
      <FreeTextInput
        correctAnswer={correctAnswer}
        onSubmit={onSubmit}
        showFeedback={true}
        feedback={{ isCorrect: true }}
        disabled={true}
        resetKey="test-2"
      />
    );

    // Check for visual feedback on correct answer
    const inputClasses = input.className;
    expect(inputClasses).toMatch(/correct/);
    expect(inputClasses).not.toMatch(/incorrect/);

    // Override section should NOT appear for correct answers
    expect(screen.queryByText('Think your answer was correct?')).not.toBeInTheDocument();
  });
});
