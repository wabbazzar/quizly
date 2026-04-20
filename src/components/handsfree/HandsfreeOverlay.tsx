import { FC, memo } from 'react';
import type { HandsfreeState } from '@/hooks/useHandsfreeMode';
import styles from './HandsfreeOverlay.module.css';

interface HandsfreeOverlayProps {
  state: HandsfreeState;
  level: number;
  distance: number | null;
  isCorrect: boolean | null;
  attempt: number;
  error: string | null;
  onSkip: () => void;
  onStop: () => void;
}

/**
 * Compact handsfree status bar that sits at the bottom of the card area.
 * Shows state icon, label, and controls in a single row.
 */
const HandsfreeOverlay: FC<HandsfreeOverlayProps> = memo(({
  state,
  level,
  isCorrect,
  attempt,
  error,
  onSkip,
  onStop,
}) => {
  const showSkip = state === 'listening' || state === 'playing_prompt' || state === 'retrying';
  const isActive = state !== 'idle';

  return (
    <div className={styles.bar}>
      {/* Status indicator */}
      <div className={styles.status}>
        {state === 'playing_prompt' && (
          <>
            <div className={styles.dot} style={{ background: 'var(--primary-main)' }}>
              <SpeakerSVG />
            </div>
            <span className={styles.label}>Playing</span>
          </>
        )}

        {(state === 'listening' || state === 'retrying') && (
          <>
            <div className={styles.micDot} style={{ boxShadow: `0 0 0 ${Math.min(level / 8, 8)}px rgba(239, 68, 68, 0.2)` }}>
              <MicSVG />
            </div>
            <span className={styles.label}>
              {attempt > 1 ? `Try again (${attempt})` : 'Speak now'}
            </span>
          </>
        )}

        {state === 'evaluating' && (
          <>
            <div className={`${styles.dot} ${styles.spinning}`} style={{ borderColor: 'var(--primary-main)', borderTopColor: 'transparent' }} />
            <span className={styles.label}>Checking</span>
          </>
        )}

        {state === 'showing_result' && (
          <>
            <div className={`${styles.dot} ${isCorrect ? styles.correctDot : styles.incorrectDot}`}>
              {isCorrect ? <CheckSVG /> : <CrossSVG />}
            </div>
            <span className={`${styles.label} ${isCorrect ? styles.correctText : styles.incorrectText}`}>
              {isCorrect ? 'Correct' : 'Incorrect'}
            </span>
          </>
        )}

        {state === 'playing_correction' && (
          <>
            <div className={`${styles.dot} ${styles.incorrectDot}`}>
              <SpeakerSVG />
            </div>
            <span className={styles.label}>Listen</span>
          </>
        )}

        {state === 'idle' && error && (
          <span className={styles.errorLabel}>{error}</span>
        )}
      </div>

      {/* Controls */}
      <div className={styles.actions}>
        {showSkip && (
          <button className={styles.actionBtn} onClick={onSkip} aria-label="Skip card">
            Skip
          </button>
        )}
        {isActive && (
          <button className={`${styles.actionBtn} ${styles.stopBtn}`} onClick={onStop} aria-label="Stop handsfree mode">
            Stop
          </button>
        )}
      </div>
    </div>
  );
});

HandsfreeOverlay.displayName = 'HandsfreeOverlay';
export default HandsfreeOverlay;

// Compact 16px icons
const MicSVG: FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
  </svg>
);

const SpeakerSVG: FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
);

const CheckSVG: FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const CrossSVG: FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
