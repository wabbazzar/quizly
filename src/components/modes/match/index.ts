// Match Mode Components and Types
export { default as MatchContainer } from './MatchContainer';
export { default as MatchGrid } from './MatchGrid';
export { default as MatchCard } from './MatchCard';
export { default as MatchTimer } from './MatchTimer';
export { default as MatchResults } from './MatchResults';

// Hooks
export { default as useMatchLogic } from './hooks/useMatchLogic';

// Types and Interfaces
export type {
  MatchSettings,
  MatchCardSide,
  MatchSessionState,
  MatchSessionStore,
  MatchContainerProps,
  MatchGridProps,
  MatchCardProps,
  MatchTimerProps,
  MatchResults as MatchResultsData,
  MatchResultsProps,
  MatchValidationResult,
  CardGenerationOptions,
  GridPosition,
  MatchAnimationState,
  MatchSoundEvents,
  MatchError,
  SessionRestoration,
} from './types';

// Default configurations
export { DEFAULT_MATCH_SETTINGS } from './types';

// Store and utilities
export { useMatchSessionStore } from '@/store/matchSessionStore';
export {
  generateMatchCards,
  validateMatch,
  shuffleArray,
  generateCardId,
  generateGroupId,
} from '@/store/matchSessionStore';