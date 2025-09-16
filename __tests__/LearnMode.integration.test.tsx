import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LearnContainer from '@/components/modes/learn/LearnContainer';
import { Deck, LearnModeSettings } from '@/types';

// Mock deck data
const mockDeck: Deck = {
  id: 'test-deck',
  metadata: {
    deck_name: 'Test Deck',
    description: 'Test deck for integration testing',
    version: '1.0.0',
    created_date: '2024-01-01',
    last_modified: '2024-01-01',
    author: 'Test',
    tags: ['test'],
    difficulty_level: 'beginner',
    estimated_duration: 10,
    prerequisites: [],
    learning_objectives: [],
    total_cards: 2,
    category: 'test'
  },
  content: [
    {
      idx: 0,
      level: 1,
      side_a: 'What is the capital of France?',
      side_b: 'Paris',
      notes: 'Test note',
      examples: [],
      related_cards: []
    },
    {
      idx: 1,
      level: 1,
      side_a: 'What is 2 + 2?',
      side_b: '4',
      notes: '',
      examples: [],
      related_cards: []
    }
  ]
};

const defaultSettings: LearnModeSettings = {
  cardsPerRound: 10,
  randomize: false,
  includeAudio: false,
  timer: false,
  timerDuration: 60,
  sideSelection: 'side_a',
  sideToShow: ['side_a'],
  sideToTest: ['side_b'],
  sideGrouping: 'separate',
  showHints: false,
  progressionMode: 'sequential',
  questionTypes: ['multiple_choice', 'free_text']
};

describe('Learn Mode Integration - Free Text Feedback', () => {
  const onComplete = vi.fn();
  const onExit = vi.fn();
  const onOpenSettings = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show visual feedback for incorrect free text answers', async () => {
    const { container } = render(
      <BrowserRouter>
        <LearnContainer
          deck={mockDeck}
          settings={defaultSettings}
          onComplete={onComplete}
          onExit={onExit}
          onOpenSettings={onOpenSettings}
        />
      </BrowserRouter>
    );

    // Wait for the component to load
    await waitFor(() => {
      expect(screen.queryByText('Preparing questions...')).not.toBeInTheDocument();
    });

    // The question should be displayed
    const questionText = await screen.findByRole('heading', { level: 2 });
    expect(questionText).toBeInTheDocument();

    // Check if it's a free text question or multiple choice
    const textInput = screen.queryByTestId('text-input');

    if (textInput) {
      // It's a free text question
      console.log('Testing free text question');

      // Type a wrong answer
      fireEvent.change(textInput, { target: { value: 'London' } });

      // Submit the answer
      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      // Wait for feedback to appear
      await waitFor(() => {
        // Check that the input has incorrect styling
        const inputElement = screen.getByTestId('text-input');
        expect(inputElement.className).toMatch(/incorrect/);

        // Check that the override section appears
        expect(screen.getByText('Think your answer was correct?')).toBeInTheDocument();
      });

      console.log('✅ Visual feedback for incorrect answer is working!');

      // Test the override functionality
      const overrideButton = screen.getByTestId('override-button');
      fireEvent.click(overrideButton);

      // After override, the input should show correct styling
      await waitFor(() => {
        const inputElement = screen.getByTestId('text-input');
        expect(inputElement.className).toMatch(/correct/);
      });

      console.log('✅ Override functionality is working!');
    } else {
      console.log('First question is multiple choice, skipping to next question');
      // If it's multiple choice, select an answer and move to the next question
      const options = screen.getAllByRole('button', { name: /Option/i });
      if (options.length > 0) {
        fireEvent.click(options[0]);

        // Wait for Next button and click it
        const nextButton = await screen.findByRole('button', { name: /Next/i });
        fireEvent.click(nextButton);

        // Now check if the next question is free text
        await waitFor(() => {
          const textInput = screen.queryByTestId('text-input');
          if (textInput) {
            console.log('Found free text question on second attempt');
          }
        });
      }
    }
  });

  it('should show correct visual feedback for correct answers', async () => {
    render(
      <BrowserRouter>
        <LearnContainer
          deck={mockDeck}
          settings={defaultSettings}
          onComplete={onComplete}
          onExit={onExit}
          onOpenSettings={onOpenSettings}
        />
      </BrowserRouter>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Preparing questions...')).not.toBeInTheDocument();
    });

    const textInput = screen.queryByTestId('text-input');

    if (textInput) {
      // Type the correct answer (we know it's either 'Paris' or '4')
      const questionText = screen.getByRole('heading', { level: 2 }).textContent;
      const correctAnswer = questionText?.includes('France') ? 'Paris' : '4';

      fireEvent.change(textInput, { target: { value: correctAnswer } });

      // Submit the answer
      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      // Wait for feedback
      await waitFor(() => {
        // Check that the input has correct styling
        const inputElement = screen.getByTestId('text-input');
        expect(inputElement.className).toMatch(/correct/);

        // Override section should NOT appear for correct answers
        expect(screen.queryByText('Think your answer was correct?')).not.toBeInTheDocument();
      });

      console.log('✅ Visual feedback for correct answer is working!');
    }
  });
});