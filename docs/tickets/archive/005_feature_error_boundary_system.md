# Ticket 005: Error Boundary and Error Handling System

## Metadata

- **Status**: Completed
- **Priority**: High
- **Effort**: 12 points
- **Created**: 2025-09-17
- **Type**: feature
- **Platforms**: Web (Desktop/Tablet/Mobile)

## User Stories

### Primary User Story

As a user, I want the application to gracefully handle errors and crashes so
that I never lose my progress and can continue using the app even when something
goes wrong.

### Secondary User Stories

- As a developer, I want comprehensive error logging so that bugs can be
  identified and fixed quickly
- As a user, I want clear error messages so that I understand what went wrong
  and how to recover
- As a support team member, I want detailed error reports so that user issues
  can be resolved efficiently
- As a product owner, I want error recovery mechanisms so that user retention
  remains high even during failures

## Technical Requirements

### Functional Requirements

1. **Error Boundary Implementation**: Strategic error boundaries at route,
   feature, and component levels to prevent cascading failures
2. **Error Logging**: Comprehensive error tracking with context, user actions,
   and environment details
3. **Graceful Recovery**: Automatic retry mechanisms and fallback UI states for
   common failure scenarios
4. **Progress Preservation**: Session state recovery and data persistence during
   errors
5. **User Communication**: Clear, actionable error messages with recovery
   instructions

### Non-Functional Requirements

1. Performance: Error handling overhead <1ms per component, error reporting
   async
2. Reliability: Error boundaries must not themselves crash, 100% error capture
   rate
3. Privacy: Error reporting respects user privacy, no sensitive data in logs
4. Accessibility: Error messages fully accessible with screen reader support

## Implementation Plan

### Phase 1: Core Error Boundary Infrastructure (3 points)

**Files to create/modify:**

- `src/components/error/ErrorBoundary.tsx` - Root error boundary component
- `src/components/error/FeatureErrorBoundary.tsx` - Feature-specific error
  boundaries
- `src/components/error/ErrorFallback.tsx` - Error UI fallback components
- `src/services/errorLogger.ts` - Error logging and reporting service
- `src/hooks/useErrorHandler.ts` - Custom hook for error handling

**Core Error Boundary:**

```typescript
// src/components/error/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorFallback } from './ErrorFallback';
import { errorLogger } from '@/services/errorLogger';

interface ErrorBoundaryProps {
  children: ReactNode;
  level: 'app' | 'route' | 'feature' | 'component';
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.logError(error, errorInfo);

    this.setState({
      errorInfo,
      errorId,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error boundary when reset keys change
    if (hasError && resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }

    // Reset on any prop change if configured
    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary();
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo): string => {
    const errorContext = {
      level: this.props.level,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getUserId(), // Get from auth context
      sessionId: this.getSessionId(), // Get from session storage
      componentStack: errorInfo.componentStack,
      errorBoundaryLevel: this.props.level,
    };

    return errorLogger.logError(error, errorContext);
  };

  private getUserId = (): string | null => {
    // Get user ID from auth context or localStorage
    return localStorage.getItem('userId') || null;
  };

  private getSessionId = (): string => {
    // Get or create session ID
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  };

  private resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  private handleRetry = () => {
    this.resetErrorBoundary();
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error, errorId } = this.state;
    const { children, fallback: FallbackComponent = ErrorFallback } = this.props;

    if (hasError && error) {
      return (
        <FallbackComponent
          error={error}
          errorId={errorId}
          level={this.props.level}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
        />
      );
    }

    return children;
  }
}
```

**Error Fallback Components:**

```typescript
// src/components/error/ErrorFallback.tsx
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
            <Button variant="secondary" onClick={() => window.location.href = '/'}>
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
          ⚠️
        </div>

        <h2 className={styles.errorTitle}>
          Oops! Something went wrong
        </h2>

        <p className={styles.errorMessage}>
          {getErrorMessage()}
        </p>

        {process.env.NODE_ENV === 'development' && (
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
export const LearnModeErrorFallback: FC<ErrorFallbackProps> = ({
  error,
  onRetry,
  onReload,
}) => (
  <Card className={styles.errorCard}>
    <div className={styles.errorContent}>
      <h2>Learn Mode Error</h2>
      <p>
        The learning session encountered an error. Your progress has been saved.
      </p>
      <div className={styles.buttonGroup}>
        <Button variant="primary" onClick={onRetry}>
          Resume Session
        </Button>
        <Button variant="secondary" onClick={() => window.location.href = '/'}>
          Return to Home
        </Button>
      </div>
    </div>
  </Card>
);

export const DeckErrorFallback: FC<ErrorFallbackProps> = ({
  error,
  onRetry,
}) => (
  <Card className={styles.errorCard}>
    <div className={styles.errorContent}>
      <h2>Deck Loading Error</h2>
      <p>
        Failed to load this deck. Please check your connection and try again.
      </p>
      <div className={styles.buttonGroup}>
        <Button variant="primary" onClick={onRetry}>
          Retry Loading
        </Button>
        <Button variant="secondary" onClick={() => window.location.href = '/'}>
          Browse Other Decks
        </Button>
      </div>
    </div>
  </Card>
);
```

