import { ComponentType, lazy, LazyExoticComponent } from 'react';

interface LazyImportOptions {
  fallback?: React.ComponentType;
  retryAttempts?: number;
  retryDelay?: number;
  onError?: (error: Error) => void;
  preload?: boolean;
}

interface LazyComponentState {
  component: LazyExoticComponent<any>;
  preloadPromise?: Promise<any>;
}

// Cache for lazy components to avoid recreation
const lazyComponentCache = new Map<string, LazyComponentState>();

/**
 * Create a lazy-loaded component with advanced error handling and retry logic
 */
export function createLazyImport<T extends ComponentType<any>>(
  importFunction: () => Promise<{ default: T }>,
  options: LazyImportOptions = {},
  cacheKey?: string
): LazyExoticComponent<T> {
  const { retryAttempts = 3, retryDelay = 1000, onError } = options;

  // Use cache if key provided
  if (cacheKey && lazyComponentCache.has(cacheKey)) {
    return lazyComponentCache.get(cacheKey)!.component;
  }

  const retryImport = async (attempt = 1): Promise<{ default: T }> => {
    try {
      const module = await importFunction();

      // Performance tracking
      if (process.env.NODE_ENV === 'development') {
        performance.mark(`lazy-${cacheKey || 'component'}-loaded`);
      }

      return module;
    } catch (error) {
      const err = error as Error;

      if (attempt < retryAttempts) {
        // Progressive backoff delay
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryImport(attempt + 1);
      }

      // Log error with context
      const enhancedError = new Error(
        `Failed to load component after ${retryAttempts} attempts: ${err.message}`
      );

      onError?.(enhancedError);

      // Track failed imports for monitoring
      if (typeof window !== 'undefined' && 'performance' in window) {
        performance.mark(`lazy-${cacheKey || 'component'}-failed`);
      }

      throw enhancedError;
    }
  };

  const lazyComponent = lazy(() => retryImport());

  // Cache the component
  if (cacheKey) {
    lazyComponentCache.set(cacheKey, { component: lazyComponent });
  }

  return lazyComponent;
}

/**
 * Preload a lazy component
 */
export function preloadComponent(
  importFunction: () => Promise<{ default: any }>,
  cacheKey?: string
): Promise<any> {
  if (cacheKey && lazyComponentCache.has(cacheKey)) {
    const cached = lazyComponentCache.get(cacheKey)!;
    if (cached.preloadPromise) {
      return cached.preloadPromise;
    }
  }

  const preloadPromise = importFunction().catch(error => {
    console.warn(`Failed to preload component ${cacheKey}:`, error);
    throw error;
  });

  if (cacheKey) {
    const existing = lazyComponentCache.get(cacheKey);
    if (existing) {
      existing.preloadPromise = preloadPromise;
    } else {
      // Create placeholder entry
      const tempComponent = lazy(() => preloadPromise);
      lazyComponentCache.set(cacheKey, {
        component: tempComponent,
        preloadPromise,
      });
    }
  }

  return preloadPromise;
}

/**
 * Batch preload multiple components
 */
export function preloadComponents(
  imports: Array<{
    importFunction: () => Promise<{ default: any }>;
    cacheKey?: string;
  }>
): Promise<void> {
  const preloadPromises = imports.map(({ importFunction, cacheKey }) =>
    preloadComponent(importFunction, cacheKey)
  );

  return Promise.allSettled(preloadPromises).then(() => {
    // Log results for monitoring
    if (process.env.NODE_ENV === 'development') {
      console.log(`Preloaded ${imports.length} components`);
    }
  });
}

// Pre-configured lazy imports with error handling and performance tracking
export const LazyHome = createLazyImport(
  () => import('@/pages/Home'),
  {
    onError: error => console.error('Failed to load Home component:', error),
    retryAttempts: 3,
  },
  'home'
);

export const LazyDeck = createLazyImport(
  () => import('@/pages/Deck'),
  {
    onError: error => console.error('Failed to load Deck component:', error),
    retryAttempts: 3,
  },
  'deck'
);

export const LazyLearn = createLazyImport(
  () => import('@/pages/Learn'),
  {
    onError: error => console.error('Failed to load Learn component:', error),
    retryAttempts: 3,
  },
  'learn'
);

export const LazyFlashcards = createLazyImport(
  () => import('@/pages/Flashcards'),
  {
    onError: error => console.error('Failed to load Flashcards component:', error),
    retryAttempts: 3,
  },
  'flashcards'
);

export const LazyMatch = createLazyImport(
  () => import('@/pages/Match'),
  {
    onError: error => console.error('Failed to load Match component:', error),
    retryAttempts: 3,
  },
  'match'
);

export const LazyLearnDemo = createLazyImport(
  () => import('@/pages/LearnDemo'),
  {
    onError: error => console.error('Failed to load LearnDemo component:', error),
    retryAttempts: 3,
  },
  'learn-demo'
);

export const LazyResults = createLazyImport(
  () => import('@/pages/Results'),
  {
    onError: error => console.error('Failed to load Results component:', error),
    retryAttempts: 3,
  },
  'results'
);

/**
 * Preload critical components on app initialization
 */
export function preloadCriticalComponents(): Promise<void> {
  // Preload the most commonly accessed components
  return preloadComponents([
    { importFunction: () => import('@/pages/Home'), cacheKey: 'home' },
    { importFunction: () => import('@/pages/Deck'), cacheKey: 'deck' },
  ]);
}

/**
 * Preload components based on user intent/hover
 */
export function preloadOnIntent(componentKey: string): void {
  const importMap: Record<string, () => Promise<{ default: any }>> = {
    learn: () => import('@/pages/Learn'),
    flashcards: () => import('@/pages/Flashcards'),
    match: () => import('@/pages/Match'),
    'learn-demo': () => import('@/pages/LearnDemo'),
    results: () => import('@/pages/Results'),
  };

  const importFunction = importMap[componentKey];
  if (importFunction) {
    preloadComponent(importFunction, componentKey);
  }
}

/**
 * Monitor lazy loading performance
 */
export function getLazyLoadingMetrics(): {
  cacheSize: number;
  preloadedComponents: string[];
  failedComponents: string[];
} {
  const preloadedComponents: string[] = [];
  const failedComponents: string[] = [];

  // Check performance marks if available
  if (typeof window !== 'undefined' && 'performance' in window) {
    const marks = performance.getEntriesByType('mark');

    marks.forEach(mark => {
      if (mark.name.startsWith('lazy-') && mark.name.endsWith('-loaded')) {
        const component = mark.name.replace('lazy-', '').replace('-loaded', '');
        preloadedComponents.push(component);
      } else if (mark.name.startsWith('lazy-') && mark.name.endsWith('-failed')) {
        const component = mark.name.replace('lazy-', '').replace('-failed', '');
        failedComponents.push(component);
      }
    });
  }

  return {
    cacheSize: lazyComponentCache.size,
    preloadedComponents,
    failedComponents,
  };
}
