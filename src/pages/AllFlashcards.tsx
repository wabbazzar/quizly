import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useDeckStore } from '@/store/deckStore';
import { useDeckVisibilityStore } from '@/store/deckVisibilityStore';
import { Card, Deck } from '@/types';
import { LoadingScreen } from '@/components/ui';

const ALL_DECKS_ID = 'all-decks';

// Re-indexes the combined deck so that each card's `idx` is unique across
// all source decks. This lets the regular Flashcards page treat the virtual
// deck identically to any other deck (session persistence, mastery tracking,
// missed-cards rounds all key off `idx`).
const buildCombinedDeck = (
  sourceDecks: Deck[],
  hiddenDeckIds: string[]
): Deck | null => {
  const visibleDecks = sourceDecks.filter(
    d => d.id !== ALL_DECKS_ID && !hiddenDeckIds.includes(d.id)
  );
  if (visibleDecks.length === 0) return null;

  const allCards: Card[] = [];
  visibleDecks.forEach(deck => {
    deck.content.forEach(card => {
      allCards.push({ ...card, idx: allCards.length });
    });
  });
  if (allCards.length === 0) return null;

  return {
    id: ALL_DECKS_ID,
    metadata: {
      deck_name: 'All Decks',
      abbreviated_title: 'All',
      description: 'Combined cards from all visible decks',
      category: 'combined',
      available_levels: [1, 2, 3],
      available_sides: 6,
      card_count: allCards.length,
      difficulty: 'intermediate',
      tags: ['all'],
      version: '1.0.0',
      created_date: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    },
    content: allCards,
  };
};

// Wraps the deck-level Flashcards page: builds a virtual "all-decks" deck
// from every visible deck's cards, injects it into the deck store, and then
// redirects to `/flashcards/all-decks`. This way the home-level flashcards
// mode renders via the exact same component as the deck-level one, with the
// only difference being its card source.
const AllFlashcards: FC = () => {
  const decks = useDeckStore(state => state.decks);
  const isLoading = useDeckStore(state => state.isLoading);
  const { hiddenDeckIds } = useDeckVisibilityStore();
  const [injected, setInjected] = useState(false);
  const injectedSignatureRef = useRef<string | null>(null);

  // Compute the combined deck from source decks only. A signature of the
  // inputs lets us skip re-injection when nothing changed (injecting every
  // render would bounce off the deck store and re-enter this effect forever).
  const { combinedDeck, signature } = useMemo(() => {
    const sourceDecks = decks.filter(d => d.id !== ALL_DECKS_ID);
    const deck = buildCombinedDeck(sourceDecks, hiddenDeckIds);
    const sig = deck
      ? `${sourceDecks.map(d => `${d.id}:${d.content.length}`).join('|')}::${hiddenDeckIds.slice().sort().join(',')}`
      : '';
    return { combinedDeck: deck, signature: sig };
  }, [decks, hiddenDeckIds]);

  useEffect(() => {
    if (!combinedDeck) return;
    if (injectedSignatureRef.current === signature) {
      if (!injected) setInjected(true);
      return;
    }
    injectedSignatureRef.current = signature;
    useDeckStore.setState(state => {
      const filtered = state.decks.filter(d => d.id !== ALL_DECKS_ID);
      return { decks: [...filtered, combinedDeck] };
    });
    setInjected(true);
  }, [combinedDeck, signature, injected]);

  if (isLoading || !combinedDeck) return <LoadingScreen />;
  if (!injected) return null;

  return <Navigate to={`/flashcards/${ALL_DECKS_ID}`} replace />;
};

export default AllFlashcards;