**Error Logging Service:**

```typescript
// src/services/errorLogger.ts
interface ErrorContext {
  level: string;
  timestamp: string;
  userAgent: string;
  url: string;
  userId: string | null;
  sessionId: string;
  componentStack?: string;
  errorBoundaryLevel: string;
  additionalContext?: Record<string, any>;
}

interface ErrorReport {
  id: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorLogger {
  private errorQueue: ErrorReport[] = [];
  private isOnline = navigator.onLine;
  private maxQueueSize = 100;

  constructor() {
    this.setupOnlineListener();
    this.setupUnhandledErrorListeners();
  }

  private setupOnlineListener() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushErrorQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private setupUnhandledErrorListeners() {
    // Global error handler for unhandled JavaScript errors
    window.addEventListener('error', event => {
      const error = new Error(event.message);
      error.stack = `${event.filename}:${event.lineno}:${event.colno}`;

      this.logError(error, {
        level: 'global',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.getUserId(),
        sessionId: this.getSessionId(),
        errorBoundaryLevel: 'global',
        additionalContext: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Global handler for unhandled promise rejections
    window.addEventListener('unhandledrejection', event => {
      const error = new Error(`Unhandled Promise Rejection: ${event.reason}`);

      this.logError(error, {
        level: 'promise',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.getUserId(),
        sessionId: this.getSessionId(),
        errorBoundaryLevel: 'global',
        additionalContext: {
          promiseRejectionReason: event.reason,
        },
      });
    });
  }

  public logError(error: Error, context: ErrorContext): string {
    const errorId = this.generateErrorId();

    const errorReport: ErrorReport = {
      id: errorId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
      severity: this.determineSeverity(error, context),
    };

    // Store locally first
    this.storeErrorLocally(errorReport);

    // Add to queue for remote reporting
    this.queueError(errorReport);

    // Try to send immediately if online
    if (this.isOnline) {
      this.flushErrorQueue();
    }

    return errorId;
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineSeverity(
    error: Error,
    context: ErrorContext
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: App-level errors, security issues
    if (
      context.errorBoundaryLevel === 'app' ||
      error.message.includes('security')
    ) {
      return 'critical';
    }

    // High: Route-level errors, data corruption
    if (
      context.errorBoundaryLevel === 'route' ||
      error.message.includes('corruption')
    ) {
      return 'high';
    }

    // Medium: Feature-level errors, network issues
    if (
      context.errorBoundaryLevel === 'feature' ||
      error.message.includes('network')
    ) {
      return 'medium';
    }

    // Low: Component-level errors, validation issues
    return 'low';
  }

  private storeErrorLocally(errorReport: ErrorReport) {
    try {
      const existingErrors = this.getStoredErrors();
      existingErrors.push(errorReport);

      // Keep only the most recent 50 errors
      const recentErrors = existingErrors.slice(-50);

      localStorage.setItem('errorReports', JSON.stringify(recentErrors));
    } catch (e) {
      console.warn('Failed to store error locally:', e);
    }
  }

  private getStoredErrors(): ErrorReport[] {
    try {
      const stored = localStorage.getItem('errorReports');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  private queueError(errorReport: ErrorReport) {
    this.errorQueue.push(errorReport);

    // Prevent queue from growing too large
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
    }
  }

  private async flushErrorQueue() {
    if (this.errorQueue.length === 0) return;

    const errorsToSend = [...this.errorQueue];
    this.errorQueue = [];

    try {
      // In a real app, this would send to your error reporting service
      // For now, we'll just log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.group('Error Reports');
        errorsToSend.forEach(report => {
          console.error(
            `[${report.severity.toUpperCase()}] ${report.error.name}:`,
            report
          );
        });
        console.groupEnd();
      }

      // Example: Send to external service
      await this.sendToErrorService(errorsToSend);
    } catch (e) {
      // If sending fails, add errors back to queue
      this.errorQueue.unshift(...errorsToSend);
      console.warn('Failed to send error reports:', e);
    }
  }

  private async sendToErrorService(errors: ErrorReport[]): Promise<void> {
    // This would integrate with services like:
    // - Sentry: Sentry.captureException()
    // - LogRocket: LogRocket.captureException()
    // - Bugsnag: Bugsnag.notify()
    // - Custom API endpoint

    // For now, simulate API call
    return new Promise(resolve => {
      setTimeout(resolve, 100);
    });
  }

  private getUserId(): string | null {
    return localStorage.getItem('userId') || null;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  public getErrorHistory(): ErrorReport[] {
    return this.getStoredErrors();
  }

  public clearErrorHistory(): void {
    localStorage.removeItem('errorReports');
  }
}

export const errorLogger = new ErrorLogger();
```

**Implementation steps:**

1. Create hierarchical error boundary system with different levels
2. Implement comprehensive error logging with context capture
3. Build error fallback UI components with recovery actions
4. Set up offline error queueing and online synchronization
5. Add error severity classification and prioritization

**Testing:**

1. Unit tests for error boundary behavior and recovery
2. Integration tests for error propagation and handling
3. Manual error injection tests for UI validation
4. Performance tests for error handling overhead

