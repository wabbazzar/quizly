import { FC, memo } from 'react';
import { ArrowLeftIcon } from '@/components/icons/NavigationIcons';
import SettingsIcon from '@/components/icons/SettingsIcon';
import styles from './SharedModeHeader.module.css';

export interface SharedModeHeaderProps {
  deckName: string;
  currentCard: number;
  totalCards: number;
  /**
   * If omitted, the back button slot is rendered empty. Used by top-level
   * destinations reached via the bottom-nav (e.g. the Audio page), where
   * "back" has no meaningful target.
   */
  onBackClick?: () => void;
  onSettingsClick?: () => void;
  showSettings?: boolean;
  subtitle?: string;
  className?: string;
}

export const SharedModeHeader: FC<SharedModeHeaderProps> = memo(
  ({
    deckName,
    currentCard,
    totalCards,
    onBackClick,
    onSettingsClick,
    showSettings = false,
    subtitle,
    className,
  }) => {
    return (
      <header className={`${styles.header} ${className || ''}`}>
        <div className={styles.headerLeft}>
          {onBackClick && (
            <button onClick={onBackClick} className={styles.backButton} aria-label="Go back">
              <ArrowLeftIcon size={20} />
              <span className={styles.backLabel}>Back</span>
            </button>
          )}
        </div>

        <div className={styles.headerCenter}>
          <div className={styles.titleSection}>
            <h1 className={styles.deckName}>{deckName}</h1>
            <div className={styles.progressInfo}>
              <span className={styles.cardCount}>
                {currentCard} of {totalCards}
              </span>
              {subtitle && <span className={styles.subtitle}>• {subtitle}</span>}
            </div>
          </div>
        </div>

        <div className={styles.headerRight}>
          {showSettings && onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className={styles.settingsButton}
              aria-label="Settings"
            >
              <SettingsIcon size={20} />
            </button>
          )}
        </div>
      </header>
    );
  }
);

SharedModeHeader.displayName = 'SharedModeHeader';
