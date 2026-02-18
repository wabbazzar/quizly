import { FC } from 'react';
import { Card, Deck } from '@/types';
import { SearchResultCard } from './SearchResultCard';
import styles from './SearchResults.module.css';

export interface CardSearchResult {
  card: Card;
  deck: Deck;
}

interface SearchResultsProps {
  results: CardSearchResult[];
  query: string;
  onNavigateToDeck: (deckId: string) => void;
}

export const SearchResults: FC<SearchResultsProps> = ({ results, query, onNavigateToDeck }) => {
  if (results.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyText}>
          No cards match "<span className={styles.emptyQuery}>{query}</span>"
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <p className={styles.resultCount}>
        {results.length} card{results.length !== 1 ? 's' : ''} found
      </p>
      <ul className={styles.list}>
        {results.map(({ card, deck }) => (
          <SearchResultCard
            key={`${deck.id}-${card.idx}`}
            card={card}
            deckId={deck.id}
            deckName={deck.metadata.abbreviated_title || deck.metadata.deck_name}
            sideLabels={deck.metadata.side_labels}
            availableSides={deck.metadata.available_sides}
            onNavigateToDeck={onNavigateToDeck}
          />
        ))}
      </ul>
    </div>
  );
};
