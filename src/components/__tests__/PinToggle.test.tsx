import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CompactDeckCard } from '../deck/CompactDeckCard';
import { usePinnedDecksStore } from '@/store/pinnedDecksStore';
import { Deck } from '@/types';

vi.mock('@/services/transcriptService', () => ({
  hasTranscriptsForDeck: vi.fn(() => Promise.resolve(false)),
  hasTranscriptsForDeckSync: vi.fn(() => false),
}));

const makeDeck = (id: string): Deck => ({
  id,
  metadata: {
    deck_name: `Deck ${id}`,
    deck_subtitle: 'Subtitle',
    description: 'Test deck',
    category: 'test',
    available_levels: [1],
    available_sides: 2,
    card_count: 10,
    difficulty: 'beginner',
    tags: [],
    version: '1.0.0',
    created_date: '2025-01-01',
    last_updated: '2025-01-01',
  },
  content: [],
});

describe('Pin toggle on CompactDeckCard', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => {
      usePinnedDecksStore.setState({ pinnedDeckIds: [] });
    });
  });

  it('renders an unpinned pin button by default', () => {
    render(<CompactDeckCard deck={makeDeck('d1')} onSelect={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /pin deck/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles pin state on click and updates aria-pressed', () => {
    render(<CompactDeckCard deck={makeDeck('d1')} onSelect={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /pin deck/i });

    fireEvent.click(btn);

    expect(usePinnedDecksStore.getState().pinnedDeckIds).toEqual(['d1']);
    const unpinBtn = screen.getByRole('button', { name: /unpin deck/i });
    expect(unpinBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not trigger card onSelect when pin button is clicked', () => {
    const onSelect = vi.fn();
    render(<CompactDeckCard deck={makeDeck('d1')} onSelect={onSelect} />);

    const btn = screen.getByRole('button', { name: /pin deck/i });
    fireEvent.click(btn);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('clicking the card body still triggers onSelect', () => {
    const onSelect = vi.fn();
    render(<CompactDeckCard deck={makeDeck('d1')} onSelect={onSelect} />);

    const cardBody = screen.getByRole('button', { name: /Deck d1\. 10 cards/i });
    fireEvent.click(cardBody);

    expect(onSelect).toHaveBeenCalledWith('d1');
  });

  it('reflects initial pinned state from the store', () => {
    act(() => {
      usePinnedDecksStore.setState({ pinnedDeckIds: ['d1'] });
    });
    render(<CompactDeckCard deck={makeDeck('d1')} onSelect={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /unpin deck/i });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });
});
