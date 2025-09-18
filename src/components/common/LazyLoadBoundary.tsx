import { FC, Suspense, Component, ReactNode, ErrorInfo } from 'react';
import styles from './LazyLoadBoundary.module.css';

interface LazyLoadBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  retryable?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

// Performance-optimized loading spinner
const DefaultLoadingSpinner: FC = () => (
  <div className={styles.loadingContainer}>
    <div className={styles.spinner} role="status" aria-label="Loading">
      <div className={styles.spinnerInner}></div>
    </div>
    <p className={styles.loadingText}>Loading...</p>
  </div>
);

// Error fallback with retry option
const DefaultErrorFallback: FC<{
  error?: Error;
  onRetry?: () => void;
  retryable?: boolean;
}> = ({ error, onRetry, retryable = true }) => (
  <div className={styles.errorContainer}>
    <div className={styles.errorIcon}>⚠️</div>
    <h3 className={styles.errorTitle}>Something went wrong</h3>
    <p className={styles.errorMessage}>{error?.message || 'Failed to load this component'}</p>
    {retryable && onRetry && (
      <button className={styles.retryButton} onClick={onRetry} type="button">
        Try Again
      </button>
    )}
  </div>
);

// Error boundary for handling lazy loading failures
class LazyErrorBoundary extends Component<
  {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    retryable?: boolean;
    onRetry?: () => void;
  },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to performance monitoring
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark('lazy-component-error');
    }

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Log error for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('LazyLoadBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    const maxRetries = 3;
    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        retryCount: prevState.retryCount + 1,
      }));
      this.props.onRetry?.();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          onRetry={this.props.retryable ? this.handleRetry : undefined}
          retryable={this.props.retryable && this.state.retryCount < 3}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Complete lazy loading boundary with suspense and error handling
 */
export const LazyLoadBoundary: FC<LazyLoadBoundaryProps> = ({
  children,
  fallback,
  errorFallback,
  onError,
  retryable = true,
}) => {
  const loadingFallback = fallback || <DefaultLoadingSpinner />;

  return (
    <LazyErrorBoundary fallback={errorFallback} onError={onError} retryable={retryable}>
      <Suspense fallback={loadingFallback}>{children}</Suspense>
    </LazyErrorBoundary>
  );
};

/**
 * Lightweight boundary for non-critical components
 */
export const SimpleLazyBoundary: FC<{ children: ReactNode }> = ({ children }) => (
  <Suspense fallback={<div className={styles.simpleFallback}>Loading...</div>}>{children}</Suspense>
);

/**
 * Page-level boundary with full error handling
 */
export const PageLazyBoundary: FC<{
  children: ReactNode;
  pageName?: string;
}> = ({ children, pageName }) => (
  <LazyLoadBoundary
    fallback={
      <div className={styles.pageLoadingContainer}>
        <DefaultLoadingSpinner />
        {pageName && <p>Loading {pageName}...</p>}
      </div>
    }
    onError={(error, errorInfo) => {
      // Enhanced error tracking for pages
      if (typeof window !== 'undefined') {
        console.error(`Page loading error (${pageName}):`, error, errorInfo);

        // Track page loading failures for monitoring
        if ('performance' in window) {
          performance.mark(`page-load-error-${pageName || 'unknown'}`);
        }
      }
    }}
    retryable={true}
  >
    {children}
  </LazyLoadBoundary>
);

export default LazyLoadBoundary;
