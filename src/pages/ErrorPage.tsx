import { FC } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import styles from '@/components/error/ErrorFallback.module.css';

interface ErrorPageProps {
  error?: Error;
  level?: 'app' | 'route' | 'feature' | 'component';
  onRetry?: () => void;
  onReload?: () => void;
}

const ErrorPage: FC<ErrorPageProps> = ({
  error,
  onRetry,
  onReload
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get error from location state if not provided as prop
  const displayError = error || (location.state as any)?.error;
  const isNotFound = !displayError && location.pathname !== '/error';

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else if (isNotFound) {
      navigate('/', { replace: true });
    } else {
      window.location.reload();
    }
  };

  const handleReload = () => {
    if (onReload) {
      onReload();
    } else {
      window.location.reload();
    }
  };

  const getErrorContent = () => {
    if (isNotFound) {
      return {
        title: 'Page Not Found',
        message: 'The page you are looking for does not exist or has been moved.',
        icon: (
          <svg
            width={64}
            height={64}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className={styles.iconSvg}
          >
            <circle cx="12" cy="12" r="10"/>
            <path d="M16 16s-1.5-2-4-2-4 2-4 2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
        ),
        buttons: (
          <div className={styles.buttonGroup}>
            <Button variant="primary" onClick={() => navigate('/')}>
              Go Home
            </Button>
            <Button variant="secondary" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        ),
      };
    }

    return {
      title: 'Application Error',
      message: displayError
        ? `An error occurred: ${displayError.message}`
        : 'The application encountered an unexpected error.',
      icon: (
        <svg
          width={64}
          height={64}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={styles.iconSvg}
        >
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      ),
      buttons: (
        <div className={styles.buttonGroup}>
          <Button variant="primary" onClick={handleRetry}>
            Try Again
          </Button>
          <Button variant="secondary" onClick={handleReload}>
            Refresh Page
          </Button>
          <Button variant="tertiary" onClick={() => navigate('/')}>
            Go Home
          </Button>
        </div>
      ),
    };
  };

  const content = getErrorContent();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-4, 1rem)',
      background: 'var(--bg-secondary, #F7F8FA)',
    }}>
      <Card className={styles.errorCard}>
        <div className={styles.errorContent}>
          <div className={styles.errorIcon} role="img" aria-label="Error">
            {content.icon}
          </div>

          <h1 className={styles.errorTitle}>
            {content.title}
          </h1>

          <p className={styles.errorMessage}>
            {content.message}
          </p>

          {displayError && import.meta.env.DEV && (
            <details className={styles.errorDetails}>
              <summary>Error Details (Development Only)</summary>
              <pre className={styles.errorStack}>
                {displayError.name}: {displayError.message}
                {'\n'}
                {displayError.stack}
              </pre>
            </details>
          )}

          {content.buttons}
        </div>
      </Card>
    </div>
  );
};

export default ErrorPage;