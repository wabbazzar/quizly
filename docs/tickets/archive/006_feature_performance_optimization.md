# Ticket 006: Advanced Performance Optimization and Monitoring

## Metadata
- **Status**: Completed
- **Priority**: High
- **Effort**: 14 points
- **Created**: 2025-09-17
- **Type**: performance
- **Platforms**: Web (Desktop/Tablet/Mobile)

## User Stories

### Primary User Story
As a user, I want the application to load instantly and respond immediately to all interactions so that my learning experience is smooth and engaging without any performance delays.

### Secondary User Stories
- As a mobile user, I want the app to work smoothly on slower devices so that I can learn effectively regardless of my hardware
- As a developer, I want performance monitoring so that regressions are caught before affecting users
- As a user with limited data, I want minimal network usage so that I can use the app without worrying about data costs
- As a user on slow networks, I want smart loading strategies so that the app remains usable even with poor connectivity

## Technical Requirements

### Functional Requirements
1. **Bundle Optimization**: Implement code splitting, tree shaking, and lazy loading to reduce initial bundle size by 40%
2. **Runtime Performance**: Optimize component rendering, memory usage, and eliminate performance bottlenecks
3. **Network Optimization**: Implement intelligent caching, compression, and resource prioritization
4. **Memory Management**: Prevent memory leaks and optimize memory usage for long-running sessions
5. **Performance Monitoring**: Real-time performance tracking with automated alerts and regression detection

### Non-Functional Requirements
1. Performance: First Contentful Paint <1.2s, Time to Interactive <2.5s, 60 FPS interactions
2. Bundle Size: Initial JS <150KB gzipped, total assets <500KB for critical path
3. Memory Usage: <100MB baseline, <200MB peak during intensive operations
4. Network: <10 requests for initial load, intelligent caching with 90% hit rate

## Implementation Plan

### Phase 1: Bundle Size Optimization and Code Splitting (3 points)
**Files to create/modify:**
- `vite.config.ts` - Advanced build optimization configuration
- `src/utils/lazyImports.ts` - Dynamic import utilities and error handling
- `src/components/common/LazyLoadBoundary.tsx` - Lazy loading wrapper component
- `src/services/bundleAnalyzer.ts` - Bundle analysis and monitoring service
- `scripts/bundle-analyzer.js` - Build-time bundle analysis script

**Advanced Vite Configuration:**
```typescript
// vite.config.ts (enhanced)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 24 * 60 * 60, // 24 hours
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
        ],
      },
    }),
    visualizer({
      filename: 'dist/bundle-analysis.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'],
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'animation-vendor': ['framer-motion'],

          // Feature chunks
          'learn-mode': [
            './src/pages/Learn.tsx',
            './src/components/modes/learn/LearnContainer.tsx',
            './src/services/questionGenerator.ts',
          ],
          'flashcards-mode': [
            './src/pages/Flashcards.tsx',
            './src/components/modes/flashcards/FlashcardsContainer.tsx',
          ],
          'deck-management': [
            './src/pages/Deck.tsx',
            './src/components/deck/DeckHeader.tsx',
            './src/components/deck/ModeSelector.tsx',
          ],

          // UI chunks
          'ui-components': [
            './src/components/ui/Button.tsx',
            './src/components/ui/Modal.tsx',
            './src/components/ui/Card.tsx',
          ],
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
            : 'chunk';
          return `assets/[name]-[hash].js`;
        },
      },
    },

    // Enable source maps for production debugging
    sourcemap: process.env.NODE_ENV === 'production' ? 'hidden' : true,

    // Optimize CSS
    cssCodeSplit: true,
    cssMinify: true,

    // Asset optimization
    assetsInlineLimit: 4096, // 4KB limit for inlining
  },

  // Development optimizations
  server: {
    port: 5173,
    open: true,
    cors: true,
  },

  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      'framer-motion',
    ],
    exclude: [
      // Large libraries that should be loaded on demand
      'html2canvas',
      '@testing-library/react',
    ],
  },
});
```

**Lazy Loading System:**
```typescript
// src/utils/lazyImports.ts
import { ComponentType, lazy, LazyExoticComponent } from 'react';

interface LazyImportOptions {
  fallback?: React.ComponentType;
  retryAttempts?: number;
  retryDelay?: number;
  onError?: (error: Error) => void;
}

export function createLazyImport<T extends ComponentType<any>>(
  importFunction: () => Promise<{ default: T }>,
  options: LazyImportOptions = {}
): LazyExoticComponent<T> {
  const { retryAttempts = 3, retryDelay = 1000, onError } = options;

  const retryImport = async (attempt = 1): Promise<{ default: T }> => {
    try {
      return await importFunction();
    } catch (error) {
      if (attempt < retryAttempts) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        return retryImport(attempt + 1);
      }

      // Log error and rethrow
      onError?.(error as Error);
      throw error;
    }
  };

  return lazy(() => retryImport());
}

// Pre-configured lazy imports with error handling
export const LazyLearn = createLazyImport(
  () => import('@/pages/Learn'),
  {
    onError: (error) => console.error('Failed to load Learn component:', error),
    retryAttempts: 3,
  }
);

export const LazyFlashcards = createLazyImport(
  () => import('@/pages/Flashcards'),
  {
    onError: (error) => console.error('Failed to load Flashcards component:', error),
    retryAttempts: 3,
  }
);

export const LazyDeck = createLazyImport(
  () => import('@/pages/Deck'),
  {
    onError: (error) => console.error('Failed to load Deck component:', error),
    retryAttempts: 3,
  }
);

// Utility for preloading components
export const preloadComponent = (importFunction: () => Promise<any>) => {
  // Use requestIdleCallback if available, otherwise setTimeout
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      importFunction().catch(console.warn);
    });
  } else {
    setTimeout(() => {
      importFunction().catch(console.warn);
    }, 100);
  }
};

// Route-based preloading
export const preloadRouteComponents = () => {
  // Preload likely next components based on current route
  const currentPath = window.location.pathname;

  if (currentPath === '/') {
    // On home page, preload deck page
    preloadComponent(() => import('@/pages/Deck'));
  } else if (currentPath.includes('/deck/')) {
    // On deck page, preload learning modes
    preloadComponent(() => import('@/pages/Learn'));
    preloadComponent(() => import('@/pages/Flashcards'));
  }
};
```

**Lazy Load Boundary Component:**
```typescript
// src/components/common/LazyLoadBoundary.tsx
import { FC, Suspense, ReactNode, useState, useEffect } from 'react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import styles from './LazyLoadBoundary.module.css';

interface LazyLoadBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  loadingMessage?: string;
  minLoadTime?: number; // Minimum loading time to prevent flashing
  maxLoadTime?: number; // Maximum loading time before timeout
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onLoadError?: (error: Error) => void;
}

export const LazyLoadBoundary: FC<LazyLoadBoundaryProps> = ({
  children,
  fallback,
  errorFallback,
  loadingMessage = 'Loading...',
  minLoadTime = 200,
  maxLoadTime = 10000,
  onLoadStart,
  onLoadComplete,
  onLoadError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [loadStartTime] = useState(Date.now());

  useEffect(() => {
    onLoadStart?.();

    const minTimeTimeout = setTimeout(() => {
      setIsLoading(false);
      onLoadComplete?.();
    }, minLoadTime);

    const maxTimeTimeout = setTimeout(() => {
      if (isLoading) {
        const timeoutError = new Error(`Component failed to load within ${maxLoadTime}ms`);
        onLoadError?.(timeoutError);
        setHasError(true);
        setIsLoading(false);
      }
    }, maxLoadTime);

    return () => {
      clearTimeout(minTimeTimeout);
      clearTimeout(maxTimeTimeout);
    };
  }, [minLoadTime, maxLoadTime, isLoading, onLoadStart, onLoadComplete, onLoadError]);

  const DefaultFallback = () => (
    <div className={styles.loadingContainer}>
      <LoadingScreen message={loadingMessage} />
    </div>
  );

  const DefaultErrorFallback = () => (
    <div className={styles.errorContainer}>
      <h3>Failed to Load Component</h3>
      <p>Please try refreshing the page.</p>
      <button onClick={() => window.location.reload()}>
        Refresh Page
      </button>
    </div>
  );

  if (hasError) {
    return <>{errorFallback || <DefaultErrorFallback />}</>;
  }

  return (
    <ErrorBoundary
      level="component"
      onError={(error) => {
        onLoadError?.(error);
        setHasError(true);
      }}
    >
      <Suspense fallback={fallback || <DefaultFallback />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

// Higher-order component for easy wrapping
export function withLazyLoading<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<LazyLoadBoundaryProps, 'children'>
) {
  return function LazyWrappedComponent(props: P) {
    return (
      <LazyLoadBoundary {...options}>
        <Component {...props} />
      </LazyLoadBoundary>
    );
  };
}
```

