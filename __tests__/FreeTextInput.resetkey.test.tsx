import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FreeTextInput } from '@/components/modes/learn/FreeTextInput';

describe('FreeTextInput - Reset Key Issue', () => {
  it('should show incorrect feedback even when hasSubmitted state is lost', () => {
    const onSubmit = vi.fn();

    // Scenario: Parent directly shows feedback without the component having submitted
    // This can happen if the parent manages submission state separately
    const { rerender } = render(
      <FreeTextInput
        correctAnswer="Paris"
        onSubmit={onSubmit}
        showFeedback={true}
        feedback={{ isCorrect: false }}
        disabled={true}
        resetKey="test-1"
      />
    );

    const input = screen.getByTestId('text-input');

    // The input should show incorrect styling
    // But it won't because hasSubmitted is false!
    const inputClasses = input.className;
    console.log('Input classes when feedback shown without submit:', inputClasses);

    // This test will FAIL, exposing the bug
    expect(inputClasses).toContain('incorrect');
  });

  it('should maintain feedback state properly when only feedback prop is provided', () => {
    const onSubmit = vi.fn();

    // This simulates what happens when Learn mode shows feedback
    // without the component having gone through submit flow
    render(
      <FreeTextInput
        correctAnswer="Paris"
        onSubmit={onSubmit}
        showFeedback={true}
        feedback={{ isCorrect: false }}
        disabled={true}
        resetKey="question-1"
      />
    );

    const input = screen.getByTestId('text-input');

    // The input SHOULD have incorrect styling based on feedback prop alone
    const inputClasses = input.className;
    expect(inputClasses).toContain('incorrect');

    // The override section should also show
    expect(screen.getByText('Think your answer was correct?')).toBeInTheDocument();
  });
});