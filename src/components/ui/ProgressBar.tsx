import { FC, memo } from 'react';
import { ProgressBarProps } from './types';
import styles from './ProgressBar.module.css';

export const ProgressBar: FC<ProgressBarProps> = memo(({
  value,
  max = 100,
  variant = 'default',
  size = 'medium',
  showLabel = false,
  animated = true
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const containerClasses = [
    styles.container,
    styles[size]
  ].filter(Boolean).join(' ');

  const barClasses = [
    styles.bar,
    styles[variant],
    animated && styles.animated
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={barClasses}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className={styles.label}>
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';