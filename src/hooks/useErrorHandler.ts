import { useCallback, useState } from 'react';
import { errorLogger } from '@/services/errorLogger';

interface AsyncErrorState {
  error: Error | null;
  isError: boolean;
  retry: () => void;
  reset: () => void;
}

interface UseErrorHandlerOptions {
  onError?: (error: Error) => void;
  retryAttempts?: number;
  retryDelay?: number;
}

export function useErrorHandler<T extends any[], R>(
  asyncFunction: (...args: T) => Promise<R>,
  options: UseErrorHandlerOptions = {}
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
          caughtError instanceof Error ? caughtError : new Error(String(caughtError));

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
    if (!lastArgs || attemptCount > retryAttempts) {
      return;
    }

    // Delay before retry
    if (retryDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }

    return executeWithErrorHandling(...lastArgs);
  }, [lastArgs, attemptCount, retryAttempts, retryDelay, executeWithErrorHandling]);

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

// Additional hook for simple error boundaries within components
export function useErrorBoundary() {
  const [error, setError] = useState<Error | null>(null);

  const captureError = useCallback((error: Error, errorInfo?: any) => {
    // Log the error
    errorLogger.logError(error, {
      level: 'component',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: localStorage.getItem('userId'),
      sessionId: sessionStorage.getItem('sessionId') || 'unknown',
      errorBoundaryLevel: 'component',
      additionalContext: errorInfo,
    });

    setError(error);
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // If there's an error, throw it to be caught by nearest error boundary
  if (error) {
    throw error;
  }

  return {
    captureError,
    resetError,
    hasError: error !== null,
  };
}

// Hook for reporting user feedback on errors
export function useErrorReporting() {
  const reportError = useCallback(
    async (
      error: Error,
      userFeedback?: string,
      severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
    ) => {
      const errorId = errorLogger.logError(error, {
        level: 'user_reported',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: localStorage.getItem('userId'),
        sessionId: sessionStorage.getItem('sessionId') || 'unknown',
        errorBoundaryLevel: 'user_reported',
        additionalContext: {
          userFeedback,
          severity,
          reportedManually: true,
        },
      });

      return errorId;
    },
    []
  );

  const getErrorHistory = useCallback(() => {
    return errorLogger.getErrorHistory();
  }, []);

  const clearErrorHistory = useCallback(() => {
    errorLogger.clearErrorHistory();
  }, []);

  return {
    reportError,
    getErrorHistory,
    clearErrorHistory,
  };
}
