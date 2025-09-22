import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseGameTimerOptions {
  /**
   * Auto-start the timer when hook initializes
   * @default false
   */
  autoStart?: boolean;

  /**
   * Update interval in milliseconds
   * @default 1000
   */
  interval?: number;

  /**
   * Initial elapsed time in milliseconds
   * @default 0
   */
  initialTime?: number;

  /**
   * Callback fired when timer updates
   */
  onTick?: (elapsedMs: number) => void;

  /**
   * Callback fired when timer starts
   */
  onStart?: () => void;

  /**
   * Callback fired when timer pauses
   */
  onPause?: () => void;

  /**
   * Callback fired when timer resumes
   */
  onResume?: () => void;

  /**
   * Callback fired when timer resets
   */
  onReset?: () => void;
}

export interface UseGameTimerReturn {
  /** Current elapsed time in milliseconds */
  elapsedTime: number;

  /** Whether the timer is currently running */
  isRunning: boolean;

  /** Whether the timer is currently paused */
  isPaused: boolean;

  /** Formatted time string in MM:SS format */
  formattedTime: string;

  /** Start or resume the timer */
  start: () => void;

  /** Pause the timer */
  pause: () => void;

  /** Resume the timer from paused state */
  resume: () => void;

  /** Stop and reset the timer to 0 */
  reset: () => void;

  /** Toggle between running and paused states */
  toggle: () => void;

  /** Get elapsed time in seconds */
  getElapsedSeconds: () => number;

  /** Get elapsed time in minutes */
  getElapsedMinutes: () => number;
}

/**
 * Reusable game timer hook with pause/resume functionality
 *
 * Provides precise timing for learning modes with support for:
 * - Start, pause, resume, and reset operations
 * - Formatted time display (MM:SS)
 * - Configurable update intervals
 * - Event callbacks for timer state changes
 * - Accurate time tracking even with component re-renders
 *
 * @example
 * ```typescript
 * const timer = useGameTimer({
 *   autoStart: true,
 *   onTick: (elapsed) => console.log(`Time: ${elapsed}ms`)
 * });
 *
 * return (
 *   <div>
 *     <div>Time: {timer.formattedTime}</div>
 *     <button onClick={timer.toggle}>
 *       {timer.isRunning ? 'Pause' : 'Start'}
 *     </button>
 *   </div>
 * );
 * ```
 */
export const useGameTimer = (options: UseGameTimerOptions = {}): UseGameTimerReturn => {
  const {
    autoStart = false,
    interval = 1000,
    initialTime = 0,
    onTick,
    onStart,
    onPause,
    onResume,
    onReset,
  } = options;

  // Timer state
  const [elapsedTime, setElapsedTime] = useState<number>(initialTime);
  const [isRunning, setIsRunning] = useState<boolean>(autoStart);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Refs for precise timing
  const startTimeRef = useRef<number | null>(null);
  const pauseTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const requestRef = useRef<number | null>(null);

  // Format elapsed time as MM:SS
  const formatTime = useCallback((timeMs: number): string => {
    const totalSeconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Update timer with high precision using RAF + setInterval hybrid
  const updateTimer = useCallback(() => {
    if (!startTimeRef.current) return;

    const now = Date.now();
    const elapsed = now - startTimeRef.current - pauseTimeRef.current;

    setElapsedTime(elapsed);
    onTick?.(elapsed);
  }, [onTick]);

  // Start the timer
  const start = useCallback(() => {
    if (isRunning) return;

    const now = Date.now();

    if (isPaused) {
      // Resuming from pause
      if (startTimeRef.current) {
        // Accumulate pause time
        pauseTimeRef.current += now - (pauseTimeRef.current > 0 ?
          startTimeRef.current + elapsedTime :
          startTimeRef.current);
      }
      setIsPaused(false);
      onResume?.();
    } else {
      // Starting fresh
      startTimeRef.current = now;
      pauseTimeRef.current = 0;
      onStart?.();
    }

    setIsRunning(true);
  }, [isRunning, isPaused, elapsedTime, onStart, onResume]);

  // Pause the timer
  const pause = useCallback(() => {
    if (!isRunning || isPaused) return;

    setIsRunning(false);
    setIsPaused(true);
    onPause?.();
  }, [isRunning, isPaused, onPause]);

  // Resume the timer
  const resume = useCallback(() => {
    if (!isPaused) return;

    start(); // start() handles resume logic
  }, [isPaused, start]);

  // Reset the timer
  const reset = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setElapsedTime(initialTime);
    startTimeRef.current = null;
    pauseTimeRef.current = 0;
    onReset?.();
  }, [initialTime, onReset]);

  // Toggle between running and paused
  const toggle = useCallback(() => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }, [isRunning, pause, start]);

  // Utility functions
  const getElapsedSeconds = useCallback(() => Math.floor(elapsedTime / 1000), [elapsedTime]);
  const getElapsedMinutes = useCallback(() => Math.floor(elapsedTime / 60000), [elapsedTime]);

  // Set up timer interval when running
  useEffect(() => {
    if (isRunning && !isPaused) {
      // Use setInterval for consistent updates
      intervalRef.current = setInterval(updateTimer, interval);

      // Also use RAF for smooth updates (optional for high-frequency updates)
      const rafUpdate = () => {
        updateTimer();
        if (isRunning && !isPaused) {
          requestRef.current = requestAnimationFrame(rafUpdate);
        }
      };

      // For second-based updates, we don't need RAF
      if (interval <= 100) {
        requestRef.current = requestAnimationFrame(rafUpdate);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [isRunning, isPaused, interval, updateTimer]);

  // Auto-start if configured
  useEffect(() => {
    if (autoStart && !isRunning && !isPaused) {
      start();
    }
  }, [autoStart, isRunning, isPaused, start]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return {
    elapsedTime,
    isRunning,
    isPaused,
    formattedTime: formatTime(elapsedTime),
    start,
    pause,
    resume,
    reset,
    toggle,
    getElapsedSeconds,
    getElapsedMinutes,
  };
};

export default useGameTimer;