**Commit**:
`feat(error): implement core error boundary system with logging and recovery`

### Phase 2: Route and Feature Error Boundaries (3 points)

**Files to create/modify:**

- `src/router/AppRouter.tsx` - Add route-level error boundaries
- `src/pages/ErrorPage.tsx` - Dedicated error page component
- `src/components/modes/learn/LearnErrorBoundary.tsx` - Learn mode error
  boundary
- `src/components/deck/DeckErrorBoundary.tsx` - Deck management error boundary
- `src/hooks/useAsyncErrorHandler.ts` - Hook for async error handling

**Route-Level Error Boundaries:**

```typescript
// src/router/AppRouter.tsx (enhanced)
import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ErrorPage } from '@/pages/ErrorPage';

// Lazy load pages for code splitting
const Home = lazy(() => import('@/pages/Home'));
const Deck = lazy(() => import('@/pages/Deck'));
const Flashcards = lazy(() => import('@/pages/Flashcards'));
const Learn = lazy(() => import('@/pages/Learn'));
const Results = lazy(() => import('@/pages/Results'));

export function AppRouter() {
  return (
    <ErrorBoundary
      level="app"
      fallback={ErrorPage}
      onError={(error, errorInfo) => {
        // Additional app-level error handling
        console.error('App-level error:', error, errorInfo);
      }}
    >
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={
            <ErrorBoundary level="route" resetOnPropsChange>
              <Home />
            </ErrorBoundary>
          } />

          <Route path="/deck/:deckId" element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]}>
              <Deck />
            </ErrorBoundary>
          } />

          <Route path="/deck/:deckId/results" element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]}>
              <Results />
            </ErrorBoundary>
          } />

          <Route path="/flashcards/:deckId" element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]}>
              <Flashcards />
            </ErrorBoundary>
          } />

          <Route path="/learn/:deckId" element={
            <ErrorBoundary level="route" resetKeys={[location.pathname]}>
              <Learn />
            </ErrorBoundary>
          } />

          <Route path="/error" element={<ErrorPage />} />

          {/* Catch-all route for 404 errors */}
          <Route path="*" element={
            <ErrorPage
              error={new Error('Page not found')}
              level="route"
              onRetry={() => window.location.href = '/'}
              onReload={() => window.location.href = '/'}
            />
          } />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
```

**Learn Mode Error Boundary:**

```typescript
// src/components/modes/learn/LearnErrorBoundary.tsx
import { FC, ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { LearnModeErrorFallback } from '@/components/error/ErrorFallback';
import { useDeckStore } from '@/store/deckStore';
import { useNavigate } from 'react-router-dom';

interface LearnErrorBoundaryProps {
  children: ReactNode;
  deckId: string;
}

export const LearnErrorBoundary: FC<LearnErrorBoundaryProps> = ({
  children,
  deckId,
}) => {
  const navigate = useNavigate();
  const { session, saveSessionProgress } = useDeckStore();

  const handleLearnError = (error: Error) => {
    // Save current session progress before error fallback
    if (session) {
      try {
        saveSessionProgress(session);
        console.log('Session progress saved before error recovery');
      } catch (saveError) {
        console.error('Failed to save session progress:', saveError);
      }
    }

    // Log specific learn mode context
    const context = {
      deckId,
      sessionState: session ? {
        currentCardIndex: session.currentCardIndex,
        correctCount: session.correctCount,
        incorrectCount: session.incorrectCount,
        timeElapsed: Date.now() - session.startTime,
      } : null,
    };

    console.error('Learn mode error with context:', { error, context });
  };

  const handleRetry = () => {
    // Try to restore session if it exists
    if (session && session.deckId === deckId) {
      // Session will be restored by the Learn component
      window.location.reload();
    } else {
      // Restart learn mode from beginning
      navigate(`/learn/${deckId}`, { replace: true });
    }
  };

  const handleExit = () => {
    // Return to deck page
    navigate(`/deck/${deckId}`, { replace: true });
  };

  return (
    <ErrorBoundary
      level="feature"
      fallback={(props) => (
        <LearnModeErrorFallback
          {...props}
          onRetry={handleRetry}
          onReload={handleExit}
        />
      )}
      onError={handleLearnError}
      resetKeys={[deckId, session?.currentCardIndex]}
    >
      {children}
    </ErrorBoundary>
  );
};
```

**Async Error Handler Hook:**

