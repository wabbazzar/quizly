import { FC, memo } from 'react';
import { SpinnerProps } from './types';
import styles from './Spinner.module.css';

export const Spinner: FC<SpinnerProps> = memo(({ size = 'medium', variant = 'primary' }) => {
  const spinnerClasses = [styles.spinner, styles[size], styles[variant]].filter(Boolean).join(' ');

  return (
    <div className={spinnerClasses} role="status" aria-label="Loading">
      <span className={styles.visuallyHidden}>Loading...</span>
      <div className={styles.spinnerBlade} />
      <div className={styles.spinnerBlade} />
      <div className={styles.spinnerBlade} />
      <div className={styles.spinnerBlade} />
      <div className={styles.spinnerBlade} />
      <div className={styles.spinnerBlade} />
      <div className={styles.spinnerBlade} />
      <div className={styles.spinnerBlade} />
    </div>
  );
});

Spinner.displayName = 'Spinner';
