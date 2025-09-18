import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useErrorHandler, useErrorBoundary, useErrorReporting } from '@/hooks/useErrorHandler';
import { errorLogger } from '@/services/errorLogger';

// Mock the error logger
vi.mock('@/services/errorLogger', () => ({
  errorLogger: {
    logError: vi.fn(),
    getErrorHistory: vi.fn(),
    clearErrorHistory: vi.fn(),
  },
}));

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage and sessionStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
      },
      writable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn(() => 'test-session'),
        setItem: vi.fn(),
      },
      writable: true,
    });
  });

  describe('useErrorHandler hook', () => {
    it('should execute async function successfully', async () => {
      const mockAsyncFunction = vi.fn().mockResolvedValue('success');
      const { result } = renderHook(() => useErrorHandler(mockAsyncFunction));

      const [wrappedFunction, errorState] = result.current;

      let executionResult;
      await act(async () => {
        executionResult = await wrappedFunction('test', 'args');
      });

      expect(executionResult).toBe('success');
      expect(errorState.isError).toBe(false);
      expect(errorState.error).toBe(null);
      expect(mockAsyncFunction).toHaveBeenCalledWith('test', 'args');
    });

    it('should catch and handle async function errors', async () => {
      const testError = new Error('Async error');
      const mockAsyncFunction = vi.fn().mockRejectedValue(testError);
      const mockLogError = vi.mocked(errorLogger.logError);

      const { result } = renderHook(() => useErrorHandler(mockAsyncFunction));

      const [wrappedFunction, errorState] = result.current;

      await act(async () => {
        try {
          await wrappedFunction('test', 'args');
        } catch (error) {
          // Expected to throw
        }
      });

      expect(errorState.isError).toBe(true);
      expect(errorState.error).toBe(testError);
      expect(mockLogError).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          level: 'async',
          errorBoundaryLevel: 'async',
          additionalContext: expect.objectContaining({
            functionName: mockAsyncFunction.name,
            arguments: ['test', 'args'],
            attemptCount: 1,
          }),
        })
      );
    });

    it('should call onError callback when error occurs', async () => {
      const testError = new Error('Async error');
      const mockAsyncFunction = vi.fn().mockRejectedValue(testError);
      const onErrorSpy = vi.fn();

      const { result } = renderHook(() =>
        useErrorHandler(mockAsyncFunction, { onError: onErrorSpy })
      );

      const [wrappedFunction] = result.current;

      await act(async () => {
        try {
          await wrappedFunction('test');
        } catch (error) {
          // Expected to throw
        }
      });

      expect(onErrorSpy).toHaveBeenCalledWith(testError);
    });

    it('should handle retry mechanism', async () => {
      const testError = new Error('Async error');
      const mockAsyncFunction = vi
        .fn()
        .mockRejectedValueOnce(testError)
        .mockResolvedValue('success');

      const { result } = renderHook(() => useErrorHandler(mockAsyncFunction, { retryDelay: 0 }));

      const [wrappedFunction, errorState] = result.current;

      // Initial call fails
      await act(async () => {
        try {
          await wrappedFunction('test');
        } catch (error) {
          // Expected to throw
        }
      });

      expect(errorState.isError).toBe(true);

      // Retry succeeds
      let retryResult;
      await act(async () => {
        retryResult = await errorState.retry();
      });

      expect(retryResult).toBe('success');
    });

    it('should reset error state', async () => {
      const testError = new Error('Async error');
      const mockAsyncFunction = vi.fn().mockRejectedValue(testError);

      const { result } = renderHook(() => useErrorHandler(mockAsyncFunction));

      const [wrappedFunction, errorState] = result.current;

      // Generate error
      await act(async () => {
        try {
          await wrappedFunction('test');
        } catch (error) {
          // Expected to throw
        }
      });

      expect(errorState.isError).toBe(true);

      // Reset error
      act(() => {
        errorState.reset();
      });

      expect(result.current[1].isError).toBe(false);
      expect(result.current[1].error).toBe(null);
    });

    it('should limit retry attempts', async () => {
      const testError = new Error('Async error');
      const mockAsyncFunction = vi.fn().mockRejectedValue(testError);

      const { result } = renderHook(() =>
        useErrorHandler(mockAsyncFunction, { retryAttempts: 2, retryDelay: 0 })
      );

      const [wrappedFunction, errorState] = result.current;

      // Initial call fails
      await act(async () => {
        try {
          await wrappedFunction('test');
        } catch (error) {
          // Expected to throw
        }
      });

      // First retry
      await act(async () => {
        try {
          await errorState.retry();
        } catch (error) {
          // Expected to throw
        }
      });

      // Second retry
      await act(async () => {
        try {
          await errorState.retry();
        } catch (error) {
          // Expected to throw
        }
      });

      // Third retry should not execute (exceeded limit)
      await act(async () => {
        const retryResult = await errorState.retry();
        expect(retryResult).toBeUndefined();
      });

      expect(mockAsyncFunction).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should convert non-Error objects to Error instances', async () => {
      const stringError = 'String error';
      const mockAsyncFunction = vi.fn().mockRejectedValue(stringError);
      const mockLogError = vi.mocked(errorLogger.logError);

      const { result } = renderHook(() => useErrorHandler(mockAsyncFunction));

      const [wrappedFunction, errorState] = result.current;

      await act(async () => {
        try {
          await wrappedFunction('test');
        } catch (error) {
          // Expected to throw
        }
      });

      expect(errorState.error).toBeInstanceOf(Error);
      expect(errorState.error?.message).toBe('String error');
      expect(mockLogError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
    });
  });

  describe('useErrorBoundary hook', () => {
    it('should provide error capture and reset functions', () => {
      const { result } = renderHook(() => useErrorBoundary());

      const { captureError, resetError, hasError } = result.current;

      expect(typeof captureError).toBe('function');
      expect(typeof resetError).toBe('function');
      expect(hasError).toBe(false);
    });

    it('should throw error when captureError is called', () => {
      const { result } = renderHook(() => useErrorBoundary());

      const testError = new Error('Test error');

      expect(() => {
        act(() => {
          result.current.captureError(testError);
        });
      }).toThrow('Test error');
    });

    it('should log error when capturing', () => {
      const mockLogError = vi.mocked(errorLogger.logError);
      const { result } = renderHook(() => useErrorBoundary());

      const testError = new Error('Test error');
      const errorInfo = { componentStack: 'test stack' };

      try {
        act(() => {
          result.current.captureError(testError, errorInfo);
        });
      } catch (e) {
        // Expected to throw
      }

      expect(mockLogError).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          level: 'component',
          errorBoundaryLevel: 'component',
          additionalContext: errorInfo,
        })
      );
    });
  });

  describe('useErrorReporting hook', () => {
    it('should provide error reporting functions', () => {
      const { result } = renderHook(() => useErrorReporting());

      const { reportError, getErrorHistory, clearErrorHistory } = result.current;

      expect(typeof reportError).toBe('function');
      expect(typeof getErrorHistory).toBe('function');
      expect(typeof clearErrorHistory).toBe('function');
    });

    it('should report error with user feedback', async () => {
      const mockLogError = vi.mocked(errorLogger.logError);
      mockLogError.mockReturnValue('error-id-123');

      const { result } = renderHook(() => useErrorReporting());

      const testError = new Error('User reported error');
      const userFeedback = 'This error happened when I clicked the button';

      let errorId;
      await act(async () => {
        errorId = await result.current.reportError(testError, userFeedback, 'high');
      });

      expect(errorId).toBe('error-id-123');
      expect(mockLogError).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          level: 'user_reported',
          errorBoundaryLevel: 'user_reported',
          additionalContext: expect.objectContaining({
            userFeedback,
            severity: 'high',
            reportedManually: true,
          }),
        })
      );
    });

    it('should get error history', () => {
      const mockHistory = [
        { id: 'error1', error: { message: 'Error 1' } },
        { id: 'error2', error: { message: 'Error 2' } },
      ];
      const mockGetErrorHistory = vi.mocked(errorLogger.getErrorHistory);
      mockGetErrorHistory.mockReturnValue(mockHistory as any);

      const { result } = renderHook(() => useErrorReporting());

      const history = result.current.getErrorHistory();

      expect(history).toBe(mockHistory);
      expect(mockGetErrorHistory).toHaveBeenCalled();
    });

    it('should clear error history', () => {
      const mockClearErrorHistory = vi.mocked(errorLogger.clearErrorHistory);

      const { result } = renderHook(() => useErrorReporting());

      result.current.clearErrorHistory();

      expect(mockClearErrorHistory).toHaveBeenCalled();
    });
  });
});