**Bundle Analysis Service:**
```typescript
// src/services/bundleAnalyzer.ts
interface BundleMetrics {
  timestamp: number;
  totalSize: number;
  gzippedSize: number;
  chunks: Array<{
    name: string;
    size: number;
    gzippedSize: number;
    modules: string[];
  }>;
  loadTime: number;
  cacheHitRate: number;
}

class BundleAnalyzer {
  private metrics: BundleMetrics[] = [];
  private performanceObserver: PerformanceObserver | null = null;

  public init() {
    this.setupPerformanceMonitoring();
    this.trackInitialLoad();
  }

  private setupPerformanceMonitoring() {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.recordLoadMetrics(entry as PerformanceNavigationTiming);
          } else if (entry.entryType === 'resource') {
            this.recordResourceMetrics(entry as PerformanceResourceTiming);
          }
        }
      });

      this.performanceObserver.observe({
        entryTypes: ['navigation', 'resource'],
      });
    }
  }

  private trackInitialLoad() {
    // Track when each chunk loads
    const originalImport = window.__webpack_require__ || window.import;
    if (originalImport) {
      // Wrap dynamic imports to track loading
      const trackingImport = async (specifier: string) => {
        const startTime = performance.now();
        try {
          const module = await originalImport(specifier);
          const endTime = performance.now();

          this.recordChunkLoad(specifier, endTime - startTime);
          return module;
        } catch (error) {
          this.recordChunkError(specifier, error);
          throw error;
        }
      };

      // Replace the global import function
      if (typeof window !== 'undefined') {
        (window as any).__originalImport = originalImport;
        (window as any).import = trackingImport;
      }
    }
  }

  private recordLoadMetrics(entry: PerformanceNavigationTiming) {
    const metrics: Partial<BundleMetrics> = {
      timestamp: Date.now(),
      loadTime: entry.loadEventEnd - entry.navigationStart,
    };

    // Estimate cache hit rate based on resource timing
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const cachedResources = resources.filter(r =>
      r.transferSize === 0 || r.transferSize < r.decodedBodySize
    );

    if (resources.length > 0) {
      metrics.cacheHitRate = cachedResources.length / resources.length;
    }

    this.addMetrics(metrics);
  }

  private recordResourceMetrics(entry: PerformanceResourceTiming) {
    // Track individual resource loading
    if (entry.name.includes('.js') || entry.name.includes('.css')) {
      console.debug('Resource loaded:', {
        name: entry.name,
        size: entry.transferSize,
        loadTime: entry.responseEnd - entry.requestStart,
        cached: entry.transferSize === 0,
      });
    }
  }

  private recordChunkLoad(chunkName: string, loadTime: number) {
    console.debug('Chunk loaded:', { chunkName, loadTime });

    // Store chunk metrics
    const chunkMetrics = {
      name: chunkName,
      loadTime,
      timestamp: Date.now(),
    };

    // Send to analytics if needed
    this.sendChunkMetrics(chunkMetrics);
  }

  private recordChunkError(chunkName: string, error: any) {
    console.error('Chunk load error:', { chunkName, error });

    // Send error metrics
    this.sendErrorMetrics({
      type: 'chunk_load_error',
      chunkName,
      error: error.message,
      timestamp: Date.now(),
    });
  }

  private addMetrics(metrics: Partial<BundleMetrics>) {
    const completeMetrics: BundleMetrics = {
      timestamp: Date.now(),
      totalSize: 0,
      gzippedSize: 0,
      chunks: [],
      loadTime: 0,
      cacheHitRate: 0,
      ...metrics,
    };

    this.metrics.push(completeMetrics);

    // Keep only recent metrics (last 100 measurements)
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  private sendChunkMetrics(metrics: any) {
    // In production, send to analytics service
    if (process.env.NODE_ENV === 'development') {
      console.info('Bundle metrics:', metrics);
    }
  }

  private sendErrorMetrics(error: any) {
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'development') {
      console.error('Bundle error:', error);
    }
  }

  public getMetrics(): BundleMetrics[] {
    return [...this.metrics];
  }

  public getAverageLoadTime(): number {
    if (this.metrics.length === 0) return 0;
    return this.metrics.reduce((sum, m) => sum + m.loadTime, 0) / this.metrics.length;
  }

  public getCacheHitRate(): number {
    if (this.metrics.length === 0) return 0;
    return this.metrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / this.metrics.length;
  }

  public destroy() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
  }
}

export const bundleAnalyzer = new BundleAnalyzer();
```

**Implementation steps:**
1. Configure advanced Vite build optimization with intelligent chunking
2. Implement lazy loading system with error handling and retry logic
3. Create bundle analysis and monitoring service
4. Add component-level lazy loading boundaries
5. Set up preloading strategies for critical resources

**Testing:**
1. Bundle size analysis before and after optimization
2. Lazy loading functionality and error handling validation
3. Performance metrics collection and accuracy verification
4. Network request reduction and caching effectiveness

**Commit**: `perf: implement advanced bundle optimization and lazy loading system`

### Phase 2: Runtime Performance Optimization (4 points)
**Files to create/modify:**
- `src/hooks/usePerformanceOptimization.ts` - Performance optimization hooks
- `src/components/common/VirtualizedList.tsx` - Virtual scrolling implementation
- `src/utils/memoryManager.ts` - Memory management and leak prevention
- `src/services/performanceMonitor.ts` - Runtime performance monitoring
- `src/components/common/OptimizedImage.tsx` - Image optimization component

**Performance Optimization Hooks:**
```typescript
// src/hooks/usePerformanceOptimization.ts
import {
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useState,
  RefObject
} from 'react';

// Heavy computation optimization hook
export function useHeavyComputation<T, D extends ReadonlyArray<unknown>>(
  computeFn: () => T,
  deps: D,
  options: {
    debounceMs?: number;
    enableWebWorker?: boolean;
    enableMemoization?: boolean;
  } = {}
): { result: T | null; isComputing: boolean; error: Error | null } {
  const { debounceMs = 0, enableWebWorker = false, enableMemoization = true } = options;

  const [result, setResult] = useState<T | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const computationRef = useRef<{
    promise: Promise<T> | null;
    controller: AbortController | null;
  }>({ promise: null, controller: null });

  const memoizedComputation = useMemo(() => {
    if (!enableMemoization) return computeFn();
    return computeFn();
  }, enableMemoization ? deps : []);

  const debouncedComputation = useCallback(
    debounce(async () => {
      // Cancel previous computation
      if (computationRef.current.controller) {
        computationRef.current.controller.abort();
      }

      const controller = new AbortController();
      computationRef.current.controller = controller;

      setIsComputing(true);
      setError(null);

      try {
        if (enableWebWorker && 'Worker' in window) {
          // Use Web Worker for heavy computation
          const result = await runInWebWorker(computeFn);

          if (!controller.signal.aborted) {
            setResult(result);
          }
        } else {
          // Use requestIdleCallback for non-blocking computation
          const result = await runInIdleCallback(enableMemoization ? () => memoizedComputation : computeFn);

          if (!controller.signal.aborted) {
            setResult(result);
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err as Error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsComputing(false);
        }
      }
    }, debounceMs),
    [enableWebWorker, enableMemoization, memoizedComputation, debounceMs]
  );

  useEffect(() => {
    debouncedComputation();

    return () => {
      if (computationRef.current.controller) {
        computationRef.current.controller.abort();
      }
    };
  }, deps);

  return { result, isComputing, error };
}

// Intersection observer hook for lazy loading
export function useIntersectionObserver(
  elementRef: RefObject<Element>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, options.threshold, options.rootMargin]);

  return isIntersecting;
}

// Performance measurement hook
export function usePerformanceMeasure(name: string, measureOnRender = false) {
  const startTimeRef = useRef<number>(0);

  const start = useCallback(() => {
    startTimeRef.current = performance.now();
    performance.mark(`${name}-start`);
  }, [name]);

  const end = useCallback(() => {
    const endTime = performance.now();
    performance.mark(`${name}-end`);

    try {
      performance.measure(name, `${name}-start`, `${name}-end`);

      const duration = endTime - startTimeRef.current;

      // Log slow operations
      if (duration > 16) { // More than one frame at 60fps
        console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
      }

      return duration;
    } catch (error) {
      console.warn('Performance measurement failed:', error);
      return endTime - startTimeRef.current;
    }
  }, [name]);

  useEffect(() => {
    if (measureOnRender) {
      start();
      return end;
    }
  }, [measureOnRender, start, end]);

  return { start, end };
}

// Memory usage monitoring hook
export function useMemoryMonitor(intervalMs = 5000) {
  const [memoryInfo, setMemoryInfo] = useState<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null>(null);

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return memoryInfo;
}

// Utility functions
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

async function runInWebWorker<T>(fn: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      URL.createObjectURL(
        new Blob([`
          self.onmessage = function(e) {
            try {
              const result = (${fn.toString()})();
              self.postMessage({ result });
            } catch (error) {
              self.postMessage({ error: error.message });
            }
          }
        `], { type: 'application/javascript' })
      )
    );

    worker.onmessage = (e) => {
      worker.terminate();
      if (e.data.error) {
        reject(new Error(e.data.error));
      } else {
        resolve(e.data.result);
      }
    };

    worker.onerror = (error) => {
      worker.terminate();
      reject(error);
    };

    worker.postMessage({});
  });
}

async function runInIdleCallback<T>(fn: () => T): Promise<T> {
  return new Promise((resolve) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        resolve(fn());
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        resolve(fn());
      }, 0);
    }
  });
}
```

