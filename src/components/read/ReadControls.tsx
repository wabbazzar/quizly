import { FC } from 'react';
import { Button } from '@/components/ui/Button';
import styles from './ReadControls.module.css';

interface Props {
  canGoPrevious: boolean;
  canGoNext: boolean;
  showPinyin: boolean;
  showTranslation: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onTogglePinyin: () => void;
  onToggleTranslation: () => void;
}

export const ReadControls: FC<Props> = ({
  canGoPrevious,
  canGoNext,
  showPinyin,
  showTranslation,
  onPrevious,
  onNext,
  onTogglePinyin,
  onToggleTranslation
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.navigationControls}>
        <Button
          variant="secondary"
          size="medium"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className={styles.navButton}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" />
          </svg>
          Previous
        </Button>
        <Button
          variant="secondary"
          size="medium"
          onClick={onNext}
          disabled={!canGoNext}
          className={styles.navButton}
        >
          Next
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12H19M19 12L12 5M19 12L12 19" />
          </svg>
        </Button>
      </div>

      <div className={styles.toggleControls}>
        <Button
          variant={showPinyin ? 'primary' : 'secondary'}
          size="small"
          onClick={onTogglePinyin}
          className={styles.toggleButton}
        >
          {showPinyin ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          )}
          Pinyin (R)
        </Button>
        <Button
          variant={showTranslation ? 'primary' : 'secondary'}
          size="small"
          onClick={onToggleTranslation}
          className={styles.toggleButton}
        >
          {showTranslation ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          )}
          Translation (T)
        </Button>
      </div>

      <div className={styles.shortcuts}>
        <span className={styles.shortcutHint}>
          Use ↑/↓ or J/K to navigate • R for pinyin • T for translation
        </span>
      </div>
    </div>
  );
};