```typescript
// src/hooks/useAsyncErrorHandler.ts
import { useCallback, useState } from 'react';
import { errorLogger } from '@/services/errorLogger';

interface AsyncErrorState {
  error: Error | null;
  isError: boolean;
  retry: () => void;
  reset: () => void;
}

interface UseAsyncErrorHandlerOptions {
  onError?: (error: Error) => void;
  retryAttempts?: number;
  retryDelay?: number;
}

export function useAsyncErrorHandler<T extends any[], R>(
  asyncFunction: (...args: T) => Promise<R>,
  options: UseAsyncErrorHandlerOptions = {}
): [(...args: T) => Promise<R>, AsyncErrorState] {
  const { onError, retryAttempts = 3, retryDelay = 1000 } = options;

  const [error, setError] = useState<Error | null>(null);
  const [lastArgs, setLastArgs] = useState<T | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  const executeWithErrorHandling = useCallback(
    async (...args: T): Promise<R> => {
      try {
        setLastArgs(args);
        const result = await asyncFunction(...args);

        // Reset error state on success
        if (error) {
          setError(null);
          setAttemptCount(0);
        }

        return result;
      } catch (caughtError) {
        const errorInstance =
          caughtError instanceof Error
            ? caughtError
            : new Error(String(caughtError));

        // Log the error
        errorLogger.logError(errorInstance, {
          level: 'async',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          userId: localStorage.getItem('userId'),
          sessionId: sessionStorage.getItem('sessionId') || 'unknown',
          errorBoundaryLevel: 'async',
          additionalContext: {
            functionName: asyncFunction.name,
            arguments: args,
            attemptCount: attemptCount + 1,
          },
        });

        setError(errorInstance);
        setAttemptCount(prev => prev + 1);

        // Call custom error handler
        onError?.(errorInstance);

        throw errorInstance;
      }
    },
    [asyncFunction, error, attemptCount, onError]
  );

  const retry = useCallback(async () => {
    if (!lastArgs || attemptCount >= retryAttempts) {
      return;
    }

    // Delay before retry
    if (retryDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }

    return executeWithErrorHandling(...lastArgs);
  }, [
    lastArgs,
    attemptCount,
    retryAttempts,
    retryDelay,
    executeWithErrorHandling,
  ]);

  const reset = useCallback(() => {
    setError(null);
    setAttemptCount(0);
    setLastArgs(null);
  }, []);

  const asyncErrorState: AsyncErrorState = {
    error,
    isError: error !== null,
    retry,
    reset,
  };

  return [executeWithErrorHandling, asyncErrorState];
}

// Usage example:
// const [loadDeck, { error, isError, retry, reset }] = useAsyncErrorHandler(
//   deckService.loadDeck,
//   {
//     onError: (error) => console.error('Failed to load deck:', error),
//     retryAttempts: 3,
//     retryDelay: 1000,
//   }
// );
```

**Implementation steps:**

1. Add route-level error boundaries with navigation-aware reset logic
2. Create feature-specific error boundaries for major app sections
3. Implement async error handling hook with retry logic
4. Add session state preservation during error recovery
5. Create error page for app-level failures

**Testing:**

1. Route navigation error simulation and recovery testing
2. Feature-specific error boundary isolation testing
3. Async error handling and retry mechanism validation
4. Session state preservation during error recovery

**Commit**:
`feat(error): add route and feature-level error boundaries with recovery`

### Phase 3: Progress Preservation and Recovery (3 points)

**Files to create/modify:**

- `src/services/progressRecovery.ts` - Progress preservation and recovery
  service
- `src/hooks/useErrorRecovery.ts` - Hook for error recovery with progress
  restoration
- `src/store/errorStore.ts` - Zustand store for error state management
- `src/components/error/RecoveryDialog.tsx` - Progress recovery UI component

**Progress Recovery Service:**

