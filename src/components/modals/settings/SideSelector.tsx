import { FC, memo } from 'react';
import styles from './SideSelector.module.css';

export interface SideSelectorProps {
  availableSides: string[];
  selectedSides: string[];
  onSidesChange: (sides: string[]) => void;
  getSideLabel?: (side: string) => string;
  type: 'question' | 'answer';
  title?: string;
}

export const SideSelector: FC<SideSelectorProps> = memo(({
  availableSides,
  selectedSides,
  onSidesChange,
  getSideLabel = (side: string) => {
    const sideIndex = side.split('_')[1]?.toUpperCase();
    return `Side ${sideIndex}`;
  },
  title
}) => {
  const toggleSide = (side: string) => {
    const newSides = selectedSides.includes(side)
      ? selectedSides.filter(s => s !== side)
      : [...selectedSides, side];
    onSidesChange(newSides);
  };

  return (
    <div className={styles.sideSelector}>
      {title && <h4 className={styles.selectorTitle}>{title}</h4>}
      <div className={styles.sideOptions}>
        {availableSides.map(side => (
          <button
            key={side}
            className={`${styles.sideButton} ${selectedSides.includes(side) ? styles.selected : ''}`}
            onClick={() => toggleSide(side)}
            type="button"
          >
            <span className={styles.sideLabel}>{getSideLabel(side)}</span>
            <span className={styles.checkMark}>
              {selectedSides.includes(side) ? '✓' : ''}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});

SideSelector.displayName = 'SideSelector';