**Virtual Scrolling Component:**
```typescript
// src/components/common/VirtualizedList.tsx
import { FC, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { usePerformanceMeasure } from '@/hooks/usePerformanceOptimization';
import styles from './VirtualizedList.module.css';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number | ((index: number, item: T) => number);
  containerHeight: number;
  renderItem: (item: T, index: number, isVisible: boolean) => React.ReactNode;
  overscan?: number; // Number of items to render outside viewport
  onScroll?: (scrollTop: number) => void;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  className?: string;
  preserveScrollPosition?: boolean;
  getItemKey?: (item: T, index: number) => string | number;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  onScroll,
  onEndReached,
  endReachedThreshold = 0.8,
  className,
  preserveScrollPosition = false,
  getItemKey,
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const { start: measureStart, end: measureEnd } = usePerformanceMeasure('virtualized-list-render');

  const getItemHeightValue = useCallback((index: number, item: T): number => {
    return typeof itemHeight === 'function' ? itemHeight(index, item) : itemHeight;
  }, [itemHeight]);

  // Calculate total height and item positions
  const { totalHeight, itemPositions } = useMemo(() => {
    measureStart();

    let currentTop = 0;
    const positions: Array<{ top: number; height: number }> = [];

    for (let i = 0; i < items.length; i++) {
      const height = getItemHeightValue(i, items[i]);
      positions.push({ top: currentTop, height });
      currentTop += height;
    }

    measureEnd();

    return {
      totalHeight: currentTop,
      itemPositions: positions,
    };
  }, [items, getItemHeightValue, measureStart, measureEnd]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = itemPositions.findIndex(
      pos => pos.top + pos.height > scrollTop - overscan * (typeof itemHeight === 'number' ? itemHeight : 50)
    );

    const endIndex = itemPositions.findIndex(
      pos => pos.top > scrollTop + containerHeight + overscan * (typeof itemHeight === 'number' ? itemHeight : 50)
    );

    return {
      start: Math.max(0, startIndex === -1 ? 0 : startIndex),
      end: endIndex === -1 ? items.length - 1 : Math.min(items.length - 1, endIndex),
    };
  }, [scrollTop, containerHeight, itemPositions, overscan, itemHeight, items.length]);

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    setIsScrolling(true);

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set scrolling to false after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);

    onScroll?.(newScrollTop);

    // Check if end reached
    if (onEndReached) {
      const scrollPercentage = (newScrollTop + containerHeight) / totalHeight;
      if (scrollPercentage >= endReachedThreshold) {
        onEndReached();
      }
    }
  }, [onScroll, onEndReached, containerHeight, totalHeight, endReachedThreshold]);

  // Render visible items
  const visibleItems = useMemo(() => {
    measureStart();

    const rendered = [];
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      if (i >= items.length) break;

      const item = items[i];
      const position = itemPositions[i];
      const key = getItemKey ? getItemKey(item, i) : i;
      const isVisible = !isScrolling; // Hide complex content while scrolling

      rendered.push(
        <div
          key={key}
          className={styles.virtualItem}
          style={{
            position: 'absolute',
            top: position.top,
            height: position.height,
            width: '100%',
          }}
        >
          {renderItem(item, i, isVisible)}
        </div>
      );
    }

    measureEnd();
    return rendered;
  }, [visibleRange, items, itemPositions, getItemKey, renderItem, isScrolling, measureStart, measureEnd]);

  // Preserve scroll position on item changes
  useEffect(() => {
    if (preserveScrollPosition && containerRef.current) {
      const container = containerRef.current;
      const currentScrollPercentage = scrollTop / (totalHeight - containerHeight);

      requestAnimationFrame(() => {
        const newScrollTop = currentScrollPercentage * (totalHeight - containerHeight);
        container.scrollTop = newScrollTop;
      });
    }
  }, [items.length, preserveScrollPosition, scrollTop, totalHeight, containerHeight]);

  // Cleanup scroll timeout
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`${styles.virtualizedContainer} ${className || ''}`}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div
        className={styles.virtualizedContent}
        style={{ height: totalHeight, position: 'relative' }}
      >
        {visibleItems}
      </div>
    </div>
  );
}

// Specialized hook for deck list virtualization
export function useVirtualizedDeckList(
  decks: any[],
  containerHeight: number,
  itemHeight = 120
) {
  return useMemo(() => {
    const renderDeckItem = (deck: any, index: number, isVisible: boolean) => {
      // Render simplified version while scrolling
      if (!isVisible) {
        return (
          <div className={styles.simplifiedDeckCard}>
            <h3>{deck.metadata.deck_name}</h3>
            <p>{deck.metadata.card_count} cards</p>
          </div>
        );
      }

      // Render full deck card when not scrolling
      return (
        <div className={styles.fullDeckCard}>
          {/* Full deck card implementation */}
        </div>
      );
    };

    return {
      renderDeckItem,
      getItemKey: (deck: any) => deck.id,
    };
  }, []);
}
```

