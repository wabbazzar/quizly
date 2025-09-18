import { Component, ReactNode, ErrorInfo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { errorLogger } from '@/services/errorLogger';
import styles from './ErrorFallback.module.css';

interface ChunkLoadErrorBoundaryProps {
  children: ReactNode;
}

interface ChunkLoadErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
}

// Component to display when chunk loading fails
const ChunkLoadErrorFallback = ({ onRetry }: { onRetry: () => void }) => (
  <Card className={styles.errorCard}>
    <div className={styles.errorContent}>
      <div className={styles.errorIcon} role="img" aria-label="Loading Error">
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
          <path d="M12 6v6l4 2" />
          <line x1="15" y1="9" x2="9" y2="15" />
        </svg>
      </div>

      <h2 className={styles.errorTitle}>Failed to Load Application Resources</h2>

      <p className={styles.errorMessage}>
        Some application resources failed to load. This might be due to a network issue or the
        application has been updated. Please refresh the page to try again.
      </p>

      <div className={styles.buttonGroup}>
        <Button variant="primary" onClick={onRetry}>
          Refresh Page
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            // Clear any cached resources and reload
            if ('caches' in window) {
              caches
                .keys()
                .then(names => {
                  names.forEach(name => caches.delete(name));
                })
                .finally(() => window.location.reload());
            } else {
              (window as any).location.reload();
            }
          }}
        >
          Clear Cache & Reload
        </Button>
      </div>
    </div>
  </Card>
);

export class ChunkLoadErrorBoundary extends Component<
  ChunkLoadErrorBoundaryProps,
  ChunkLoadErrorBoundaryState
> {
  constructor(props: ChunkLoadErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isChunkError: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ChunkLoadErrorBoundaryState> {
    // Check if this is a chunk loading error
    const isChunkError = ChunkLoadErrorBoundary.isChunkLoadError(error);

    return {
      hasError: true,
      error,
      isChunkError,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const isChunkError = ChunkLoadErrorBoundary.isChunkLoadError(error);

    // Log the error
    errorLogger.logError(error, {
      level: 'chunk_load',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location?.href || 'unknown',
      userId: localStorage.getItem('userId') || null,
      sessionId: sessionStorage.getItem('sessionId') || 'unknown',
      componentStack: errorInfo.componentStack || undefined,
      errorBoundaryLevel: 'chunk_load',
      additionalContext: {
        isChunkError,
        errorType: 'component_lazy_load',
      },
    });

    // If it's a chunk error, attempt automatic recovery
    if (isChunkError) {
      console.warn('Chunk load error detected, attempting recovery...');

      // Delay before attempting reload to avoid rapid reload loops
      setTimeout(() => {
        if (this.state.hasError && this.state.isChunkError) {
          window.location.reload();
        }
      }, 2000);
    }
  }

  private static isChunkLoadError(error: Error): boolean {
    // Check for common chunk loading error patterns
    const chunkErrorPatterns = [
      /loading chunk \d+ failed/i,
      /loading css chunk \d+ failed/i,
      /failed to import/i,
      /dynamicimport/i,
      /chunk load failed/i,
      /network error/i,
    ];

    const errorMessage = error.message.toLowerCase();
    const errorStack = (error.stack || '').toLowerCase();

    return chunkErrorPatterns.some(
      pattern => pattern.test(errorMessage) || pattern.test(errorStack)
    );
  }

  private handleRetry = () => {
    // For chunk errors, always reload the page
    if (this.state.isChunkError) {
      window.location.reload();
    } else {
      // For other errors, try to reset the boundary
      this.setState({
        hasError: false,
        error: null,
        isChunkError: false,
      });
    }
  };

  render() {
    const { hasError, isChunkError } = this.state;
    const { children } = this.props;

    if (hasError && isChunkError) {
      return <ChunkLoadErrorFallback onRetry={this.handleRetry} />;
    }

    // For non-chunk errors, let them bubble up to parent error boundaries
    if (hasError) {
      throw this.state.error;
    }

    return children;
  }
}
