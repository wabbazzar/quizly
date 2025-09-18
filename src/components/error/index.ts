// Export all error handling components and types
export { ErrorBoundary } from './ErrorBoundary';
export { ChunkLoadErrorBoundary } from './ChunkLoadErrorBoundary';
export {
  ErrorFallback,
  LearnModeErrorFallback,
  DeckErrorFallback,
  type ErrorFallbackProps,
} from './ErrorFallback';

// Re-export error handling hooks
export { useErrorHandler, useErrorBoundary, useErrorReporting } from '@/hooks/useErrorHandler';

// Re-export error logger
export { errorLogger } from '@/services/errorLogger';