**Memory Management Service:**
```typescript
// src/utils/memoryManager.ts
interface MemoryMetrics {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  componentCount: number;
  listenerCount: number;
}

class MemoryManager {
  private metrics: MemoryMetrics[] = [];
  private cleanupTasks: Array<() => void> = [];
  private componentRegistry = new Map<string, number>();
  private listenerRegistry = new Set<{
    element: EventTarget;
    type: string;
    listener: EventListener;
  }>();

  public init() {
    this.startMemoryMonitoring();
    this.setupCleanupHooks();
  }

  private startMemoryMonitoring() {
    const collectMetrics = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const metrics: MemoryMetrics = {
          timestamp: Date.now(),
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          componentCount: this.getTotalComponentCount(),
          listenerCount: this.listenerRegistry.size,
        };

        this.metrics.push(metrics);

        // Keep only recent metrics
        if (this.metrics.length > 100) {
          this.metrics = this.metrics.slice(-100);
        }

        // Check for memory leaks
        this.checkForMemoryLeaks(metrics);
      }
    };

    // Collect metrics every 10 seconds
    setInterval(collectMetrics, 10000);

    // Collect initial metrics
    collectMetrics();
  }

  private setupCleanupHooks() {
    // Clean up when page unloads
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // Clean up when visibility changes (page hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performMaintenanceCleanup();
      }
    });

    // Periodic cleanup
    setInterval(() => {
      this.performMaintenanceCleanup();
    }, 60000); // Every minute
  }

  public registerComponent(componentName: string) {
    const currentCount = this.componentRegistry.get(componentName) || 0;
    this.componentRegistry.set(componentName, currentCount + 1);
  }

  public unregisterComponent(componentName: string) {
    const currentCount = this.componentRegistry.get(componentName) || 0;
    if (currentCount > 0) {
      this.componentRegistry.set(componentName, currentCount - 1);
    }
  }

  public addEventListener(
    element: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ) {
    element.addEventListener(type, listener, options);

    this.listenerRegistry.add({
      element,
      type,
      listener,
    });
  }

  public removeEventListener(
    element: EventTarget,
    type: string,
    listener: EventListener
  ) {
    element.removeEventListener(type, listener);

    // Find and remove from registry
    for (const entry of this.listenerRegistry) {
      if (entry.element === element && entry.type === type && entry.listener === listener) {
        this.listenerRegistry.delete(entry);
        break;
      }
    }
  }

  public addCleanupTask(task: () => void) {
    this.cleanupTasks.push(task);
  }

  public removeCleanupTask(task: () => void) {
    const index = this.cleanupTasks.indexOf(task);
    if (index > -1) {
      this.cleanupTasks.splice(index, 1);
    }
  }

  private getTotalComponentCount(): number {
    return Array.from(this.componentRegistry.values()).reduce((sum, count) => sum + count, 0);
  }

  private checkForMemoryLeaks(metrics: MemoryMetrics) {
    if (this.metrics.length < 10) return;

    // Check for consistent memory growth
    const recentMetrics = this.metrics.slice(-10);
    const memoryGrowth = recentMetrics.map((m, i) =>
      i > 0 ? m.usedJSHeapSize - recentMetrics[i - 1].usedJSHeapSize : 0
    ).slice(1);

    const averageGrowth = memoryGrowth.reduce((sum, growth) => sum + growth, 0) / memoryGrowth.length;

    // Alert if memory is consistently growing
    if (averageGrowth > 1024 * 1024) { // 1MB growth per measurement
      console.warn('Potential memory leak detected:', {
        averageGrowth: `${(averageGrowth / 1024 / 1024).toFixed(2)}MB`,
        currentUsage: `${(metrics.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        componentCount: metrics.componentCount,
        listenerCount: metrics.listenerCount,
      });

      // Trigger aggressive cleanup
      this.performAggressiveCleanup();
    }

    // Alert if memory usage is very high
    const usagePercentage = metrics.usedJSHeapSize / metrics.jsHeapSizeLimit;
    if (usagePercentage > 0.8) {
      console.warn('High memory usage detected:', {
        usage: `${(usagePercentage * 100).toFixed(1)}%`,
        used: `${(metrics.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        limit: `${(metrics.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
      });
    }
  }

  private performMaintenanceCleanup() {
    // Clear expired cache entries
    this.clearExpiredCaches();

    // Force garbage collection if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }

  private performAggressiveCleanup() {
    // Run all cleanup tasks
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.warn('Cleanup task failed:', error);
      }
    });

    // Clear all caches
    this.clearAllCaches();

    // Remove orphaned event listeners
    this.cleanupOrphanedListeners();
  }

  private clearExpiredCaches() {
    // Clear various browser caches that might be holding memory
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('expired') || name.includes('old')) {
            caches.delete(name);
          }
        });
      });
    }
  }

  private clearAllCaches() {
    // More aggressive cache clearing
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }

    // Clear localStorage items that might be large
    try {
      const keysToCheck = ['deck-store', 'errorReports', 'progress_snapshots'];
      keysToCheck.forEach(key => {
        const item = localStorage.getItem(key);
        if (item && item.length > 100000) { // > 100KB
          localStorage.removeItem(key);
          console.log(`Cleared large localStorage item: ${key}`);
        }
      });
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }

  private cleanupOrphanedListeners() {
    // Remove listeners for elements that no longer exist in DOM
    for (const entry of this.listenerRegistry) {
      if (entry.element instanceof Element && !document.contains(entry.element)) {
        this.listenerRegistry.delete(entry);
      }
    }
  }

  public cleanup() {
    // Final cleanup when app is shutting down
    this.performAggressiveCleanup();

    // Clear all registries
    this.componentRegistry.clear();
    this.listenerRegistry.clear();
    this.cleanupTasks.length = 0;
  }

  public getMemoryMetrics(): MemoryMetrics[] {
    return [...this.metrics];
  }

  public getCurrentMemoryUsage(): MemoryMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }
}

export const memoryManager = new MemoryManager();

// React hook for memory management
export function useMemoryManagement(componentName: string) {
  useEffect(() => {
    memoryManager.registerComponent(componentName);

    return () => {
      memoryManager.unregisterComponent(componentName);
    };
  }, [componentName]);

  const addCleanupTask = useCallback((task: () => void) => {
    memoryManager.addCleanupTask(task);

    return () => {
      memoryManager.removeCleanupTask(task);
    };
  }, []);

  return { addCleanupTask };
}
```

**Implementation steps:**
1. Create performance optimization hooks for heavy computations and measurements
2. Implement virtual scrolling for large lists with dynamic heights
3. Build comprehensive memory management and leak detection system
4. Add runtime performance monitoring with automated alerting
5. Create optimized image loading component with lazy loading

**Testing:**
1. Performance benchmarking before and after optimizations
2. Memory leak detection and prevention validation
3. Virtual scrolling functionality with large datasets
4. Runtime performance monitoring accuracy verification

**Commit**: `perf: implement runtime performance optimization and memory management`

### Phase 3: Network and Caching Optimization (4 points)
**Files to create/modify:**
- `src/services/cacheManager.ts` - Intelligent caching system
- `src/services/networkOptimizer.ts` - Network request optimization
- `src/hooks/useSmartFetch.ts` - Smart data fetching with caching
- `src/utils/compressionUtils.ts` - Data compression utilities
- `public/sw.js` - Enhanced service worker for caching

**Intelligent Caching System:**
```typescript
// src/services/cacheManager.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: string;
  size: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheConfig {
  maxAge: number; // milliseconds
  maxSize: number; // bytes
  maxEntries: number;
  strategy: 'lru' | 'lfu' | 'fifo';
  compression: boolean;
  persistent: boolean;
}

class CacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private persistentStorage: 'localStorage' | 'indexedDB' | null = null;
  private totalSize = 0;
  private readonly maxMemorySize = 50 * 1024 * 1024; // 50MB

  constructor() {
    this.initializePersistentStorage();
    this.startCleanupTimer();
  }

  private async initializePersistentStorage() {
    // Prefer IndexedDB for larger storage
    if ('indexedDB' in window) {
      try {
        await this.initIndexedDB();
        this.persistentStorage = 'indexedDB';
      } catch (error) {
        console.warn('IndexedDB initialization failed, falling back to localStorage:', error);
        this.persistentStorage = 'localStorage';
      }
    } else {
      this.persistentStorage = 'localStorage';
    }
  }

  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('QuizlyCache', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }
      };
    });
  }

  public async set<T>(
    key: string,
    data: T,
    config: Partial<CacheConfig> = {}
  ): Promise<void> {
    const defaultConfig: CacheConfig = {
      maxAge: 5 * 60 * 1000, // 5 minutes
      maxSize: 1024 * 1024, // 1MB
      maxEntries: 1000,
      strategy: 'lru',
      compression: false,
      persistent: false,
    };

    const finalConfig = { ...defaultConfig, ...config };
    const now = Date.now();

    let serializedData = JSON.stringify(data);
    let dataSize = new Blob([serializedData]).size;

    // Apply compression if enabled and beneficial
    if (finalConfig.compression && dataSize > 1024) { // Only compress if > 1KB
      try {
        serializedData = await this.compressData(serializedData);
        dataSize = new Blob([serializedData]).size;
      } catch (error) {
        console.warn('Compression failed:', error);
      }
    }

    const entry: CacheEntry<string> = {
      data: serializedData,
      timestamp: now,
      expiresAt: now + finalConfig.maxAge,
      version: '1.0',
      size: dataSize,
      accessCount: 0,
      lastAccessed: now,
    };

    // Check if we need to evict entries
    await this.evictIfNecessary(dataSize, finalConfig);

    // Store in memory cache
    this.memoryCache.set(key, entry);
    this.totalSize += dataSize;

    // Store persistently if configured
    if (finalConfig.persistent) {
      await this.setPersistent(key, entry);
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    // Try memory cache first
    let entry = this.memoryCache.get(key);

    // Try persistent storage if not in memory
    if (!entry) {
      entry = await this.getPersistent(key);

      // Add back to memory cache if found
      if (entry) {
        this.memoryCache.set(key, entry);
        this.totalSize += entry.size;
      }
    }

    if (!entry) {
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      await this.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    try {
      // Decompress if needed
      let data = entry.data;
      if (this.isCompressed(data)) {
        data = await this.decompressData(data);
      }

      return JSON.parse(data) as T;
    } catch (error) {
      console.warn('Failed to parse cached data:', error);
      await this.delete(key);
      return null;
    }
  }

  public async delete(key: string): Promise<void> {
    const entry = this.memoryCache.get(key);
    if (entry) {
      this.totalSize -= entry.size;
      this.memoryCache.delete(key);
    }

    await this.deletePersistent(key);
  }

  public async clear(): Promise<void> {
    this.memoryCache.clear();
    this.totalSize = 0;
    await this.clearPersistent();
  }

  private async evictIfNecessary(newEntrySize: number, config: CacheConfig): Promise<void> {
    // Check memory limit
    while (this.totalSize + newEntrySize > this.maxMemorySize) {
      await this.evictEntry(config.strategy);
    }

    // Check entry count limit
    while (this.memoryCache.size >= config.maxEntries) {
      await this.evictEntry(config.strategy);
    }
  }

  private async evictEntry(strategy: CacheConfig['strategy']): Promise<void> {
    if (this.memoryCache.size === 0) return;

    let keyToEvict: string;

    switch (strategy) {
      case 'lru':
        keyToEvict = this.findLRUKey();
        break;
      case 'lfu':
        keyToEvict = this.findLFUKey();
        break;
      case 'fifo':
        keyToEvict = this.findFIFOKey();
        break;
      default:
        keyToEvict = this.memoryCache.keys().next().value;
    }

    await this.delete(keyToEvict);
  }

  private findLRUKey(): string {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.memoryCache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private findLFUKey(): string {
    let leastUsedKey = '';
    let leastCount = Infinity;

    for (const [key, entry] of this.memoryCache) {
      if (entry.accessCount < leastCount) {
        leastCount = entry.accessCount;
        leastUsedKey = key;
      }
    }

    return leastUsedKey;
  }

  private findFIFOKey(): string {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.memoryCache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private async setPersistent(key: string, entry: CacheEntry<string>): Promise<void> {
    try {
      if (this.persistentStorage === 'indexedDB') {
        await this.setIndexedDB(key, entry);
      } else if (this.persistentStorage === 'localStorage') {
        localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
      }
    } catch (error) {
      console.warn('Failed to store in persistent cache:', error);
    }
  }

  private async getPersistent(key: string): Promise<CacheEntry<string> | null> {
    try {
      if (this.persistentStorage === 'indexedDB') {
        return await this.getIndexedDB(key);
      } else if (this.persistentStorage === 'localStorage') {
        const stored = localStorage.getItem(`cache_${key}`);
        return stored ? JSON.parse(stored) : null;
      }
    } catch (error) {
      console.warn('Failed to retrieve from persistent cache:', error);
    }
    return null;
  }

  private async deletePersistent(key: string): Promise<void> {
    try {
      if (this.persistentStorage === 'indexedDB') {
        await this.deleteIndexedDB(key);
      } else if (this.persistentStorage === 'localStorage') {
        localStorage.removeItem(`cache_${key}`);
      }
    } catch (error) {
      console.warn('Failed to delete from persistent cache:', error);
    }
  }

  private async clearPersistent(): Promise<void> {
    try {
      if (this.persistentStorage === 'indexedDB') {
        await this.clearIndexedDB();
      } else if (this.persistentStorage === 'localStorage') {
        const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
        keys.forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.warn('Failed to clear persistent cache:', error);
    }
  }

  private async setIndexedDB(key: string, entry: CacheEntry<string>): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('QuizlyCache', 1);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');

        const putRequest = store.put({ key, ...entry });
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async getIndexedDB(key: string): Promise<CacheEntry<string> | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('QuizlyCache', 1);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');

        const getRequest = store.get(key);
        getRequest.onsuccess = () => {
          const result = getRequest.result;
          resolve(result ? { ...result } : null);
        };
        getRequest.onerror = () => reject(getRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async deleteIndexedDB(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('QuizlyCache', 1);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');

        const deleteRequest = store.delete(key);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async clearIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('QuizlyCache', 1);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');

        const clearRequest = store.clear();
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async compressData(data: string): Promise<string> {
    // Use CompressionStream if available (modern browsers)
    if ('CompressionStream' in window) {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      writer.write(new TextEncoder().encode(data));
      writer.close();

      const chunks: Uint8Array[] = [];
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }

      const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        compressed.set(chunk, offset);
        offset += chunk.length;
      }

      return `gzip:${btoa(String.fromCharCode(...compressed))}`;
    }

    // Fallback: simple compression using LZ-string-like algorithm
    return `simple:${this.simpleCompress(data)}`;
  }

  private async decompressData(data: string): Promise<string> {
    if (data.startsWith('gzip:')) {
      // Use DecompressionStream if available
      if ('DecompressionStream' in window) {
        const compressed = Uint8Array.from(atob(data.slice(5)), c => c.charCodeAt(0));
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        writer.write(compressed);
        writer.close();

        const chunks: Uint8Array[] = [];
        let done = false;

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }

        const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          decompressed.set(chunk, offset);
          offset += chunk.length;
        }

        return new TextDecoder().decode(decompressed);
      }
    } else if (data.startsWith('simple:')) {
      return this.simpleDecompress(data.slice(7));
    }

    return data;
  }

  private isCompressed(data: string): boolean {
    return data.startsWith('gzip:') || data.startsWith('simple:');
  }

  private simpleCompress(data: string): string {
    // Simple run-length encoding
    let compressed = '';
    for (let i = 0; i < data.length; i++) {
      let count = 1;
      while (i + 1 < data.length && data[i] === data[i + 1]) {
        count++;
        i++;
      }
      compressed += count > 1 ? `${data[i]}${count}` : data[i];
    }
    return compressed;
  }

  private simpleDecompress(data: string): string {
    // Reverse of simple compression
    let decompressed = '';
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      if (i + 1 < data.length && /\d/.test(data[i + 1])) {
        const count = parseInt(data[i + 1]);
        decompressed += char.repeat(count);
        i++; // Skip the count digit
      } else {
        decompressed += char;
      }
    }
    return decompressed;
  }

  private startCleanupTimer(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  private async cleanupExpiredEntries(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.memoryCache) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      await this.delete(key);
    }
  }

  public getCacheStats() {
    return {
      entryCount: this.memoryCache.size,
      totalSize: this.totalSize,
      maxSize: this.maxMemorySize,
      storageType: this.persistentStorage,
    };
  }
}

export const cacheManager = new CacheManager();
```

**Smart Fetch Hook:**
```typescript
// src/hooks/useSmartFetch.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { cacheManager } from '@/services/cacheManager';

interface SmartFetchOptions {
  cacheKey?: string;
  cacheMaxAge?: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
  staleWhileRevalidate?: boolean;
  backgroundRefresh?: boolean;
  compression?: boolean;
  persistent?: boolean;
}

interface SmartFetchState<T> {
  data: T | null;
  isLoading: boolean;
  isValidating: boolean;
  error: Error | null;
  isStale: boolean;
  lastFetched: number | null;
}

