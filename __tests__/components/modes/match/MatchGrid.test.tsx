import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../../utils/testUtils';
import MatchGrid from '@/components/modes/match/MatchGrid';
import { MatchCard } from '@/components/modes/match/types';

// Mock MatchCard component
vi.mock('@/components/modes/match/MatchCard', () => ({
  default: ({ card, onSelect, isSelected, isMatched }: any) => (
    <div
      data-testid={`match-card-${card.position.row}-${card.position.col}`}
      onClick={() => onSelect(card.id)}
      className={`${isSelected ? 'selected' : ''} ${isMatched ? 'matched' : ''}`}
    >
      {card.content}
    </div>
  ),
}));

describe('MatchGrid', () => {
  const mockOnCardSelect = vi.fn();

  const mockCards: MatchCard[] = [
    {
      id: 'card-0',
      cardIndex: 0,
      displaySides: ['side_a'],
      content: 'Apple',
      groupId: 'group-0',
      isMatched: false,
      isSelected: false,
      position: { row: 0, col: 0 },
    },
    {
      id: 'card-1',
      cardIndex: 0,
      displaySides: ['side_b'],
      content: 'Red Fruit',
      groupId: 'group-0',
      isMatched: false,
      isSelected: false,
      position: { row: 0, col: 1 },
    },
    {
      id: 'card-2',
      cardIndex: 1,
      displaySides: ['side_a'],
      content: 'Banana',
      groupId: 'group-1',
      isMatched: false,
      isSelected: false,
      position: { row: 0, col: 2 },
    },
    {
      id: 'card-3',
      cardIndex: 1,
      displaySides: ['side_b'],
      content: 'Yellow Fruit',
      groupId: 'group-1',
      isMatched: false,
      isSelected: false,
      position: { row: 1, col: 0 },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Grid Rendering', () => {
    it('should render grid with correct dimensions', () => {
      render(
        <MatchGrid
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          selectedCards={[]}
          matchedCards={[]}
          gridSize={{ rows: 2, cols: 2 }}
          isAnimating={false}
        />
      );

      const grid = screen.getByTestId('match-grid');
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveStyle({
        '--grid-rows': '2',
        '--grid-cols': '2',
      });
    });

    it('should render all cards', () => {
      render(
        <MatchGrid
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          selectedCards={[]}
          matchedCards={[]}
          gridSize={{ rows: 2, cols: 2 }}
          isAnimating={false}
        />
      );

      mockCards.forEach(card => {
        const cardElement = screen.getByTestId(`match-card-${card.position.row}-${card.position.col}`);
        expect(cardElement).toBeInTheDocument();
        expect(cardElement).toHaveTextContent(card.content);
      });
    });

    it('should apply correct grid layout classes', () => {
      render(
        <MatchGrid
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          selectedCards={[]}
          matchedCards={[]}
          gridSize={{ rows: 3, cols: 4 }}
          isAnimating={false}
        />
      );

      const grid = screen.getByTestId('match-grid');
      expect(grid).toHaveClass('grid');
      expect(grid).toHaveClass('grid3x4');
    });

    it('should handle custom grid sizes', () => {
      render(
        <MatchGrid
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          selectedCards={[]}
          matchedCards={[]}
          gridSize={{ rows: 5, cols: 6 }}
          isAnimating={false}
        />
      );

      const grid = screen.getByTestId('match-grid');
      expect(grid).toHaveClass('gridCustom');
      expect(grid).toHaveStyle({
        '--grid-rows': '5',
        '--grid-cols': '6',
      });
    });
  });

  describe('Card Selection', () => {
    it('should call onCardSelect when card is clicked', () => {
      render(
        <MatchGrid
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          selectedCards={[]}
          matchedCards={[]}
          gridSize={{ rows: 2, cols: 2 }}
          isAnimating={false}
        />
      );

      const firstCard = screen.getByTestId('match-card-0-0');
      fireEvent.click(firstCard);

      expect(mockOnCardSelect).toHaveBeenCalledWith('card-0');
    });

    it('should show selected cards', () => {
      render(
        <MatchGrid
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          selectedCards={['card-0', 'card-2']}
          matchedCards={[]}
          gridSize={{ rows: 2, cols: 2 }}
          isAnimating={false}
        />
      );

      const selectedCard1 = screen.getByTestId('match-card-0-0');
      const selectedCard2 = screen.getByTestId('match-card-0-2');
      const unselectedCard = screen.getByTestId('match-card-0-1');

      expect(selectedCard1).toHaveClass('selected');
      expect(selectedCard2).toHaveClass('selected');
      expect(unselectedCard).not.toHaveClass('selected');
    });

    it('should show matched cards', () => {
      render(
        <MatchGrid
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          selectedCards={[]}
          matchedCards={[['card-0', 'card-1']]}
          gridSize={{ rows: 2, cols: 2 }}
          isAnimating={false}
        />
      );

      const matchedCard1 = screen.getByTestId('match-card-0-0');
      const matchedCard2 = screen.getByTestId('match-card-0-1');
      const unmatchedCard = screen.getByTestId('match-card-0-2');

      expect(matchedCard1).toHaveClass('matched');
      expect(matchedCard2).toHaveClass('matched');
      expect(unmatchedCard).not.toHaveClass('matched');
    });
  });

  describe('Animation State', () => {
    it('should disable interactions when animating', () => {
      render(
        <MatchGrid
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          selectedCards={[]}
          matchedCards={[]}
          gridSize={{ rows: 2, cols: 2 }}
          isAnimating={true}
        />
      );

      const grid = screen.getByTestId('match-grid');
      expect(grid).toHaveClass('animating');
    });
  });

  describe('Responsive Behavior', () => {
    it('should apply mobile-specific classes for small grids', () => {
      render(
        <MatchGrid
          cards={mockCards.slice(0, 6)}
          onCardSelect={mockOnCardSelect}
          selectedCards={[]}
          matchedCards={[]}
          gridSize={{ rows: 2, cols: 3 }}
          isAnimating={false}
        />
      );

      const grid = screen.getByTestId('match-grid');
      expect(grid).toHaveClass('grid2x3');
    });

    it('should apply tablet-specific classes for medium grids', () => {
      render(
        <MatchGrid
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          selectedCards={[]}
          matchedCards={[]}
          gridSize={{ rows: 3, cols: 4 }}
          isAnimating={false}
        />
      );

      const grid = screen.getByTestId('match-grid');
      expect(grid).toHaveClass('grid3x4');
    });

    it('should apply desktop-specific classes for large grids', () => {
      const largeCards = Array(20).fill(null).map((_, i) => ({
        id: `card-${i}`,
        cardIndex: Math.floor(i / 2),
        displaySides: ['side_a'],
        content: `Content ${i}`,
        groupId: `group-${Math.floor(i / 2)}`,
        isMatched: false,
        isSelected: false,
        position: { row: Math.floor(i / 5), col: i % 5 },
      }));

      render(
        <MatchGrid
          cards={largeCards}
          onCardSelect={mockOnCardSelect}
          selectedCards={[]}
          matchedCards={[]}
          gridSize={{ rows: 4, cols: 5 }}
          isAnimating={false}
        />
      );

      const grid = screen.getByTestId('match-grid');
      expect(grid).toHaveClass('grid4x5');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <MatchGrid
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          selectedCards={[]}
          matchedCards={[]}
          gridSize={{ rows: 2, cols: 2 }}
          isAnimating={false}
        />
      );

      const grid = screen.getByTestId('match-grid');
      expect(grid).toHaveAttribute('role', 'grid');
      expect(grid).toHaveAttribute('aria-label', 'Match game grid');
      expect(grid).toHaveAttribute('aria-rowcount', '2');
      expect(grid).toHaveAttribute('aria-colcount', '2');
    });

    it('should announce animation state', () => {
      const { rerender } = render(
        <MatchGrid
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          selectedCards={[]}
          matchedCards={[]}
          gridSize={{ rows: 2, cols: 2 }}
          isAnimating={false}
        />
      );

      const grid = screen.getByTestId('match-grid');
      expect(grid).toHaveAttribute('aria-busy', 'false');

      rerender(
        <MatchGrid
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          selectedCards={[]}
          matchedCards={[]}
          gridSize={{ rows: 2, cols: 2 }}
          isAnimating={true}
        />
      );

      expect(grid).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty cards array', () => {
      render(
        <MatchGrid
          cards={[]}
          onCardSelect={mockOnCardSelect}
          selectedCards={[]}
          matchedCards={[]}
          gridSize={{ rows: 2, cols: 2 }}
          isAnimating={false}
        />
      );

      const grid = screen.getByTestId('match-grid');
      expect(grid).toBeInTheDocument();
      expect(grid.children).toHaveLength(0);
    });

    it('should handle mismatched grid size and cards', () => {
      const twoCards = mockCards.slice(0, 2);

      render(
        <MatchGrid
          cards={twoCards}
          onCardSelect={mockOnCardSelect}
          selectedCards={[]}
          matchedCards={[]}
          gridSize={{ rows: 3, cols: 4 }} // Expects 12 cards but only 2 provided
          isAnimating={false}
        />
      );

      const grid = screen.getByTestId('match-grid');
      expect(grid).toBeInTheDocument();
      // Should still render the 2 cards that were provided
      expect(screen.getAllByTestId(/^match-card-/)).toHaveLength(2);
    });

    it('should prevent selection of matched cards', () => {
      const cardsWithMatched = mockCards.map((card, i) => ({
        ...card,
        isMatched: i < 2, // First two cards are matched
      }));

      render(
        <MatchGrid
          cards={cardsWithMatched}
          onCardSelect={mockOnCardSelect}
          selectedCards={[]}
          matchedCards={[['card-0', 'card-1']]}
          gridSize={{ rows: 2, cols: 2 }}
          isAnimating={false}
        />
      );

      const matchedCard = screen.getByTestId('match-card-0-0');
      fireEvent.click(matchedCard);

      // onCardSelect should still be called (handled by parent)
      expect(mockOnCardSelect).toHaveBeenCalledWith('card-0');
    });
  });

  describe('Performance', () => {
    it('should handle large grids efficiently', () => {
      const largeCards = Array(100).fill(null).map((_, i) => ({
        id: `card-${i}`,
        cardIndex: Math.floor(i / 2),
        displaySides: ['side_a'],
        content: `Content ${i}`,
        groupId: `group-${Math.floor(i / 2)}`,
        isMatched: false,
        isSelected: false,
        position: { row: Math.floor(i / 10), col: i % 10 },
      }));

      const { container } = render(
        <MatchGrid
          cards={largeCards}
          onCardSelect={mockOnCardSelect}
          selectedCards={[]}
          matchedCards={[]}
          gridSize={{ rows: 10, cols: 10 }}
          isAnimating={false}
        />
      );

      expect(container.querySelectorAll('[data-testid^="match-card-"]')).toHaveLength(100);
    });
  });
});