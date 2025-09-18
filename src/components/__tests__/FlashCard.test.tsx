import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FlashCard from '../FlashCard';
import { Card } from '@/types';

describe('FlashCard Component', () => {
  const mockCard: Card = {
    idx: 0,
    name: 'test_card',
    side_a: 'Front Side',
    side_b: 'Back Side',
    side_c: 'Extra Info',
    level: 1,
  };

  const mockHandlers = {
    onFlip: vi.fn(),
    onSwipeLeft: vi.fn(),
    onSwipeRight: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render correctly with card data', () => {
    render(
      <FlashCard
        card={mockCard}
        isFlipped={false}
        frontSides={['side_a']}
        backSides={['side_b']}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Front Side')).toBeInTheDocument();
    expect(screen.getByText('Front')).toBeInTheDocument(); // Side label
  });

  it('should handle flip on click', () => {
    render(
      <FlashCard
        card={mockCard}
        isFlipped={false}
        frontSides={['side_a']}
        backSides={['side_b']}
        {...mockHandlers}
      />
    );

    const card = screen.getByRole('article');
    fireEvent.click(card);

    expect(mockHandlers.onFlip).toHaveBeenCalledTimes(1);
  });

  it('should display multiple sides when configured', () => {
    render(
      <FlashCard
        card={mockCard}
        isFlipped={false}
        frontSides={['side_a', 'side_c']}
        backSides={['side_b']}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Front Side')).toBeInTheDocument();
    expect(screen.getByText('Extra Info')).toBeInTheDocument();
  });

  it('should handle keyboard navigation', () => {
    render(
      <FlashCard
        card={mockCard}
        isFlipped={false}
        frontSides={['side_a']}
        backSides={['side_b']}
        {...mockHandlers}
      />
    );

    const card = screen.getByRole('article');

    // Test Enter key
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(mockHandlers.onFlip).toHaveBeenCalledTimes(1);

    // Test Spacebar
    fireEvent.keyDown(card, { key: ' ' });
    expect(mockHandlers.onFlip).toHaveBeenCalledTimes(2);
  });

  it('should apply flipped styles when isFlipped is true', () => {
    render(
      <FlashCard
        card={mockCard}
        isFlipped={true}
        frontSides={['side_a']}
        backSides={['side_b']}
        {...mockHandlers}
      />
    );

    const card = screen.getByRole('article');
    expect(card.className).toContain('flipped');
  });

  it('should be accessible with proper ARIA attributes', () => {
    render(
      <FlashCard
        card={mockCard}
        isFlipped={false}
        frontSides={['side_a']}
        backSides={['side_b']}
        {...mockHandlers}
      />
    );

    const card = screen.getByRole('article');
    expect(card).toHaveAttribute('tabIndex', '0');
    expect(card).toHaveAttribute('aria-label');
  });
});
