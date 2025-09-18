/**
 * Bundle analysis and monitoring service
 * Tracks bundle sizes, chunk loading, and optimization opportunities
 */

import React from 'react';
import { performanceMonitor } from './performanceMonitor';

export interface BundleInfo {
  name: string;
  size: number;
  gzipSize?: number;
  loadTime?: number;
  type: 'initial' | 'async' | 'vendor';
  cached: boolean;
}

export interface BundleAnalysis {
  totalSize: number;
  gzipSize: number;
  chunkCount: number;
  initialChunks: BundleInfo[];
  asyncChunks: BundleInfo[];
  vendorChunks: BundleInfo[];
  loadTimes: {
    fastest: number;
    slowest: number;
    average: number;
  };
  cacheHitRate: number;
  recommendations: string[];
}

class BundleAnalyzer {
  private bundles = new Map<string, BundleInfo>();
  private loadStartTimes = new Map<string, number>();
  private observer?: PerformanceObserver;
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init(): void {
    if (this.isInitialized) return;

    try {
      this.setupResourceObserver();
      this.analyzeInitialResources();
      this.setupNetworkMonitoring();
      this.isInitialized = true;

      console.log('Bundle analyzer initialized');
    } catch (error) {
      console.warn('Failed to initialize bundle analyzer:', error);
    }
  }

