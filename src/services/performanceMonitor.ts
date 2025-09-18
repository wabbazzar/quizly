/**
 * Performance monitoring service for Web Vitals and custom metrics
 * Implements Core Web Vitals tracking without external dependencies
 */

import React from 'react';

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  id?: string;
  navigationType?: string;
}

export interface WebVitalsData {
  fcp?: PerformanceMetric; // First Contentful Paint
  lcp?: PerformanceMetric; // Largest Contentful Paint
  fid?: PerformanceMetric; // First Input Delay
  cls?: PerformanceMetric; // Cumulative Layout Shift
  ttfb?: PerformanceMetric; // Time to First Byte
  inp?: PerformanceMetric; // Interaction to Next Paint
}

export interface CustomMetrics {
  bundleSize?: number;
  memoryUsage?: PerformanceMetric;
  lazyLoadTime?: PerformanceMetric;
  routeChangeTime?: PerformanceMetric;
  deckLoadTime?: PerformanceMetric;
}

// type MetricCallback = (metric: PerformanceMetric) => void;
type PerformanceEventCallback = (data: { metrics: WebVitalsData; custom: CustomMetrics }) => void;

class PerformanceMonitor {
  private metrics: WebVitalsData = {};
  private customMetrics: CustomMetrics = {};
  private callbacks: Set<PerformanceEventCallback> = new Set();
  private observer?: PerformanceObserver;
  private layoutShiftScore = 0;
  private firstInputDelay = 0;
  private isInitialized = false;

