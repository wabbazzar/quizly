import { FC } from 'react';
import { Deck } from '@/types';
import styles from './DeckCard.module.css';

interface DeckCardProps {
  deck: Deck;
  onSelect: (deckId: string) => void;
}

const DeckCard: FC<DeckCardProps> = ({ deck, onSelect }) => {
  const { metadata } = deck;

  return (
    <article
      className={styles.card}
      onClick={() => onSelect(deck.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(deck.id);
        }
      }}
      aria-label={`Select ${metadata.deck_name} deck`}
    >
      <div className={styles.cardHeader}>
        <h3 className={styles.deckName}>{metadata.deck_name}</h3>
        {metadata.difficulty && (
          <span className={`${styles.difficulty} ${styles[metadata.difficulty]}`}>
            {metadata.difficulty}
          </span>
        )}
      </div>

      {metadata.deck_subtitle && (
        <p className={styles.subtitle}>{metadata.deck_subtitle}</p>
      )}

      {metadata.description && (
        <p className={styles.description}>{metadata.description}</p>
      )}

      <div className={styles.metadata}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Cards:</span>
          <span className={styles.metaValue}>{metadata.card_count || deck.content.length}</span>
        </div>

        {metadata.available_levels && metadata.available_levels.length > 0 && (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Levels:</span>
            <span className={styles.metaValue}>{metadata.available_levels.join(', ')}</span>
          </div>
        )}

        {metadata.available_sides && (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Sides:</span>
            <span className={styles.metaValue}>{metadata.available_sides}</span>
          </div>
        )}
      </div>

      {metadata.tags && metadata.tags.length > 0 && (
        <div className={styles.tags}>
          {metadata.tags.slice(0, 4).map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className={styles.cardFooter}>
        <button
          className={styles.studyButton}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(deck.id);
          }}
          aria-label={`Study ${metadata.deck_name}`}
        >
          Study Now
        </button>
      </div>
    </article>
  );
};

export default DeckCard;