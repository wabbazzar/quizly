import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FreeTextInput } from '@/components/modes/learn/FreeTextInput';

describe('FreeTextInput - Simple Feedback Test', () => {
  it('should show visual feedback when answer is submitted and feedback arrives', () => {
    const onSubmit = vi.fn();

    // Initial render - no feedback yet
    const { rerender } = render(
      <FreeTextInput
        correctAnswer="Paris"
        onSubmit={onSubmit}
        showFeedback={false}
        disabled={false}
        resetKey="test-1"
      />
    );

    const input = screen.getByTestId('text-input');

    // User types wrong answer and submits
    fireEvent.change(input, { target: { value: 'London' } });
    fireEvent.click(screen.getByTestId('submit-button'));

    // At this point, hasSubmitted is true internally
    expect(onSubmit).toHaveBeenCalledWith('London', false);

    // Now parent shows feedback (simulating what LearnContainer does)
    rerender(
      <FreeTextInput
        correctAnswer="Paris"
        onSubmit={onSubmit}
        showFeedback={true}
        feedback={{ isCorrect: false }}
        disabled={true}
        resetKey="test-1"
      />
    );

    // The input should now have incorrect styling
    const inputClasses = input.className;
    console.log('Input classes after incorrect answer:', inputClasses);

    // Check that incorrect class is applied
    expect(inputClasses).toContain('incorrect');

    // Check that the override section is shown
    expect(screen.getByText('Think your answer was correct?')).toBeInTheDocument();
  });

  it('should NOT show feedback when showFeedback is false even after submit', () => {
    const onSubmit = vi.fn();

    render(
      <FreeTextInput
        correctAnswer="Paris"
        onSubmit={onSubmit}
        showFeedback={false}
        disabled={false}
        resetKey="test-2"
      />
    );

    const input = screen.getByTestId('text-input');

    // User types wrong answer and submits
    fireEvent.change(input, { target: { value: 'London' } });
    fireEvent.click(screen.getByTestId('submit-button'));

    // Even though hasSubmitted is true, without showFeedback, no visual feedback
    const inputClasses = input.className;
    console.log('Input classes without showFeedback:', inputClasses);

    // Should not have incorrect class
    expect(inputClasses).not.toContain('incorrect');

    // Override section should not be shown
    expect(screen.queryByText('Think your answer was correct?')).not.toBeInTheDocument();
  });
});