  // Web Vitals thresholds
  private thresholds = {
    fcp: { good: 1800, poor: 3000 }, // ms
    lcp: { good: 2500, poor: 4000 }, // ms
    fid: { good: 100, poor: 300 }, // ms
    cls: { good: 0.1, poor: 0.25 }, // score
    ttfb: { good: 800, poor: 1800 }, // ms
    inp: { good: 200, poor: 500 }, // ms
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init(): void {
    if (this.isInitialized) return;

    try {
      // Initialize performance monitoring
      this.setupPerformanceObserver();
      this.measureInitialMetrics();
      this.setupUnloadHandler();
      this.isInitialized = true;

      console.log('Performance monitoring initialized');
    } catch (error) {
      console.warn('Failed to initialize performance monitoring:', error);
    }
  }

  private setupPerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    this.observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        this.handlePerformanceEntry(entry);
      }
    });

    try {
      // Observe different types of performance entries
      this.observer.observe({ entryTypes: ['paint', 'layout-shift', 'largest-contentful-paint'] });

      // First Input Delay (if supported)
      if ('PerformanceEventTiming' in window) {
        this.observer.observe({ entryTypes: ['first-input'] });
      }

      // Navigation timing
      this.observer.observe({ entryTypes: ['navigation'] });
    } catch (error) {
      console.warn('Error setting up performance observer:', error);
    }
  }

  private handlePerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric('fcp', entry.startTime);
        }
        break;

      case 'largest-contentful-paint':
        this.recordMetric('lcp', entry.startTime);
        break;

      case 'layout-shift':
        if (!(entry as any).hadRecentInput) {
          this.layoutShiftScore += (entry as any).value;
          this.recordMetric('cls', this.layoutShiftScore);
        }
        break;

      case 'first-input':
        this.firstInputDelay = (entry as any).processingStart - entry.startTime;
        this.recordMetric('fid', this.firstInputDelay);
        break;

      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming;
        const ttfb = navEntry.responseStart - navEntry.requestStart;
        this.recordMetric('ttfb', ttfb);
        break;
    }
  }

  private recordMetric(name: keyof WebVitalsData, value: number): void {
    const threshold = this.thresholds[name];
    let rating: 'good' | 'needs-improvement' | 'poor' = 'good';

    if (threshold) {
      if (value > threshold.poor) {
        rating = 'poor';
      } else if (value > threshold.good) {
        rating = 'needs-improvement';
      }
    }

    const metric: PerformanceMetric = {
      name,
      value,
      rating,
      timestamp: Date.now(),
      id: this.generateMetricId(),
      navigationType: this.getNavigationType(),
    };

    this.metrics[name] = metric;
    this.notifyCallbacks();

    // Log performance issues
    if (rating === 'poor') {
      console.warn(`Poor ${name.toUpperCase()} performance:`, value);
    }
  }

  private measureInitialMetrics(): void {
    // Measure initial bundle size
    if ('performance' in window && performance.getEntriesByType) {
      const navigationEntry = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;

      if (navigationEntry) {
        // Time to First Byte
        const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
        this.recordMetric('ttfb', ttfb);
      }

      // Get resource entries for bundle size calculation
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      let totalJSSize = 0;

      resources.forEach(resource => {
        if (resource.name.includes('.js') && resource.transferSize) {
          totalJSSize += resource.transferSize;
        }
      });

      if (totalJSSize > 0) {
        this.customMetrics.bundleSize = totalJSSize;
      }
    }

    // Measure memory usage (if available)
    this.measureMemoryUsage();
  }

  private measureMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsage = {
        name: 'memory-usage',
        value: memory.usedJSHeapSize / 1024 / 1024, // Convert to MB
        rating:
          memory.usedJSHeapSize > 200 * 1024 * 1024
            ? 'poor'
            : memory.usedJSHeapSize > 100 * 1024 * 1024
              ? 'needs-improvement'
              : 'good',
        timestamp: Date.now(),
      } as PerformanceMetric;

      this.customMetrics.memoryUsage = memoryUsage;
    }
  }

  private setupUnloadHandler(): void {
    // Send metrics before page unload
    window.addEventListener('beforeunload', () => {
      this.sendMetrics();
    });

    // Also send on visibility change (for mobile)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sendMetrics();
      }
    });
  }

  private getNavigationType(): string {
    if ('navigation' in performance) {
      const nav = performance.navigation;
      switch (nav.type) {
        case nav.TYPE_RELOAD:
          return 'reload';
        case nav.TYPE_BACK_FORWARD:
          return 'back-forward';
        default:
          return 'navigate';
      }
    }
    return 'unknown';
  }

  private generateMetricId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private notifyCallbacks(): void {
    const data = {
      metrics: { ...this.metrics },
      custom: { ...this.customMetrics },
    };

    this.callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in performance callback:', error);
      }
    });
  }

  // Public API
  public subscribe(callback: PerformanceEventCallback): () => void {
    this.callbacks.add(callback);

    // Send current metrics immediately
    if (Object.keys(this.metrics).length > 0 || Object.keys(this.customMetrics).length > 0) {
      callback({
        metrics: { ...this.metrics },
        custom: { ...this.customMetrics },
      });
    }

    return () => {
      this.callbacks.delete(callback);
    };
  }

  public getMetrics(): { metrics: WebVitalsData; custom: CustomMetrics } {
    return {
      metrics: { ...this.metrics },
      custom: { ...this.customMetrics },
    };
  }

  public measureCustom(name: keyof CustomMetrics, value: number, _category?: string): void {
    const metric: PerformanceMetric = {
      name,
      value,
      rating: 'good', // Custom metrics use manual rating
      timestamp: Date.now(),
    };

    this.customMetrics[name] = metric as any;
    this.notifyCallbacks();

    // Mark for debugging
    if (performance.mark) {
      performance.mark(`custom-${name}-${value}`);
    }
  }

  public measureRouteChange(routeName: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.measureCustom('routeChangeTime', duration);

      if (performance.mark) {
        performance.mark(`route-change-${routeName}-${duration.toFixed(2)}ms`);
      }
    };
  }

  public measureDeckLoad(deckId: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.measureCustom('deckLoadTime', duration);

      if (performance.mark) {
        performance.mark(`deck-load-${deckId}-${duration.toFixed(2)}ms`);
      }
    };
  }

  public measureLazyLoad(componentName: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.measureCustom('lazyLoadTime', duration);

      if (performance.mark) {
        performance.mark(`lazy-load-${componentName}-${duration.toFixed(2)}ms`);
      }
    };
  }

  private sendMetrics(): void {
    // In a real app, send to analytics service
    // For now, just log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('Performance Metrics');
      console.table(this.metrics);
      console.table(this.customMetrics);
      console.groupEnd();
    }

    // Could send to analytics service here
    // analytics.track('performance-metrics', this.getMetrics());
  }

  public generateReport(): {
    summary: string;
    score: number;
    recommendations: string[];
  } {
    const { metrics, custom } = this.getMetrics();
    let score = 100;
    const recommendations: string[] = [];

    // Calculate score based on Core Web Vitals
    Object.entries(metrics).forEach(([key, metric]) => {
      if (metric) {
        switch (metric.rating) {
          case 'poor':
            score -= 20;
            recommendations.push(
              `Improve ${key.toUpperCase()}: Current ${metric.value.toFixed(2)}ms`
            );
            break;
          case 'needs-improvement':
            score -= 10;
            recommendations.push(
              `Monitor ${key.toUpperCase()}: Current ${metric.value.toFixed(2)}ms`
            );
            break;
        }
      }
    });

    // Check bundle size
    if (custom.bundleSize && custom.bundleSize > 200 * 1024) {
      // 200KB
      score -= 15;
      recommendations.push(`Large bundle size: ${(custom.bundleSize / 1024).toFixed(2)}KB`);
    }

    // Check memory usage
    if (custom.memoryUsage && custom.memoryUsage.rating === 'poor') {
      score -= 10;
      recommendations.push(`High memory usage: ${custom.memoryUsage.value.toFixed(2)}MB`);
    }

    const summary =
      score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Needs Improvement' : 'Poor';

    return {
      summary,
      score: Math.max(0, score),
      recommendations,
    };
  }

  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.callbacks.clear();
    this.isInitialized = false;
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Hook for React components
export function usePerformanceMonitor() {
  const [data, setData] = React.useState<{ metrics: WebVitalsData; custom: CustomMetrics }>({
    metrics: {},
    custom: {},
  });

  React.useEffect(() => {
    const unsubscribe = performanceMonitor.subscribe(setData);
    return unsubscribe;
  }, []);

  return {
    ...data,
    measureRouteChange: performanceMonitor.measureRouteChange.bind(performanceMonitor),
    measureDeckLoad: performanceMonitor.measureDeckLoad.bind(performanceMonitor),
    measureLazyLoad: performanceMonitor.measureLazyLoad.bind(performanceMonitor),
    generateReport: performanceMonitor.generateReport.bind(performanceMonitor),
  };
}

// Export for manual usage
export default performanceMonitor;
