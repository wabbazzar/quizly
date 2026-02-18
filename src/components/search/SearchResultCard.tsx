import { FC, memo, KeyboardEvent } from 'react';
import { Card } from '@/types';
import styles from './SearchResultCard.module.css';

const SIDE_KEYS = ['side_a', 'side_b', 'side_c', 'side_d', 'side_e', 'side_f'] as const;
const DEFAULT_LABELS = ['Side A', 'Side B', 'Side C', 'Side D', 'Side E', 'Side F'];

interface SearchResultCardProps {
  card: Card;
  deckId: string;
  deckName: string;
  sideLabels: Record<string, string | undefined> | undefined;
  availableSides: number;
  onNavigateToDeck: (deckId: string) => void;
}

export const SearchResultCard: FC<SearchResultCardProps> = memo(
  ({ card, deckId, deckName, sideLabels, availableSides, onNavigateToDeck }) => {
    const handleClick = () => onNavigateToDeck(deckId);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onNavigateToDeck(deckId);
      }
    };

    return (
      <li
        className={styles.card}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`${card.name} from ${deckName}`}
      >
        <span className={styles.deckBadge}>{deckName}</span>
        <div className={styles.sides}>
          {SIDE_KEYS.slice(0, availableSides).map((key, i) => {
            const value = card[key];
            if (!value) return null;
            const label = sideLabels?.[key] || DEFAULT_LABELS[i];
            return (
              <div key={key} className={styles.sideRow}>
                <span className={styles.sideLabel}>{label}</span>
                <span className={styles.sideValue}>{value}</span>
              </div>
            );
          })}
        </div>
      </li>
    );
  }
);

SearchResultCard.displayName = 'SearchResultCard';
