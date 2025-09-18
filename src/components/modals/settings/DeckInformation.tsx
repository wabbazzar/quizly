import { FC } from 'react';
import { SectionProps } from '../UnifiedSettings';
import { InformationCircleIcon } from '@/components/icons/StatusIcons';
import styles from './DeckInformation.module.css';

const DeckInformation: FC<SectionProps> = ({ deck }) => {
  if (!deck) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>
        <InformationCircleIcon size={20} className={styles.titleIcon} />
        Deck Information
      </h3>

      <div className={styles.infoBox}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Deck Name:</span>
          <span className={styles.infoValue}>{deck.metadata.deck_name}</span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Total Cards:</span>
          <span className={styles.infoValue}>{deck.content.length}</span>
        </div>

        {deck.metadata.description && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Description:</span>
            <span className={styles.infoValue}>{deck.metadata.description}</span>
          </div>
        )}

        {deck.metadata.category && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Category:</span>
            <span className={styles.infoValue}>{deck.metadata.category}</span>
          </div>
        )}

        {deck.metadata.difficulty && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Difficulty:</span>
            <span className={styles.infoValue}>
              {deck.metadata.difficulty.charAt(0).toUpperCase() +
                deck.metadata.difficulty.slice(1).replace('_', ' - ')}
            </span>
          </div>
        )}

        {deck.metadata.tags && deck.metadata.tags.length > 0 && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Tags:</span>
            <div className={styles.tags}>
              {deck.metadata.tags.map((tag, index) => (
                <span key={index} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {deck.metadata.available_sides && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Available Sides:</span>
            <span className={styles.infoValue}>{deck.metadata.available_sides} sides per card</span>
          </div>
        )}

        {deck.metadata.side_labels && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Side Labels:</span>
            <div className={styles.sideLabels}>
              {Object.entries(deck.metadata.side_labels).map(([side, label]) => (
                <div key={side} className={styles.sideLabel}>
                  <span className={styles.sideName}>{side.replace('_', ' ').toUpperCase()}:</span>
                  <span className={styles.sideValue}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {deck.metadata.version && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Version:</span>
            <span className={styles.infoValue}>{deck.metadata.version}</span>
          </div>
        )}

        {deck.metadata.last_updated && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Last Updated:</span>
            <span className={styles.infoValue}>
              {new Date(deck.metadata.last_updated).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeckInformation;
