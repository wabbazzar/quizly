import { FC, memo } from 'react';
import { LoadingScreenProps } from './types';
import { Spinner } from './Spinner';
import styles from './LoadingScreen.module.css';

export const LoadingScreen: FC<LoadingScreenProps> = memo(
  ({ message = 'Loading...', fullScreen = true }) => {
    const containerClasses = [styles.container, fullScreen && styles.fullScreen]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={containerClasses} role="status" aria-live="polite">
        <div className={styles.content}>
          <Spinner size="large" variant="primary" />
          <p className={styles.message}>{message}</p>
        </div>
      </div>
    );
  }
);

LoadingScreen.displayName = 'LoadingScreen';