export function useSmartFetch<T>(
  url: string | null,
  options: SmartFetchOptions = {}
): SmartFetchState<T> & {
  refetch: () => Promise<void>;
  mutate: (data: T) => void;
} {
  const {
    cacheKey = url || '',
    cacheMaxAge = 5 * 60 * 1000, // 5 minutes
    retryAttempts = 3,
    retryDelay = 1000,
    timeout = 10000,
    staleWhileRevalidate = true,
    backgroundRefresh = true,
    compression = false,
    persistent = false,
  } = options;

  const [state, setState] = useState<SmartFetchState<T>>({
    data: null,
    isLoading: false,
    isValidating: false,
    error: null,
    isStale: false,
    lastFetched: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const backgroundRefreshTimeoutRef = useRef<NodeJS.Timeout>();

  const fetchData = useCallback(async (
    isBackground = false,
    skipCache = false
  ): Promise<void> => {
    if (!url) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    // Try cache first (unless skipping cache or background refresh)
    if (!skipCache && !isBackground) {
      try {
        const cachedData = await cacheManager.get<T>(cacheKey);
        if (cachedData) {
          setState(prev => ({
            ...prev,
            data: cachedData,
            isLoading: false,
            isStale: staleWhileRevalidate, // Mark as stale if using SWR
            lastFetched: Date.now(),
          }));

          // If using stale-while-revalidate, fetch in background
          if (staleWhileRevalidate && !isBackground) {
            fetchData(true, true);
          }
          return;
        }
      } catch (error) {
        console.warn('Cache retrieval failed:', error);
      }
    }

    setState(prev => ({
      ...prev,
      isLoading: !isBackground,
      isValidating: isBackground,
      error: null,
    }));

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const fetchPromise = fetch(url, {
          signal: abortControllerRef.current.signal,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
          },
        });

        // Add timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), timeout);
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: T = await response.json();

        // Cache the successful response
        try {
          await cacheManager.set(cacheKey, data, {
            maxAge: cacheMaxAge,
            compression,
            persistent,
          });
        } catch (error) {
          console.warn('Failed to cache response:', error);
        }

        setState(prev => ({
          ...prev,
          data,
          isLoading: false,
          isValidating: false,
          error: null,
          isStale: false,
          lastFetched: Date.now(),
        }));

        // Schedule background refresh
        if (backgroundRefresh && !isBackground) {
          const refreshDelay = Math.min(cacheMaxAge * 0.8, 30 * 60 * 1000); // 80% of cache age or 30 min
          backgroundRefreshTimeoutRef.current = setTimeout(() => {
            fetchData(true, true);
          }, refreshDelay);
        }

        return;

      } catch (error) {
        lastError = error as Error;

        // Don't retry on abort
        if (lastError.name === 'AbortError') {
          return;
        }

        // Wait before retry (exponential backoff)
        if (attempt < retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt - 1)));
        }
      }
    }

    // All retries failed
    setState(prev => ({
      ...prev,
      isLoading: false,
      isValidating: false,
      error: lastError,
    }));
  }, [
    url,
    cacheKey,
    cacheMaxAge,
    retryAttempts,
    retryDelay,
    timeout,
    staleWhileRevalidate,
    backgroundRefresh,
    compression,
    persistent,
  ]);

  const refetch = useCallback(async (): Promise<void> => {
    await fetchData(false, true);
  }, [fetchData]);

  const mutate = useCallback((data: T) => {
    setState(prev => ({
      ...prev,
      data,
      isStale: false,
      lastFetched: Date.now(),
    }));

    // Update cache
    cacheManager.set(cacheKey, data, {
      maxAge: cacheMaxAge,
      compression,
      persistent,
    });
  }, [cacheKey, cacheMaxAge, compression, persistent]);

  // Initial fetch
  useEffect(() => {
    if (url) {
      fetchData();
    }

    return () => {
      // Cleanup
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (backgroundRefreshTimeoutRef.current) {
        clearTimeout(backgroundRefreshTimeoutRef.current);
      }
    };
  }, [url, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (backgroundRefreshTimeoutRef.current) {
        clearTimeout(backgroundRefreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    refetch,
    mutate,
  };
}

// Specialized hook for deck data fetching
export function useSmartDeckFetch(deckId: string | null) {
  return useSmartFetch(`/api/decks/${deckId}`, {
    cacheKey: `deck_${deckId}`,
    cacheMaxAge: 15 * 60 * 1000, // 15 minutes
    compression: true,
    persistent: true,
    staleWhileRevalidate: true,
    backgroundRefresh: true,
  });
}

// Hook for batch fetching with intelligent batching
export function useSmartBatchFetch<T>(
  urls: string[],
  options: SmartFetchOptions = {}
) {
  const [batchState, setBatchState] = useState<{
    data: (T | null)[];
    isLoading: boolean;
    errors: (Error | null)[];
  }>({
    data: new Array(urls.length).fill(null),
    isLoading: false,
    errors: new Array(urls.length).fill(null),
  });

  const fetchBatch = useCallback(async () => {
    setBatchState(prev => ({ ...prev, isLoading: true }));

    const promises = urls.map(async (url, index) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        return { index, data, error: null };
      } catch (error) {
        return { index, data: null, error: error as Error };
      }
    });

    const results = await Promise.all(promises);

    setBatchState(prev => {
      const newData = [...prev.data];
      const newErrors = [...prev.errors];

      results.forEach(({ index, data, error }) => {
        newData[index] = data;
        newErrors[index] = error;
      });

      return {
        data: newData,
        isLoading: false,
        errors: newErrors,
      };
    });
  }, [urls]);

  useEffect(() => {
    if (urls.length > 0) {
      fetchBatch();
    }
  }, [urls, fetchBatch]);

  return {
    ...batchState,
    refetch: fetchBatch,
  };
}
```

**Implementation steps:**
1. Create intelligent caching system with compression and persistence
2. Implement smart fetch hook with stale-while-revalidate strategy
3. Build network optimization service with request batching and deduplication
4. Add data compression utilities for large payloads
5. Enhance service worker with advanced caching strategies

**Testing:**
1. Cache performance and hit rate validation
2. Network optimization effectiveness measurement
3. Data compression ratio and performance testing
4. Service worker caching strategy verification

**Commit**: `perf: implement intelligent caching and network optimization`

### Phase 4: Performance Monitoring and Analytics (3 points)
**Files to create/modify:**
- `src/services/performanceMonitor.ts` - Real-time performance monitoring
- `src/components/admin/PerformanceDashboard.tsx` - Performance analytics dashboard
- `src/hooks/usePerformanceMetrics.ts` - Performance metrics collection hook
- `src/utils/performanceReporter.ts` - Performance data reporting service
- `scripts/performance-budget.js` - Performance budget enforcement script

**Real-time Performance Monitor:**
```typescript
// src/services/performanceMonitor.ts
interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url: string;
  userAgent: string;
  sessionId: string;
}

interface NavigationMetrics {
  dns: number;
  tcp: number;
  ssl: number;
  ttfb: number; // Time to First Byte
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  tti: number; // Time to Interactive
}