  private setupResourceObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    this.observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          this.analyzeResource(entry as PerformanceResourceTiming);
        }
      }
    });

    try {
      this.observer.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('Error setting up resource observer:', error);
    }
  }

  private analyzeResource(entry: PerformanceResourceTiming): void {
    // Only analyze JavaScript bundles
    if (!entry.name.includes('.js') || entry.name.includes('node_modules')) {
      return;
    }

    const url = new URL(entry.name);
    const filename = url.pathname.split('/').pop() || 'unknown';

    // Determine bundle type
    let type: 'initial' | 'async' | 'vendor' = 'async';
    if (filename.includes('vendor') || filename.includes('react') || filename.includes('router')) {
      type = 'vendor';
    } else if (filename.includes('index') || filename === 'main.js') {
      type = 'initial';
    }

    // Check if resource was cached
    const cached = entry.transferSize === 0 && entry.decodedBodySize > 0;

    const bundleInfo: BundleInfo = {
      name: filename,
      size: entry.decodedBodySize || entry.transferSize || 0,
      gzipSize: entry.transferSize || 0,
      loadTime: entry.responseEnd - entry.startTime,
      type,
      cached,
    };

    this.bundles.set(filename, bundleInfo);

    // Track bundle loading performance
    if (bundleInfo.loadTime && bundleInfo.loadTime > 1000) {
      console.warn(`Slow bundle load: ${filename} took ${bundleInfo.loadTime.toFixed(2)}ms`);
    }

    // Send to performance monitor
    performanceMonitor.measureCustom('bundleSize', bundleInfo.size);
  }

  private analyzeInitialResources(): void {
    if (!('performance' in window) || !performance.getEntriesByType) return;

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    resources.forEach(resource => {
      if (resource.name.includes('.js')) {
        this.analyzeResource(resource);
      }
    });
  }

  private setupNetworkMonitoring(): void {
    // Monitor chunk loading via module system
    if ('module' in window) {
      this.interceptModuleLoading();
    }

    // Monitor dynamic imports
    this.interceptDynamicImports();
  }

  private interceptModuleLoading(): void {
    // Override import() to track dynamic chunk loading
    const originalImport = window.eval('import');

    if (typeof originalImport === 'function') {
      window.eval(
        'import = function(specifier) {' +
          'const startTime = performance.now();' +
          'return originalImport(specifier).then(module => {' +
          'const loadTime = performance.now() - startTime;' +
          'window.__bundleAnalyzer?.trackChunkLoad(specifier, loadTime);' +
          'return module;' +
          '});' +
          '}'
      );
    }

    // Make analyzer available globally for tracking
    (window as any).__bundleAnalyzer = this;
  }

  private interceptDynamicImports(): void {
    // Track dynamic imports through React.lazy
    const originalLazy = React.lazy;

    if (originalLazy) {
      React.lazy = function <T extends React.ComponentType<any>>(
        factory: () => Promise<{ default: T }>
      ) {
        const trackedFactory = () => {
          const startTime = performance.now();
          return factory().then(module => {
            const loadTime = performance.now() - startTime;
            performanceMonitor.measureCustom('lazyLoadTime', loadTime);
            return module;
          });
        };
        return originalLazy(trackedFactory as () => Promise<{ default: T }>);
      } as typeof React.lazy;
    }
  }

  public trackChunkLoad(specifier: string, loadTime: number): void {
    const chunkName = specifier.split('/').pop() || specifier;

    if (performance.mark) {
      performance.mark(`chunk-load-${chunkName}-${loadTime.toFixed(2)}ms`);
    }

    // Update bundle info if exists
    const existing = this.bundles.get(chunkName);
    if (existing) {
      existing.loadTime = loadTime;
    }
  }

  public getBundleAnalysis(): BundleAnalysis {
    const bundles = Array.from(this.bundles.values());

    const initialChunks = bundles.filter(b => b.type === 'initial');
    const asyncChunks = bundles.filter(b => b.type === 'async');
    const vendorChunks = bundles.filter(b => b.type === 'vendor');

    const totalSize = bundles.reduce((sum, b) => sum + b.size, 0);
    const gzipSize = bundles.reduce((sum, b) => sum + (b.gzipSize || 0), 0);

    const loadTimes = bundles.map(b => b.loadTime || 0).filter(t => t > 0);

    const cacheHits = bundles.filter(b => b.cached).length;
    const cacheHitRate = bundles.length > 0 ? (cacheHits / bundles.length) * 100 : 0;

    const recommendations = this.generateRecommendations(bundles, totalSize, gzipSize);

    return {
      totalSize,
      gzipSize,
      chunkCount: bundles.length,
      initialChunks,
      asyncChunks,
      vendorChunks,
      loadTimes: {
        fastest: Math.min(...loadTimes) || 0,
        slowest: Math.max(...loadTimes) || 0,
        average:
          loadTimes.length > 0 ? loadTimes.reduce((sum, t) => sum + t, 0) / loadTimes.length : 0,
      },
      cacheHitRate,
      recommendations,
    };
  }

  private generateRecommendations(
    bundles: BundleInfo[],
    totalSize: number,
    gzipSize: number
  ): string[] {
    const recommendations: string[] = [];

    // Bundle size recommendations
    if (gzipSize > 200 * 1024) {
      // 200KB gzipped
      recommendations.push('Total bundle size exceeds 200KB gzipped - consider code splitting');
    }

    if (totalSize > 1024 * 1024) {
      // 1MB raw
      recommendations.push('Large bundle size detected - implement aggressive lazy loading');
    }

    // Chunk analysis
    const largeChunks = bundles.filter(b => b.size > 100 * 1024); // 100KB
    if (largeChunks.length > 0) {
      recommendations.push(
        `${largeChunks.length} chunks exceed 100KB - consider further splitting`
      );
    }

    // Load time analysis
    const slowChunks = bundles.filter(b => (b.loadTime || 0) > 2000); // 2s
    if (slowChunks.length > 0) {
      recommendations.push(
        `${slowChunks.length} chunks have slow load times - optimize network delivery`
      );
    }

    // Cache analysis
    const uncachedChunks = bundles.filter(b => !b.cached);
    if (uncachedChunks.length > bundles.length * 0.5) {
      recommendations.push('Low cache hit rate - improve caching strategy');
    }

    // Vendor chunk analysis
    const vendorSize = bundles.filter(b => b.type === 'vendor').reduce((sum, b) => sum + b.size, 0);

    if (vendorSize > 150 * 1024) {
      // 150KB
      recommendations.push('Large vendor bundle - consider splitting vendor dependencies');
    }

    // Initial chunk analysis
    const initialSize = bundles
      .filter(b => b.type === 'initial')
      .reduce((sum, b) => sum + b.size, 0);

    if (initialSize > 100 * 1024) {
      // 100KB
      recommendations.push('Large initial bundle - move non-critical code to async chunks');
    }

    return recommendations;
  }

  public getTopChunks(count = 10): BundleInfo[] {
    return Array.from(this.bundles.values())
      .sort((a, b) => b.size - a.size)
      .slice(0, count);
  }

  public getSlowestChunks(count = 5): BundleInfo[] {
    return Array.from(this.bundles.values())
      .filter(b => b.loadTime && b.loadTime > 0)
      .sort((a, b) => (b.loadTime || 0) - (a.loadTime || 0))
      .slice(0, count);
  }

  public generateReport(): {
    summary: string;
    score: number;
    details: BundleAnalysis;
    suggestions: string[];
  } {
    const analysis = this.getBundleAnalysis();
    let score = 100;

    // Score based on bundle size
    if (analysis.gzipSize > 200 * 1024) score -= 20;
    else if (analysis.gzipSize > 150 * 1024) score -= 10;

    // Score based on load times
    if (analysis.loadTimes.average > 2000) score -= 15;
    else if (analysis.loadTimes.average > 1000) score -= 8;

    // Score based on cache hit rate
    if (analysis.cacheHitRate < 50) score -= 10;
    else if (analysis.cacheHitRate < 75) score -= 5;

    // Score based on chunk count
    if (analysis.chunkCount > 20) score -= 5;

    const summary =
      score >= 90
        ? 'Excellent bundle optimization'
        : score >= 75
          ? 'Good bundle performance'
          : score >= 60
            ? 'Bundle needs optimization'
            : 'Poor bundle performance';

    return {
      summary,
      score: Math.max(0, score),
      details: analysis,
      suggestions: analysis.recommendations,
    };
  }

  public clear(): void {
    this.bundles.clear();
    this.loadStartTimes.clear();
  }

  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.clear();
    this.isInitialized = false;
  }
}

// Singleton instance
export const bundleAnalyzer = new BundleAnalyzer();

// React hook for bundle analysis
export function useBundleAnalyzer() {
  const [analysis, setAnalysis] = React.useState<BundleAnalysis | null>(null);

  React.useEffect(() => {
    const updateAnalysis = () => {
      setAnalysis(bundleAnalyzer.getBundleAnalysis());
    };

    // Initial analysis
    updateAnalysis();

    // Update periodically
    const interval = setInterval(updateAnalysis, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    analysis,
    getReport: bundleAnalyzer.generateReport.bind(bundleAnalyzer),
    getTopChunks: bundleAnalyzer.getTopChunks.bind(bundleAnalyzer),
    getSlowestChunks: bundleAnalyzer.getSlowestChunks.bind(bundleAnalyzer),
  };
}

export default bundleAnalyzer;