```typescript
// src/services/progressRecovery.ts
import { SessionState, LearnSessionState } from '@/types';

interface ProgressSnapshot {
  id: string;
  timestamp: number;
  sessionType: 'learn' | 'flashcards' | 'match' | 'test';
  deckId: string;
  sessionData: SessionState | LearnSessionState;
  userActions: UserAction[];
  recoveryContext: {
    url: string;
    errorType: string;
    errorMessage: string;
  };
}

interface UserAction {
  timestamp: number;
  type: 'answer' | 'navigation' | 'settings_change';
  data: any;
}

class ProgressRecoveryService {
  private readonly STORAGE_KEY = 'progress_snapshots';
  private readonly MAX_SNAPSHOTS = 10;
  private readonly SNAPSHOT_INTERVAL = 30000; // 30 seconds

  private snapshotTimer: NodeJS.Timeout | null = null;
  private userActions: UserAction[] = [];

  public startTracking(sessionType: string, deckId: string) {
    this.userActions = [];
    this.startPeriodicSnapshots(sessionType, deckId);
  }

  public stopTracking() {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = null;
    }
    this.userActions = [];
  }

  public recordUserAction(type: UserAction['type'], data: any) {
    this.userActions.push({
      timestamp: Date.now(),
      type,
      data,
    });

    // Keep only recent actions (last 50)
    if (this.userActions.length > 50) {
      this.userActions = this.userActions.slice(-50);
    }
  }

  public createSnapshot(
    sessionType: string,
    deckId: string,
    sessionData: SessionState | LearnSessionState,
    errorType?: string,
    errorMessage?: string
  ): string {
    const snapshot: ProgressSnapshot = {
      id: this.generateSnapshotId(),
      timestamp: Date.now(),
      sessionType: sessionType as any,
      deckId,
      sessionData: this.deepClone(sessionData),
      userActions: [...this.userActions],
      recoveryContext: {
        url: window.location.href,
        errorType: errorType || 'manual',
        errorMessage: errorMessage || 'Manual snapshot',
      },
    };

    this.saveSnapshot(snapshot);
    return snapshot.id;
  }

  public getRecoverySnapshots(deckId?: string): ProgressSnapshot[] {
    const snapshots = this.getAllSnapshots();

    if (deckId) {
      return snapshots.filter(s => s.deckId === deckId);
    }

    return snapshots;
  }

  public recoverFromSnapshot(snapshotId: string): ProgressSnapshot | null {
    const snapshots = this.getAllSnapshots();
    const snapshot = snapshots.find(s => s.id === snapshotId);

    if (!snapshot) {
      return null;
    }

    // Mark snapshot as used
    this.markSnapshotAsUsed(snapshotId);

    return snapshot;
  }

  public hasRecoverableProgress(deckId: string): boolean {
    const snapshots = this.getRecoverySnapshots(deckId);
    const recentSnapshots = snapshots.filter(
      s => Date.now() - s.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    return recentSnapshots.length > 0;
  }

  public getLatestSnapshot(deckId: string): ProgressSnapshot | null {
    const snapshots = this.getRecoverySnapshots(deckId);

    if (snapshots.length === 0) {
      return null;
    }

    // Sort by timestamp and return the most recent
    return snapshots.sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  public cleanupOldSnapshots() {
    const snapshots = this.getAllSnapshots();
    const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago

    const recentSnapshots = snapshots
      .filter(s => s.timestamp > cutoffTime)
      .slice(0, this.MAX_SNAPSHOTS);

    this.saveAllSnapshots(recentSnapshots);
  }

  private startPeriodicSnapshots(sessionType: string, deckId: string) {
    this.snapshotTimer = setInterval(() => {
      const sessionStore = this.getCurrentSessionData();
      if (sessionStore) {
        this.createSnapshot(sessionType, deckId, sessionStore);
      }
    }, this.SNAPSHOT_INTERVAL);
  }

  private getCurrentSessionData(): SessionState | LearnSessionState | null {
    // Get current session data from store
    try {
      const storeData = localStorage.getItem('deck-store');
      if (storeData) {
        const parsed = JSON.parse(storeData);
        return parsed.state?.session || null;
      }
    } catch (e) {
      console.warn('Failed to get current session data:', e);
    }
    return null;
  }

  private generateSnapshotId(): string {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  private getAllSnapshots(): ProgressSnapshot[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn('Failed to load progress snapshots:', e);
      return [];
    }
  }

  private saveSnapshot(snapshot: ProgressSnapshot) {
    const snapshots = this.getAllSnapshots();
    snapshots.push(snapshot);

    // Keep only recent snapshots
    const recentSnapshots = snapshots
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, this.MAX_SNAPSHOTS);

    this.saveAllSnapshots(recentSnapshots);
  }

  private saveAllSnapshots(snapshots: ProgressSnapshot[]) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(snapshots));
    } catch (e) {
      console.warn('Failed to save progress snapshots:', e);
    }
  }

  private markSnapshotAsUsed(snapshotId: string) {
    const snapshots = this.getAllSnapshots();
    const filteredSnapshots = snapshots.filter(s => s.id !== snapshotId);
    this.saveAllSnapshots(filteredSnapshots);
  }
}

export const progressRecovery = new ProgressRecoveryService();
```

**Recovery Dialog Component:**

```typescript
// src/components/error/RecoveryDialog.tsx
import { FC, useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { progressRecovery } from '@/services/progressRecovery';
import { formatDistanceToNow } from 'date-fns';
import styles from './RecoveryDialog.module.css';

interface RecoveryDialogProps {
  isOpen: boolean;
  deckId: string;
  onRecover: (snapshotId: string) => void;
  onStartFresh: () => void;
  onClose: () => void;
}

export const RecoveryDialog: FC<RecoveryDialogProps> = ({
  isOpen,
  deckId,
  onRecover,
  onStartFresh,
  onClose,
}) => {
  const [snapshots, setSnapshots] = useState<ReturnType<typeof progressRecovery.getRecoverySnapshots>>([]);

  useEffect(() => {
    if (isOpen) {
      const recoverySnapshots = progressRecovery.getRecoverySnapshots(deckId);
      setSnapshots(recoverySnapshots);
    }
  }, [isOpen, deckId]);

  const getSessionDescription = (snapshot: typeof snapshots[0]) => {
    const sessionData = snapshot.sessionData as any;

    if (snapshot.sessionType === 'learn') {
      const correct = sessionData.correctCount || 0;
      const incorrect = sessionData.incorrectCount || 0;
      const total = correct + incorrect;
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

      return `Learn session: ${correct}/${total} correct (${accuracy}% accuracy)`;
    }

    if (snapshot.sessionType === 'flashcards') {
      const current = sessionData.currentCardIndex || 0;
      const total = sessionData.totalCards || 0;

      return `Flashcards: Card ${current + 1} of ${total}`;
    }

    return `${snapshot.sessionType} session in progress`;
  };

  const formatSnapshotAge = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  if (snapshots.length === 0) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="No Recovery Available">
        <div className={styles.noRecoveryContent}>
          <p>No previous progress found for this deck.</p>
          <Button variant="primary" onClick={onStartFresh}>
            Start Fresh
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Recover Previous Progress"
      size="medium"
    >
      <div className={styles.recoveryContent}>
        <p className={styles.description}>
          We found previous progress for this deck. Would you like to continue where you left off?
        </p>

        <div className={styles.snapshotList}>
          {snapshots.map((snapshot) => (
            <Card key={snapshot.id} className={styles.snapshotCard}>
              <div className={styles.snapshotInfo}>
                <h4 className={styles.snapshotTitle}>
                  {getSessionDescription(snapshot)}
                </h4>
                <p className={styles.snapshotTime}>
                  {formatSnapshotAge(snapshot.timestamp)}
                </p>
                {snapshot.recoveryContext.errorType !== 'manual' && (
                  <p className={styles.errorContext}>
                    Recovered from: {snapshot.recoveryContext.errorMessage}
                  </p>
                )}
              </div>
              <Button
                variant="primary"
                size="small"
                onClick={() => onRecover(snapshot.id)}
              >
                Resume
              </Button>
            </Card>
          ))}
        </div>

        <div className={styles.actionButtons}>
          <Button variant="secondary" onClick={onStartFresh}>
            Start Fresh Session
          </Button>
          <Button variant="tertiary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
```

