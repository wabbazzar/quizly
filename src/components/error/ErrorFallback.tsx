import { FC } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import styles from './ErrorFallback.module.css';

export interface ErrorFallbackProps {
  error: Error;
  errorId: string | null;
  level: 'app' | 'route' | 'feature' | 'component';
  onRetry: () => void;
  onReload: () => void;
}

export const ErrorFallback: FC<ErrorFallbackProps> = ({
  error,
  errorId,
  level,
  onRetry,
  onReload,
}) => {
  const getErrorMessage = () => {
    switch (level) {
      case 'app':
        return 'The application encountered an unexpected error. Please try refreshing the page.';
      case 'route':
        return 'This page failed to load properly. You can try again or navigate to a different page.';
      case 'feature':
        return 'This feature is temporarily unavailable. You can try again or continue using other parts of the app.';
      case 'component':
        return 'A component failed to load. You can try refreshing this section.';
      default:
        return 'Something went wrong. Please try again.';
    }
  };

  const getActionButtons = () => {
    switch (level) {
      case 'app':
        return (
          <div className={styles.buttonGroup}>
            <Button variant="primary" onClick={onReload}>
              Refresh Page
            </Button>
            <Button variant="secondary" onClick={() => (window.location.href = '/')}>
              Go Home
            </Button>
          </div>
        );
      case 'route':
        return (
          <div className={styles.buttonGroup}>
            <Button variant="primary" onClick={onRetry}>
              Try Again
            </Button>
            <Button variant="secondary" onClick={onReload}>
              Refresh Page
            </Button>
            <Button variant="tertiary" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        );
      default:
        return (
          <div className={styles.buttonGroup}>
            <Button variant="primary" onClick={onRetry}>
              Try Again
            </Button>
            {level === 'feature' && (
              <Button variant="secondary" onClick={onReload}>
                Refresh Page
              </Button>
            )}
          </div>
        );
    }
  };

  return (
    <Card className={styles.errorCard}>
      <div className={styles.errorContent}>
        <div className={styles.errorIcon} role="img" aria-label="Error">
          <svg
            width={64}
            height={64}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className={styles.iconSvg}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>

        <h2 className={styles.errorTitle}>Oops! Something went wrong</h2>

        <p className={styles.errorMessage}>{getErrorMessage()}</p>

        {import.meta.env.DEV && (
          <details className={styles.errorDetails}>
            <summary>Error Details (Development Only)</summary>
            <pre className={styles.errorStack}>
              {error.name}: {error.message}
              {'\n'}
              {error.stack}
            </pre>
          </details>
        )}

        {errorId && (
          <p className={styles.errorId}>
            Error ID: <code>{errorId}</code>
          </p>
        )}

        {getActionButtons()}
      </div>
    </Card>
  );
};

// Feature-specific error fallbacks
export const LearnModeErrorFallback: FC<ErrorFallbackProps> = ({ onRetry }) => (
  <Card className={styles.errorCard}>
    <div className={styles.errorContent}>
      <div className={styles.errorIcon} role="img" aria-label="Learn Mode Error">
        <svg
          width={64}
          height={64}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={styles.iconSvg}
        >
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </div>
      <h2>Learn Mode Error</h2>
      <p>The learning session encountered an error. Your progress has been saved.</p>
      <div className={styles.buttonGroup}>
        <Button variant="primary" onClick={onRetry}>
          Resume Session
        </Button>
        <Button variant="secondary" onClick={() => (window.location.href = '/')}>
          Return to Home
        </Button>
      </div>
    </div>
  </Card>
);

export const DeckErrorFallback: FC<ErrorFallbackProps> = ({ onRetry }) => (
  <Card className={styles.errorCard}>
    <div className={styles.errorContent}>
      <div className={styles.errorIcon} role="img" aria-label="Deck Error">
        <svg
          width={64}
          height={64}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={styles.iconSvg}
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="15" y1="14" x2="9" y2="20" />
          <line x1="9" y1="14" x2="15" y2="20" />
        </svg>
      </div>
      <h2>Deck Loading Error</h2>
      <p>Failed to load this deck. Please check your connection and try again.</p>
      <div className={styles.buttonGroup}>
        <Button variant="primary" onClick={onRetry}>
          Retry Loading
        </Button>
        <Button variant="secondary" onClick={() => (window.location.href = '/')}>
          Browse Other Decks
        </Button>
      </div>
    </div>
  </Card>
);
