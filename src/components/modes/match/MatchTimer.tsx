import { FC, memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameTimer } from '@/hooks/useGameTimer';
import styles from './MatchTimer.module.css';

export interface MatchTimerProps {
  /**
   * Whether the timer is enabled/visible
   */
  isEnabled: boolean;

  /**
   * Whether the timer is currently paused
   */
  isPaused: boolean;

  /**
   * Initial time in milliseconds (for session restoration)
   */
  initialTime?: number;

  /**
   * Auto-start the timer when component mounts
   * @default true
   */
  autoStart?: boolean;

  /**
   * Callback when timer value changes
   */
  onTimeChange?: (elapsedMs: number, formattedTime: string) => void;

  /**
   * Callback when timer starts
   */
  onStart?: () => void;

  /**
   * Callback when timer pauses
   */
  onPause?: () => void;

  /**
   * Callback when timer resumes
   */
  onResume?: () => void;

  /**
   * Custom CSS class name
   */
  className?: string;

  /**
   * Compact display mode for mobile
   * @default false
   */
  compact?: boolean;

  /**
   * Show milliseconds in addition to MM:SS
   * @default false
   */
  showMilliseconds?: boolean;

  /**
   * Color theme for the timer
   * @default 'primary'
   */
  theme?: 'primary' | 'secondary' | 'success' | 'warning' | 'neutral';
}

/**
 * Match mode timer component with pause/resume functionality
 *
 * Features:
 * - Count-up timer with MM:SS format
 * - Pause/resume support with accurate time tracking
 * - Animated state transitions
 * - Mobile-optimized compact mode
 * - Theme support for different visual styles
 * - Accessibility support with proper ARIA labels
 *
 * @example
 * ```tsx
 * <MatchTimer
 *   isEnabled={true}
 *   isPaused={gameIsPaused}
 *   onTimeChange={(elapsed, formatted) => console.log(formatted)}
 *   compact={isMobile}
 * />
 * ```
 */
export const MatchTimer: FC<MatchTimerProps> = memo(({
  isEnabled,
  isPaused,
  initialTime = 0,
  autoStart = true,
  onTimeChange,
  onStart,
  onPause,
  onResume,
  className,
  compact = false,
  showMilliseconds = false,
  theme = 'primary',
}) => {
  const timer = useGameTimer({
    autoStart: autoStart && isEnabled && !isPaused,
    initialTime,
    onTick: (elapsed) => {
      if (onTimeChange) {
        onTimeChange(elapsed, timer.formattedTime);
      }
    },
    onStart,
    onPause,
    onResume,
  });

  // Sync external pause state with internal timer
  useEffect(() => {
    if (!isEnabled) return;

    if (isPaused && timer.isRunning) {
      timer.pause();
    } else if (!isPaused && !timer.isRunning && timer.isPaused) {
      timer.resume();
    }
  }, [isPaused, isEnabled, timer]);

  // Format time with optional milliseconds
  const getFormattedTime = () => {
    if (!showMilliseconds) {
      return timer.formattedTime;
    }

    const milliseconds = timer.elapsedTime % 1000;
    const centiseconds = Math.floor(milliseconds / 10);
    return `${timer.formattedTime}.${centiseconds.toString().padStart(2, '0')}`;
  };

  // Don't render if timer is disabled
  if (!isEnabled) {
    return null;
  }

  const containerClasses = [
    styles.container,
    styles[`theme-${theme}`],
    compact && styles.compact,
    isPaused && styles.paused,
    className,
  ].filter(Boolean).join(' ');

  const timerValue = getFormattedTime();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="timer"
        className={containerClasses}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        role="timer"
        aria-label={`Game timer: ${timerValue}`}
        aria-live="polite"
        data-testid="match-timer"
      >
        {/* Timer icon */}
        <motion.div
          className={styles.timerIcon}
          animate={timer.isRunning ? {
            rotate: [0, 360],
          } : {}}
          transition={{
            duration: 2,
            repeat: timer.isRunning ? Infinity : 0,
            ease: 'linear',
          }}
          aria-hidden="true"
        >
          <svg
            width={compact ? 16 : 20}
            height={compact ? 16 : 20}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M12 6v6l4 2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>

        {/* Timer display */}
        <motion.div
          className={styles.timeDisplay}
          key={timerValue}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.1 }}
        >
          <span className={styles.timeValue}>
            {timerValue}
          </span>

          {!compact && (
            <span className={styles.timeLabel}>
              {timer.isPaused ? 'Paused' : 'Elapsed'}
            </span>
          )}
        </motion.div>

        {/* Pause indicator */}
        <AnimatePresence>
          {timer.isPaused && (
            <motion.div
              className={styles.pauseIndicator}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              aria-hidden="true"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse effect when running */}
        {timer.isRunning && !compact && (
          <motion.div
            className={styles.pulseRing}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.1, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            aria-hidden="true"
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
});

MatchTimer.displayName = 'MatchTimer';

export default MatchTimer;