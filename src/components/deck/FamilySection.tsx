import { FC, memo, ReactNode } from 'react';
import { DeckFamily } from '@/types';
import styles from './FamilySection.module.css';

interface FamilySectionProps {
  family: DeckFamily;
  deckCount: number;
  children: ReactNode;
}

export const FamilySection: FC<FamilySectionProps> = memo(({
  family,
  deckCount,
  children,
}) => (
  <section className={styles.section}>
    <div className={styles.header} style={{ borderLeftColor: family.color }}>
      <h3 className={styles.name}>{family.name}</h3>
      <span className={styles.count}>{deckCount} decks</span>
    </div>
    {children}
  </section>
));

FamilySection.displayName = 'FamilySection';
