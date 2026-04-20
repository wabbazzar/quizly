import { FC, memo } from 'react';
import type { HandsfreeState } from '@/hooks/useHandsfreeMode';
import styles from './HandsfreeOverlay.module.css';

interface HandsfreeOverlayProps {
  state: HandsfreeState;
  level: number;
  distance: number | null;
  isCorrect: boolean | null;
  error: string | null;
  onSkip: () => void;
  onStop: () => void;
}

const HandsfreeOverlay: FC<HandsfreeOverlayProps> = memo(({
  state,
  level,
  distance,
  isCorrect,
  error,
  onSkip,
  onStop,
}) => {
  return (
    <div className={styles.overlay}>
      {/* State indicator */}
      <div className={styles.stateSection}>
        {state === 'playing_prompt' && (
          <div className={styles.stateIcon}>
            <div className={styles.speakerIcon}>
              <SpeakerSVG />
            </div>
            <span className={styles.stateLabel}>Playing...</span>
          </div>
        )}

        {state === 'listening' && (
          <div className={styles.stateIcon}>
            <div className={styles.micContainer}>
              <MicSVG />
              <div
                className={styles.levelRing}
                style={{ transform: `scale(${1 + level / 200})`, opacity: 0.3 + level / 150 }}
              />
            </div>
            <span className={styles.stateLabel}>Listening...</span>
          </div>
        )}

        {state === 'evaluating' && (
          <div className={styles.stateIcon}>
            <div className={styles.spinner} />
            <span className={styles.stateLabel}>Comparing...</span>
          </div>
        )}

        {state === 'showing_result' && (
          <div className={styles.stateIcon}>
            <div className={`${styles.resultIcon} ${isCorrect ? styles.correct : styles.incorrect}`}>
              {isCorrect ? <CheckSVG /> : <CrossSVG />}
            </div>
            {distance !== null && (
              <span className={styles.distanceLabel}>
                Distance: {distance.toFixed(1)}
              </span>
            )}
          </div>
        )}

        {state === 'playing_correction' && (
          <div className={styles.stateIcon}>
            <div className={`${styles.resultIcon} ${styles.incorrect}`}>
              <SpeakerSVG />
            </div>
            <span className={styles.stateLabel}>Correct pronunciation...</span>
          </div>
        )}

        {state === 'idle' && error && (
          <div className={styles.errorText}>{error}</div>
        )}
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        {(state === 'listening' || state === 'playing_prompt') && (
          <button className={styles.skipButton} onClick={onSkip}>
            Skip
          </button>
        )}
        <button className={styles.stopButton} onClick={onStop}>
          Stop Handsfree
        </button>
      </div>
    </div>
  );
});

HandsfreeOverlay.displayName = 'HandsfreeOverlay';
export default HandsfreeOverlay;

// --- Inline SVG Icons ---

const MicSVG: FC = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const SpeakerSVG: FC = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
);

const CheckSVG: FC = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const CrossSVG: FC = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