**Implementation steps:**

1. Create progress snapshot system with automatic periodic saves
2. Implement user action tracking for replay capability
3. Build recovery dialog UI for progress restoration options
4. Add session state restoration logic in main components
5. Create cleanup mechanisms for old recovery data

**Testing:**

1. Progress preservation testing during various error scenarios
2. Recovery dialog functionality and user experience testing
3. Session restoration accuracy and completeness validation
4. Storage cleanup and data retention testing

**Commit**: `feat(error): implement progress preservation and recovery system`

### Phase 4: User Communication and Monitoring (3 points)

**Files to create/modify:**

- `src/components/error/ErrorNotification.tsx` - Toast notifications for errors
- `src/components/error/ErrorReportDialog.tsx` - User error reporting interface
- `src/services/userFeedback.ts` - User feedback collection service
- `src/hooks/useErrorNotification.ts` - Hook for error notifications
- `src/components/admin/ErrorDashboard.tsx` - Error monitoring dashboard (dev)

**Error Notification System:**

```typescript
// src/components/error/ErrorNotification.tsx
import { FC, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ErrorNotification.module.css';

interface ErrorNotification {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary' | 'tertiary';
  }>;
  dismissible?: boolean;
}

interface ErrorNotificationProps {
  notification: ErrorNotification;
  onDismiss: (id: string) => void;
}

const NotificationItem: FC<ErrorNotificationProps> = ({ notification, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss(notification.id), 300); // Wait for exit animation
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.duration, notification.id, onDismiss]);

  const getIcon = () => {
    switch (notification.type) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(notification.id), 300);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className={styles.notificationWrapper}
        >
          <Card className={`${styles.notification} ${styles[notification.type]}`}>
            <div className={styles.notificationContent}>
              <div className={styles.notificationHeader}>
                <span className={styles.icon} role="img" aria-label={notification.type}>
                  {getIcon()}
                </span>
                <h4 className={styles.title}>{notification.title}</h4>
                {notification.dismissible !== false && (
                  <Button
                    variant="tertiary"
                    size="small"
                    onClick={handleDismiss}
                    className={styles.dismissButton}
                    aria-label="Dismiss notification"
                  >
                    ✕
                  </Button>
                )}
              </div>

              <p className={styles.message}>{notification.message}</p>

              {notification.actions && notification.actions.length > 0 && (
                <div className={styles.actions}>
                  {notification.actions.map((action, index) => (
                    <Button
                      key={index}
                      variant={action.variant || 'secondary'}
                      size="small"
                      onClick={() => {
                        action.action();
                        handleDismiss();
                      }}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface ErrorNotificationContainerProps {
  notifications: ErrorNotification[];
  onDismiss: (id: string) => void;
}

export const ErrorNotificationContainer: FC<ErrorNotificationContainerProps> = ({
  notifications,
  onDismiss,
}) => {
  const portalRoot = document.getElementById('notification-portal') || document.body;

  return createPortal(
    <div className={styles.notificationContainer}>
      <AnimatePresence>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onDismiss={onDismiss}
          />
        ))}
      </AnimatePresence>
    </div>,
    portalRoot
  );
};

// Hook for managing notifications
export function useErrorNotifications() {
  const [notifications, setNotifications] = useState<ErrorNotification[]>();

  const addNotification = (notification: Omit<ErrorNotification, 'id'>) => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    setNotifications(prev => [
      ...prev,
      { ...notification, id }
    ]);

    return id;
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Helper methods for common notification types
  const notifyError = (title: string, message: string, options?: Partial<ErrorNotification>) => {
    return addNotification({
      type: 'error',
      title,
      message,
      duration: 8000, // Longer duration for errors
      dismissible: true,
      ...options,
    });
  };

  const notifyWarning = (title: string, message: string, options?: Partial<ErrorNotification>) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      duration: 6000,
      dismissible: true,
      ...options,
    });
  };

  const notifyInfo = (title: string, message: string, options?: Partial<ErrorNotification>) => {
    return addNotification({
      type: 'info',
      title,
      message,
      duration: 4000,
      dismissible: true,
      ...options,
    });
  };

  const notifyRecoveryAvailable = (deckName: string, onRecover: () => void) => {
    return addNotification({
      type: 'info',
      title: 'Previous Progress Found',
      message: `We found previous progress for "${deckName}". Would you like to continue where you left off?`,
      duration: 0, // Don't auto-dismiss
      actions: [
        {
          label: 'Recover',
          action: onRecover,
          variant: 'primary',
        },
        {
          label: 'Start Fresh',
          action: () => {}, // Will dismiss automatically
          variant: 'secondary',
        },
      ],
    });
  };

  return {
    notifications,
    addNotification,
    dismissNotification,
    clearAllNotifications,
    notifyError,
    notifyWarning,
    notifyInfo,
    notifyRecoveryAvailable,
  };
}
```