interface ResourceMetrics {
  name: string;
  type: string;
  size: number;
  duration: number;
  cached: boolean;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private vitalsObserver: PerformanceObserver | null = null;
  private resourceObserver: PerformanceObserver | null = null;
  private isMonitoring = false;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.init();
  }

  private generateSessionId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public init() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.setupVitalsObserver();
    this.setupResourceObserver();
    this.measureNavigationTiming();
    this.setupLongTaskDetection();
    this.setupMemoryMonitoring();
  }

  private setupVitalsObserver() {
    if (!('PerformanceObserver' in window)) return;

    try {
      // Observe Core Web Vitals
      this.vitalsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processVitalMetric(entry);
        }
      });

      // Observe different entry types
      ['largest-contentful-paint', 'first-input', 'layout-shift'].forEach(type => {
        try {
          this.vitalsObserver?.observe({ type, buffered: true });
        } catch (error) {
          console.warn(`Failed to observe ${type}:`, error);
        }
      });
    } catch (error) {
      console.warn('Failed to setup vitals observer:', error);
    }
  }

  private setupResourceObserver() {
    if (!('PerformanceObserver' in window)) return;

    try {
      this.resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processResourceMetric(entry as PerformanceResourceTiming);
        }
      });

      this.resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('Failed to setup resource observer:', error);
    }
  }

  private processVitalMetric(entry: PerformanceEntry) {
    let metricName = '';
    let metricValue = 0;

    switch (entry.entryType) {
      case 'largest-contentful-paint':
        metricName = 'LCP';
        metricValue = entry.startTime;
        break;
      case 'first-input':
        metricName = 'FID';
        metricValue = (entry as any).processingStart - entry.startTime;
        break;
      case 'layout-shift':
        metricName = 'CLS';
        metricValue = (entry as any).value;
        break;
    }

    if (metricName) {
      this.recordMetric(metricName, metricValue);
    }
  }

  private processResourceMetric(entry: PerformanceResourceTiming) {
    const resourceMetric: ResourceMetrics = {
      name: entry.name,
      type: this.getResourceType(entry.name),
      size: entry.transferSize || 0,
      duration: entry.responseEnd - entry.requestStart,
      cached: entry.transferSize === 0 || entry.transferSize < entry.decodedBodySize,
    };

    // Record large or slow resources
    if (resourceMetric.size > 100000 || resourceMetric.duration > 1000) {
      this.recordMetric(`resource_${resourceMetric.type}_size`, resourceMetric.size);
      this.recordMetric(`resource_${resourceMetric.type}_duration`, resourceMetric.duration);
    }
  }

  private getResourceType(name: string): string {
    if (name.includes('.js')) return 'script';
    if (name.includes('.css')) return 'stylesheet';
    if (name.includes('.png') || name.includes('.jpg') || name.includes('.svg')) return 'image';
    if (name.includes('.woff') || name.includes('.ttf')) return 'font';
    if (name.includes('/api/')) return 'api';
    return 'other';
  }

  private measureNavigationTiming() {
    // Wait for page load to complete
    if (document.readyState === 'complete') {
      this.calculateNavigationMetrics();
    } else {
      window.addEventListener('load', () => {
        // Small delay to ensure all metrics are available
        setTimeout(() => this.calculateNavigationMetrics(), 100);
      });
    }
  }

  private calculateNavigationMetrics() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navigation) return;

    const metrics: NavigationMetrics = {
      dns: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcp: navigation.connectEnd - navigation.connectStart,
      ssl: navigation.secureConnectionStart > 0
        ? navigation.connectEnd - navigation.secureConnectionStart
        : 0,
      ttfb: navigation.responseStart - navigation.requestStart,
      fcp: 0, // Will be set by observer
      lcp: 0, // Will be set by observer
      fid: 0, // Will be set by observer
      cls: 0, // Will be set by observer
      tti: this.estimateTimeToInteractive(navigation),
    };

    // Record navigation metrics
    Object.entries(metrics).forEach(([name, value]) => {
      if (value > 0) {
        this.recordMetric(name.toUpperCase(), value);
      }
    });

    // Measure First Contentful Paint
    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
    if (fcpEntry) {
      this.recordMetric('FCP', fcpEntry.startTime);
    }
  }

  private estimateTimeToInteractive(navigation: PerformanceNavigationTiming): number {
    // Simplified TTI calculation
    // In a real implementation, this would be more sophisticated
    return navigation.domContentLoadedEventEnd - navigation.navigationStart;
  }

  private setupLongTaskDetection() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Long task detected (>50ms)
          this.recordMetric('long_task_duration', entry.duration);
          this.recordMetric('long_task_count', 1);

          console.warn('Long task detected:', {
            duration: entry.duration,
            startTime: entry.startTime,
          });
        }
      });

      longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      // Long task API not supported
      console.info('Long task observer not supported');
    }
  }

  private setupMemoryMonitoring() {
    if (!('memory' in performance)) return;

    const measureMemory = () => {
      const memory = (performance as any).memory;
      this.recordMetric('memory_used', memory.usedJSHeapSize);
      this.recordMetric('memory_total', memory.totalJSHeapSize);
      this.recordMetric('memory_limit', memory.jsHeapSizeLimit);
    };

    // Measure memory every 30 seconds
    measureMemory();
    setInterval(measureMemory, 30000);
  }

  private recordMetric(name: string, value: number) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
    };

    this.metrics.push(metric);

    // Keep only recent metrics (last 1000)
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Check performance thresholds
    this.checkThresholds(metric);

    // Send to analytics (if configured)
    this.reportMetric(metric);
  }

  private checkThresholds(metric: PerformanceMetric) {
    const thresholds = {
      FCP: 1800, // 1.8s
      LCP: 2500, // 2.5s
      FID: 100,  // 100ms
      CLS: 0.1,  // 0.1
      TTI: 3800, // 3.8s
      TTFB: 600, // 600ms
    };

    const threshold = thresholds[metric.name as keyof typeof thresholds];
    if (threshold && metric.value > threshold) {
      console.warn(`Performance threshold exceeded: ${metric.name} = ${metric.value} (threshold: ${threshold})`);

      // Could trigger alerts or automated actions here
      this.handleThresholdExceeded(metric, threshold);
    }
  }

  private handleThresholdExceeded(metric: PerformanceMetric, threshold: number) {
    // In a real application, this could:
    // - Send alerts to monitoring systems
    // - Adjust application behavior
    // - Log detailed performance traces
    // - Trigger performance optimization features

    if (metric.name === 'LCP' && metric.value > 4000) {
      // Very slow LCP, enable aggressive optimization mode
      console.log('Enabling aggressive optimization mode due to slow LCP');
    }
  }

  private reportMetric(metric: PerformanceMetric) {
    // In development, just log metrics
    if (process.env.NODE_ENV === 'development') {
      console.debug('Performance metric:', metric);
      return;
    }

    // In production, batch and send to analytics service
    this.batchMetricForReporting(metric);
  }

  private batchMetricForReporting(metric: PerformanceMetric) {
    // Implementation would batch metrics and send periodically
    // to avoid impacting performance with frequent network requests
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public getAverageMetric(name: string): number {
    const relevantMetrics = this.metrics.filter(m => m.name === name);
    if (relevantMetrics.length === 0) return 0;

    return relevantMetrics.reduce((sum, m) => sum + m.value, 0) / relevantMetrics.length;
  }

  public getWebVitalsScore(): {
    fcp: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
    lcp: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
    fid: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
    cls: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
  } {
    const getVitalRating = (value: number, goodThreshold: number, poorThreshold: number) => {
      if (value <= goodThreshold) return 'good';
      if (value <= poorThreshold) return 'needs-improvement';
      return 'poor';
    };

    return {
      fcp: {
        value: this.getAverageMetric('FCP'),
        rating: getVitalRating(this.getAverageMetric('FCP'), 1800, 3000),
      },
      lcp: {
        value: this.getAverageMetric('LCP'),
        rating: getVitalRating(this.getAverageMetric('LCP'), 2500, 4000),
      },
      fid: {
        value: this.getAverageMetric('FID'),
        rating: getVitalRating(this.getAverageMetric('FID'), 100, 300),
      },
      cls: {
        value: this.getAverageMetric('CLS'),
        rating: getVitalRating(this.getAverageMetric('CLS'), 0.1, 0.25),
      },
    };
  }

  public destroy() {
    this.isMonitoring = false;

    if (this.vitalsObserver) {
      this.vitalsObserver.disconnect();
      this.vitalsObserver = null;
    }

    if (this.resourceObserver) {
      this.resourceObserver.disconnect();
      this.resourceObserver = null;
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();
```

**Performance Dashboard Component:**
```typescript
// src/components/admin/PerformanceDashboard.tsx
import { FC, useState, useEffect } from 'react';
import { performanceMonitor } from '@/services/performanceMonitor';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import styles from './PerformanceDashboard.module.css';

interface PerformanceDashboardProps {
  isVisible: boolean;
}

export const PerformanceDashboard: FC<PerformanceDashboardProps> = ({ isVisible }) => {
  const [webVitals, setWebVitals] = useState(performanceMonitor.getWebVitalsScore());
  const [metrics, setMetrics] = useState(performanceMonitor.getMetrics());
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const updateMetrics = () => {
      setWebVitals(performanceMonitor.getWebVitalsScore());
      setMetrics(performanceMonitor.getMetrics());
    };

    updateMetrics();

    if (autoRefresh) {
      const interval = setInterval(updateMetrics, 5000);
      return () => clearInterval(interval);
    }
  }, [isVisible, autoRefresh]);

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good': return '#0CCE6B';
      case 'needs-improvement': return '#FFA400';
      case 'poor': return '#FF4E42';
      default: return '#666';
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === 'ms') {
      return `${value.toFixed(0)}ms`;
    }
    if (unit === 'score') {
      return value.toFixed(3);
    }
    return value.toFixed(0);
  };

  if (!isVisible) return null;

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h2>Performance Dashboard</h2>
        <div className={styles.controls}>
          <Button
            variant={autoRefresh ? 'primary' : 'secondary'}
            size="small"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Stop Auto-refresh' : 'Start Auto-refresh'}
          </Button>
          <Button
            variant="tertiary"
            size="small"
            onClick={() => {
              setWebVitals(performanceMonitor.getWebVitalsScore());
              setMetrics(performanceMonitor.getMetrics());
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className={styles.vitalsGrid}>
        <Card className={styles.vitalCard}>
          <div className={styles.vitalHeader}>
            <h3>First Contentful Paint</h3>
            <div
              className={styles.vitalScore}
              style={{ backgroundColor: getRatingColor(webVitals.fcp.rating) }}
            >
              {webVitals.fcp.rating}
            </div>
          </div>
          <div className={styles.vitalValue}>
            {formatValue(webVitals.fcp.value, 'ms')}
          </div>
          <div className={styles.vitalThreshold}>
            Good: ≤1.8s | Poor: >3.0s
          </div>
        </Card>

        <Card className={styles.vitalCard}>
          <div className={styles.vitalHeader}>
            <h3>Largest Contentful Paint</h3>
            <div
              className={styles.vitalScore}
              style={{ backgroundColor: getRatingColor(webVitals.lcp.rating) }}
            >
              {webVitals.lcp.rating}
            </div>
          </div>
          <div className={styles.vitalValue}>
            {formatValue(webVitals.lcp.value, 'ms')}
          </div>
          <div className={styles.vitalThreshold}>
            Good: ≤2.5s | Poor: >4.0s
          </div>
        </Card>

        <Card className={styles.vitalCard}>
          <div className={styles.vitalHeader}>
            <h3>First Input Delay</h3>
            <div
              className={styles.vitalScore}
              style={{ backgroundColor: getRatingColor(webVitals.fid.rating) }}
            >
              {webVitals.fid.rating}
            </div>
          </div>
          <div className={styles.vitalValue}>
            {formatValue(webVitals.fid.value, 'ms')}
          </div>
          <div className={styles.vitalThreshold}>
            Good: ≤100ms | Poor: >300ms
          </div>
        </Card>

        <Card className={styles.vitalCard}>
          <div className={styles.vitalHeader}>
            <h3>Cumulative Layout Shift</h3>
            <div
              className={styles.vitalScore}
              style={{ backgroundColor: getRatingColor(webVitals.cls.rating) }}
            >
              {webVitals.cls.rating}
            </div>
          </div>
          <div className={styles.vitalValue}>
            {formatValue(webVitals.cls.value, 'score')}
          </div>
          <div className={styles.vitalThreshold}>
            Good: ≤0.1 | Poor: >0.25
          </div>
        </Card>
      </div>

      <Card className={styles.metricsTable}>
        <h3>Recent Metrics</h3>
        <div className={styles.tableContainer}>
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Timestamp</th>
                <th>URL</th>
              </tr>
            </thead>
            <tbody>
              {metrics.slice(-20).reverse().map((metric, index) => (
                <tr key={`${metric.timestamp}-${index}`}>
                  <td>{metric.name}</td>
                  <td>
                    {metric.name.includes('duration') || metric.name.includes('time')
                      ? formatValue(metric.value, 'ms')
                      : formatValue(metric.value, '')}
                  </td>
                  <td>
                    {new Date(metric.timestamp).toLocaleTimeString()}
                  </td>
                  <td>
                    {new URL(metric.url).pathname}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className={styles.actions}>
        <Button
          variant="secondary"
          onClick={() => {
            const data = JSON.stringify(metrics, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `performance-metrics-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export Metrics
        </Button>

        <Button
          variant="tertiary"
          onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(webVitals, null, 2));
          }}
        >
          Copy Web Vitals
        </Button>
      </div>
    </div>
  );
};

// Development-only performance overlay
export const PerformanceOverlay: FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+Shift+P to toggle performance overlay
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(prev => !prev);
      }
    };

    if (process.env.NODE_ENV === 'development') {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {isVisible && (
        <div className={styles.overlay}>
          <PerformanceDashboard isVisible={isVisible} />
          <Button
            className={styles.closeButton}
            variant="tertiary"
            size="small"
            onClick={() => setIsVisible(false)}
          >
            ✕
          </Button>
        </div>
      )}

      {!isVisible && (
        <div className={styles.trigger}>
          <Button
            variant="tertiary"
            size="small"
            onClick={() => setIsVisible(true)}
            title="Show Performance Dashboard (Ctrl+Shift+P)"
          >
            📊
          </Button>
        </div>
      )}
    </>
  );
};
```

**Implementation steps:**
1. Create real-time performance monitoring with Core Web Vitals tracking
2. Build performance analytics dashboard for development and debugging
3. Implement performance metrics collection hooks for components
4. Add performance data reporting service for production analytics
5. Create performance budget enforcement script for CI/CD

**Testing:**
1. Performance monitoring accuracy and overhead measurement
2. Dashboard functionality and real-time updates validation
3. Performance budget enforcement testing
4. Cross-browser performance metrics compatibility

**Commit**: `perf: implement comprehensive performance monitoring and analytics`

## Testing Strategy

### Unit Tests
- Bundle optimization and lazy loading functionality
- Performance optimization hook behavior
- Caching system accuracy and eviction policies
- Performance monitoring metric collection

### Component Tests
```typescript
describe('Performance Optimizations', () => {
  it('should load components lazily without blocking', async () => {
    const { getByTestId } = render(<LazyComponentWrapper />);

    expect(getByTestId('loading-indicator')).toBeInTheDocument();

    await waitFor(() => {
      expect(getByTestId('lazy-component')).toBeInTheDocument();
    });
  });

  it('should cache fetch results correctly', async () => {
    const fetchSpy = jest.spyOn(window, 'fetch');
    const { result } = renderHook(() => useSmartFetch('/api/test'));

    await waitFor(() => {
      expect(result.current.data).toBeTruthy();
    });

    // Second call should use cache
    const { result: result2 } = renderHook(() => useSmartFetch('/api/test'));

    expect(fetchSpy).toHaveBeenCalledTimes(1); // Only one actual fetch
  });
});
```

### Performance Tests
- Bundle size analysis and chunking effectiveness
- Runtime performance benchmarking
- Memory usage monitoring and leak detection
- Network optimization and caching validation

### Integration Tests
- Complete performance optimization workflow
- Cross-component performance impact assessment
- End-to-end performance measurement
- Real-world performance scenario testing

## Platform-Specific Considerations

### Web Desktop
- Multi-core CPU utilization for heavy computations
- Large memory capacity optimization strategies
- High-resolution display optimizations
- Advanced caching strategies for faster subsequent loads

### Web Mobile
- Battery-conscious performance optimizations
- Network-aware loading strategies (WiFi vs cellular)
- Memory-constrained environment optimizations
- Touch performance and responsiveness optimization

### PWA Features
- Intelligent service worker caching strategies
- Offline performance optimization
- Background processing and sync optimization
- Install and update performance optimization

## Documentation Updates Required
1. `README.md` - Add performance optimization guide
2. `docs/performance.md` - Comprehensive performance documentation
3. `docs/caching.md` - Caching strategy and configuration guide
4. In-code documentation: JSDoc comments for all performance utilities

## Success Criteria
1. **Bundle Size**: 40% reduction in initial bundle size, <150KB gzipped
2. **Load Performance**: FCP <1.2s, LCP <2.5s, TTI <2.5s on 3G networks
3. **Runtime Performance**: 60 FPS for all interactions, <16ms render times
4. **Memory Usage**: <100MB baseline, <200MB peak, zero memory leaks
5. **Network Efficiency**: 90% cache hit rate, <10 requests for initial load
6. **Monitoring Coverage**: 100% performance metric collection, real-time alerting
7. **User Experience**: Perceived performance improvements in user testing

## Dependencies
- **Build Tools**: Vite with advanced optimization plugins
- **Compression**: CompressionStream API (modern browsers)
- **Monitoring**: PerformanceObserver API
- **Storage**: IndexedDB for advanced caching
- **Analysis**: Bundle analyzer and performance profiling tools

## Risks & Mitigations
1. **Risk**: Over-optimization could increase complexity
   **Mitigation**: Systematic approach, measure before and after, maintain code clarity
2. **Risk**: Caching could cause stale data issues
   **Mitigation**: Smart cache invalidation, version-aware caching, fallback strategies
3. **Risk**: Performance monitoring could impact performance
   **Mitigation**: Minimal overhead design, async processing, configurable monitoring
4. **Risk**: Browser compatibility issues with advanced APIs
   **Mitigation**: Progressive enhancement, feature detection, graceful fallbacks

## Accessibility Requirements
- Performance optimizations must not impact accessibility features
- Screen reader performance maintained during optimizations
- Keyboard navigation responsiveness preserved
- High contrast mode performance maintained

## Performance Metrics

### Target Performance Budgets
- **JavaScript Bundle**: <150KB initial, <500KB total gzipped
- **CSS Bundle**: <50KB initial, <100KB total gzipped
- **Images**: <1MB total, WebP format preferred
- **Fonts**: <100KB total, subset and optimized
- **API Responses**: <50KB average, compression enabled

### Core Web Vitals Targets
- **First Contentful Paint**: <1.2s (mobile), <0.8s (desktop)
- **Largest Contentful Paint**: <2.5s (mobile), <1.8s (desktop)
- **First Input Delay**: <100ms (all devices)
- **Cumulative Layout Shift**: <0.1 (all content)

## Release & Deployment Guide

### Performance Testing Checklist
- [ ] Bundle size analysis shows expected reductions
- [ ] Lighthouse audit scores >90 for all metrics
- [ ] Real device testing on slow networks (3G)
- [ ] Memory profiling shows no leaks
- [ ] Cache effectiveness validated with realistic usage
- [ ] Performance monitoring accuracy verified
- [ ] Cross-browser performance consistency confirmed

### Rollout Strategy
1. **Phase 1**: Bundle optimization and lazy loading
2. **Phase 2**: Runtime performance improvements
3. **Phase 3**: Advanced caching and network optimization
4. **Phase 4**: Monitoring and continuous optimization

### Rollback Strategy
- Bundle optimizations can be reverted via build configuration
- Runtime optimizations can be disabled via feature flags
- Caching can fall back to browser defaults
- Monitoring can be reduced or disabled for emergencies