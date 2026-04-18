import { FC } from 'react';
import styles from './EmptyDeckState.module.css';

interface EmptyDeckStateProps {
  onCreateDeck: () => void;
  onImport: () => void;
}

export const EmptyDeckState: FC<EmptyDeckStateProps> = ({ onCreateDeck, onImport }) => (
  <div className={styles.container}>
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
    <h2 className={styles.title}>No decks yet</h2>
    <p className={styles.subtitle}>
      Create your first deck to start studying, or import an existing one from a JSON file.
    </p>
    <div className={styles.actions}>
      <button className={styles.primaryAction} onClick={onCreateDeck} type="button">
        Create New Deck
      </button>
      <button className={styles.secondaryAction} onClick={onImport} type="button">
        Import from JSON
      </button>
    </div>
  </div>
);