**User Feedback Service:**

```typescript
// src/services/userFeedback.ts
interface UserFeedbackReport {
  id: string;
  timestamp: number;
  errorId?: string;
  type: 'bug_report' | 'feature_request' | 'general_feedback';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  reproductionSteps?: string[];
  expectedBehavior?: string;
  actualBehavior?: string;
  userContext: {
    userId?: string;
    sessionId: string;
    userAgent: string;
    url: string;
    timestamp: string;
    appVersion: string;
  };
  attachments: {
    screenshot?: string; // Base64 encoded
    errorLogs?: string[];
    sessionReplay?: any; // Future: session replay data
  };
  contact?: {
    email?: string;
    allowFollowup: boolean;
  };
}

class UserFeedbackService {
  private readonly STORAGE_KEY = 'user_feedback_reports';

  public async submitFeedback(
    feedback: Omit<UserFeedbackReport, 'id' | 'timestamp' | 'userContext'>
  ): Promise<string> {
    const report: UserFeedbackReport = {
      ...feedback,
      id: this.generateReportId(),
      timestamp: Date.now(),
      userContext: this.getUserContext(),
    };

    // Store locally first
    this.storeFeedbackLocally(report);

    // Attempt to submit to backend
    try {
      await this.submitToBackend(report);
      console.log('Feedback submitted successfully:', report.id);
    } catch (error) {
      console.warn(
        'Failed to submit feedback to backend, stored locally:',
        error
      );
    }

    return report.id;
  }

  public async submitErrorFeedback(
    errorId: string,
    userDescription: string,
    severity: UserFeedbackReport['severity'],
    contact?: UserFeedbackReport['contact']
  ): Promise<string> {
    return this.submitFeedback({
      errorId,
      type: 'bug_report',
      severity,
      title: `Error Report: ${errorId}`,
      description: userDescription,
      contact,
      attachments: {
        errorLogs: this.getRecentErrorLogs(),
      },
    });
  }

  public async captureScreenshot(): Promise<string | null> {
    try {
      if ('html2canvas' in window) {
        // If html2canvas is loaded
        const canvas = await (window as any).html2canvas(document.body, {
          height: window.innerHeight,
          width: window.innerWidth,
          useCORS: true,
        });
        return canvas.toDataURL('image/png');
      }
    } catch (error) {
      console.warn('Failed to capture screenshot:', error);
    }
    return null;
  }

  public getStoredFeedback(): UserFeedbackReport[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to load stored feedback:', error);
      return [];
    }
  }

  public clearStoredFeedback(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  private generateReportId(): string {
    return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getUserContext(): UserFeedbackReport['userContext'] {
    return {
      userId: localStorage.getItem('userId') || undefined,
      sessionId: sessionStorage.getItem('sessionId') || 'unknown',
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      appVersion: import.meta.env.VITE_APP_VERSION || 'unknown',
    };
  }

  private getRecentErrorLogs(): string[] {
    try {
      const errorReports = localStorage.getItem('errorReports');
      if (errorReports) {
        const reports = JSON.parse(errorReports);
        return reports
          .slice(-5)
          .map(
            (report: any) => `${report.error.name}: ${report.error.message}`
          );
      }
    } catch (error) {
      console.warn('Failed to get recent error logs:', error);
    }
    return [];
  }

  private storeFeedbackLocally(report: UserFeedbackReport): void {
    try {
      const existingReports = this.getStoredFeedback();
      existingReports.push(report);

      // Keep only the most recent 20 reports
      const recentReports = existingReports.slice(-20);

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recentReports));
    } catch (error) {
      console.warn('Failed to store feedback locally:', error);
    }
  }

  private async submitToBackend(report: UserFeedbackReport): Promise<void> {
    // In a real application, this would submit to your feedback API
    // For now, we'll simulate the API call

    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(report),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit feedback: ${response.statusText}`);
    }
  }
}

