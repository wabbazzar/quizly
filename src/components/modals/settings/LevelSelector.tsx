import { FC, memo } from 'react';
import styles from './LevelSelector.module.css';

export interface LevelSelectorProps {
  availableLevels: number[];
  selectedLevels: number[];
  onLevelsChange: (levels: number[]) => void;
  minLevel?: number;
  maxLevel?: number;
  allowRangeSelection?: boolean;
}

export const LevelSelector: FC<LevelSelectorProps> = memo(
  ({ availableLevels, selectedLevels, onLevelsChange }) => {
    const toggleLevel = (level: number) => {
      const newLevels = selectedLevels.includes(level)
        ? selectedLevels.filter(l => l !== level)
        : [...selectedLevels, level];
      onLevelsChange(newLevels);
    };

    const selectAll = () => {
      onLevelsChange([...availableLevels]);
    };

    const deselectAll = () => {
      onLevelsChange([]);
    };

    return (
      <div className={styles.levelSelector}>
        <div className={styles.levelControls}>
          <button type="button" className={styles.controlButton} onClick={selectAll}>
            Select All
          </button>
          <button type="button" className={styles.controlButton} onClick={deselectAll}>
            Clear All
          </button>
        </div>

        <div className={styles.levelGrid}>
          {availableLevels.map(level => (
            <button
              key={level}
              type="button"
              className={`${styles.levelButton} ${selectedLevels.includes(level) ? styles.selected : ''}`}
              onClick={() => toggleLevel(level)}
            >
              Level {level}
            </button>
          ))}
        </div>

        {selectedLevels.length > 0 && (
          <div className={styles.selectedSummary}>
            Selected: {selectedLevels.length} of {availableLevels.length} levels
          </div>
        )}
      </div>
    );
  }
);

LevelSelector.displayName = 'LevelSelector';
