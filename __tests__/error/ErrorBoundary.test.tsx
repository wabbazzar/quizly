import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { errorLogger } from '@/services/errorLogger';

// Mock the error logger
vi.mock('@/services/errorLogger', () => ({
  errorLogger: {
    logError: vi.fn(),
  },
}));

// Component that throws an error
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Success</div>;
};

// Component that conditionally throws based on props
const ConditionalError = ({ errorMessage }: { errorMessage?: string }) => {
  if (errorMessage) {
    throw new Error(errorMessage);
  }
  return <div data-testid="success">No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.error to avoid test output pollution
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn(() => 'test-session-id'),
        setItem: vi.fn(),
      },
      writable: true,
    });
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Error catching behavior', () => {
    it('should catch errors and display fallback UI', () => {
      render(
        <ErrorBoundary level="component">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/component failed to load/i)).toBeInTheDocument();
    });

    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary level="component">
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });

    it('should log errors with proper context', () => {
      const mockLogError = vi.mocked(errorLogger.logError);

      render(
        <ErrorBoundary level="component">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(mockLogError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          level: 'component',
          errorBoundaryLevel: 'component',
          timestamp: expect.any(String),
          userAgent: expect.any(String),
          url: expect.any(String),
          sessionId: 'test-session-id',
          componentStack: expect.any(String),
        })
      );
    });

    it('should call onError callback when provided', () => {
      const onErrorSpy = vi.fn();

      render(
        <ErrorBoundary level="component" onError={onErrorSpy}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(onErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });
  });

  describe('Different error boundary levels', () => {
    it('should display app-level error message for app level', () => {
      render(
        <ErrorBoundary level="app">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/application encountered an unexpected error/i)).toBeInTheDocument();
      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
      expect(screen.getByText('Go Home')).toBeInTheDocument();
    });

    it('should display route-level error message for route level', () => {
      render(
        <ErrorBoundary level="route">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/page failed to load properly/i)).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
      expect(screen.getByText('Go Back')).toBeInTheDocument();
    });

    it('should display feature-level error message for feature level', () => {
      render(
        <ErrorBoundary level="feature">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/feature is temporarily unavailable/i)).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
    });

    it('should display component-level error message for component level', () => {
      render(
        <ErrorBoundary level="component">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/component failed to load/i)).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  describe('Error boundary reset behavior', () => {
    it('should reset when reset keys change', () => {
      const { rerender } = render(
        <ErrorBoundary level="component" resetKeys={['key1']}>
          <ConditionalError errorMessage="Initial error" />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      rerender(
        <ErrorBoundary level="component" resetKeys={['key2']}>
          <ConditionalError />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('success')).toBeInTheDocument();
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });

    it('should reset on props change when resetOnPropsChange is true', () => {
      const { rerender } = render(
        <ErrorBoundary level="component" resetOnPropsChange>
          <ConditionalError errorMessage="Initial error" />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      rerender(
        <ErrorBoundary level="component" resetOnPropsChange>
          <ConditionalError />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('success')).toBeInTheDocument();
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });

    it('should not reset on props change when resetOnPropsChange is false', () => {
      const { rerender } = render(
        <ErrorBoundary level="component">
          <ConditionalError errorMessage="Initial error" />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      rerender(
        <ErrorBoundary level="component">
          <ConditionalError />
        </ErrorBoundary>
      );

      // Should still show error
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.queryByTestId('success')).not.toBeInTheDocument();
    });
  });

  describe('User interaction', () => {
    it('should reset error boundary when retry button is clicked', () => {
      let hasError = true;
      const TestComponent = () => {
        if (hasError) {
          throw new Error('Test error');
        }
        return <div data-testid="success">No error</div>;
      };

      const { rerender } = render(
        <ErrorBoundary level="component">
          <TestComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      const retryButton = screen.getByText('Try Again');

      // Simulate fixing the error before retry
      hasError = false;

      fireEvent.click(retryButton);

      // Force rerender after error reset
      rerender(
        <ErrorBoundary level="component">
          <TestComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('success')).toBeInTheDocument();
    });

    it('should reload page when reload button is clicked for app level', () => {
      // Mock window.location.reload
      const reloadSpy = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadSpy },
        writable: true,
      });

      render(
        <ErrorBoundary level="app">
          <ThrowError />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByText('Refresh Page');
      fireEvent.click(reloadButton);

      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  describe('Custom fallback component', () => {
    const CustomFallback = ({ error, onRetry }: any) => (
      <div>
        <h1>Custom Error</h1>
        <p>{error.message}</p>
        <button onClick={onRetry}>Custom Retry</button>
      </div>
    );

    it('should render custom fallback component when provided', () => {
      render(
        <ErrorBoundary level="component" fallback={CustomFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom Error')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
      expect(screen.getByText('Custom Retry')).toBeInTheDocument();
    });
  });

  describe('Development mode features', () => {
    it('should show error details in development mode', () => {
      // Mock import.meta.env.DEV
      vi.stubEnv('DEV', true);

      render(
        <ErrorBoundary level="component">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error Details (Development Only)')).toBeInTheDocument();
    });

    it('should not show error details in production mode', () => {
      // Mock import.meta.env.DEV
      vi.stubEnv('DEV', false);

      render(
        <ErrorBoundary level="component">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Error Details (Development Only)')).not.toBeInTheDocument();
    });
  });

  describe('Session ID generation', () => {
    it('should create session ID if one does not exist', () => {
      const sessionStorage = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
      };

      Object.defineProperty(window, 'sessionStorage', {
        value: sessionStorage,
        writable: true,
      });

      render(
        <ErrorBoundary level="component">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        'sessionId',
        expect.stringMatching(/^session_\d+_[a-z0-9]+$/)
      );
    });
  });
});