export const userFeedbackService = new UserFeedbackService();
```

**Implementation steps:**

1. Create toast notification system for error communication
2. Build user feedback collection interface with screenshots
3. Implement error monitoring dashboard for development
4. Add user-friendly error messages and recovery instructions
5. Create feedback analytics and reporting system

**Testing:**

1. Notification system functionality and accessibility testing
2. User feedback collection workflow validation
3. Error message clarity and user comprehension testing
4. Cross-browser notification compatibility testing

**Commit**: `feat(error): add user communication and feedback collection system`

## Testing Strategy

### Unit Tests

- Test files: `__tests__/error/**/*.test.tsx`
- Key scenarios:
  - Error boundary catching and recovery behavior
  - Error logging and context capture accuracy
  - Progress preservation during various error types
  - User notification display and interaction

### Component Tests

```typescript
describe('ErrorBoundary', () => {
  it('should catch errors and display fallback UI', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <ErrorBoundary level="component">
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('should reset when reset keys change', () => {
    const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) throw new Error('Test error');
      return <div>Success</div>;
    };

    const { rerender } = render(
      <ErrorBoundary level="component" resetKeys={['key1']}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    rerender(
      <ErrorBoundary level="component" resetKeys={['key2']}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Success')).toBeInTheDocument();
  });
});
```

### Integration Tests

- Complete error recovery flows: Error → Recovery → Session restoration
- Cross-component error propagation and isolation
- Progress preservation across different error scenarios
- User feedback submission and notification workflows

### E2E Tests (Playwright)

- Simulated network failures and error recovery
- Page refresh during errors with progress restoration
- Cross-browser error handling consistency
- Mobile error handling and notification display

## Platform-Specific Considerations

### Web Desktop

- Keyboard navigation in error dialogs and recovery interfaces
- Copy error details functionality for support requests
- Window focus management during error states
- Multiple tab error state synchronization

### Web Mobile

- Touch-friendly error notification dismissal
- Mobile-optimized error dialog layouts
- Network connectivity error handling
- Mobile browser crash recovery

### PWA Features

- Offline error handling and queuing
- Service worker error reporting
- Cache corruption recovery mechanisms
- Installation error handling

## Documentation Updates Required

1. `README.md` - Add error handling and recovery documentation
2. `docs/error-handling.md` - Comprehensive error handling guide
3. `docs/user-feedback.md` - User feedback and support documentation
4. In-code documentation: JSDoc comments for all error handling utilities

## Success Criteria

1. **Error Prevention**: Zero app crashes, graceful degradation for all error
   types
2. **Recovery Success Rate**: >95% successful recovery from recoverable errors
3. **Progress Preservation**: 100% session state preservation during errors
4. **User Communication**: Clear, actionable error messages with <5 second
   response time
5. **Feedback Collection**: >80% user feedback completion rate when prompted
6. **Performance Impact**: <1ms overhead per component for error handling
7. **Developer Experience**: Complete error logs with sufficient debugging
   context

## Dependencies

- **React Error Boundaries**: React 16.8+ (already available)
- **Screenshot Capture**: html2canvas (new dependency - optional)
- **Date Formatting**: date-fns (already used in project)
- **Error Reporting**: Integration with Sentry/LogRocket (future enhancement)

## Risks & Mitigations

1. **Risk**: Error boundaries themselves could crash **Mitigation**:
   Comprehensive testing, fallback error handling, nested boundary strategy
2. **Risk**: Progress preservation could fail during storage errors
   **Mitigation**: Multiple storage strategies, graceful degradation, user
   notification
3. **Risk**: Error logging could impact app performance **Mitigation**:
   Asynchronous logging, batching, size limits, cleanup mechanisms
4. **Risk**: User feedback collection could become overwhelming **Mitigation**:
   Smart feedback prompting, rate limiting, user preference controls

## Accessibility Requirements

- Error messages must be announced by screen readers
- Error dialogs must trap focus and support keyboard navigation
- High contrast support for error states and notifications
- Reduced motion support for error animations and transitions

## Performance Metrics

### Target Performance Standards

- **Error Detection Time**: <10ms from error occurrence to boundary catch
- **Recovery Time**: <2 seconds from error to recovery UI display
- **Progress Restoration**: <1 second to restore saved session state
- **Notification Display**: <500ms from trigger to notification appearance
- **Memory Usage**: <5MB additional memory for error handling infrastructure

### Monitoring and Alerting

- Error rate monitoring with alerts for spikes
- Recovery success rate tracking
- User feedback sentiment analysis
- Performance impact monitoring for error handling overhead

## Release & Deployment Guide

### Testing Checklist

- [ ] Error boundaries catch all error types correctly
- [ ] Progress preservation works across all session types
- [ ] User notifications display properly on all devices
- [ ] Recovery mechanisms restore session state accurately
- [ ] Feedback collection works without blocking the UI
- [ ] Performance overhead stays within acceptable limits
- [ ] Accessibility requirements met for all error states

### Rollout Strategy

1. **Phase 1**: Core error boundaries with basic recovery
2. **Phase 2**: Progress preservation and restoration
3. **Phase 3**: User notifications and feedback collection
4. **Phase 4**: Advanced monitoring and analytics

### Rollback Strategy

- Error boundaries can be disabled via feature flags
- Progress preservation can revert to basic session storage
- User notifications can be suppressed during issues
- Feedback collection can be temporarily disabled
