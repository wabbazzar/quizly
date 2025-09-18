/**
 * CI Cache Optimization Script
 * Provides intelligent caching strategies for GitHub Actions CI pipeline
 */

import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

class CacheOptimizer {
  constructor() {
    this.cacheKeys = new Map();
    this.cacheHits = new Map();
    this.metrics = {
      totalOperations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      timeSaved: 0,
    };
  }

  /**
   * Generate a stable cache key based on file contents
   * @param {string[]} files - Array of file paths to include in hash
   * @param {string} prefix - Cache key prefix
   * @returns {string} Generated cache key
   */
  generateCacheKey(files, prefix = 'cache') {
    const hashes = files
      .map(file => {
        const fullPath = path.resolve(projectRoot, file);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          return crypto.createHash('sha256').update(content).digest('hex');
        }
        return '';
      })
      .filter(Boolean);

    if (hashes.length === 0) {
      console.warn(`⚠️  No valid files found for cache key generation: ${files.join(', ')}`);
      return `${prefix}-${Date.now()}`;
    }

    const combinedHash = crypto
      .createHash('sha256')
      .update(hashes.join(''))
      .digest('hex')
      .substring(0, 12);

    const osPrefix = process.env.RUNNER_OS || 'unknown';
    const cacheVersion = process.env.CACHE_VERSION || 'v1';

    return `${prefix}-${osPrefix}-${cacheVersion}-${combinedHash}`;
  }

  /**
   * Generate cache key for node_modules
   * @returns {string} Node modules cache key
   */
  generateNodeModulesKey() {
    const files = ['package.json', 'package-lock.json'];
    return this.generateCacheKey(files, 'node-modules');
  }

  /**
   * Generate cache key for build artifacts
   * @returns {string} Build cache key
   */
  generateBuildKey() {
    const files = [
      'package.json',
      'vite.config.ts',
      'tsconfig.json',
      '.eslintrc.js',
      'src/main.tsx',
      'index.html',
    ];
    return this.generateCacheKey(files, 'build-cache');
  }

  /**
   * Generate cache key for TypeScript compilation
   * @returns {string} TypeScript cache key
   */
  generateTypeScriptKey() {
    const files = ['tsconfig.json', 'package.json'];

    // Include TypeScript source files hash
    const srcFiles = this.getSourceFiles(['src/**/*.ts', 'src/**/*.tsx']);
    return this.generateCacheKey([...files, ...srcFiles], 'typescript');
  }

  /**
   * Generate cache key for ESLint results
   * @returns {string} ESLint cache key
   */
  generateESLintKey() {
    const files = ['.eslintrc.js', 'package.json'];

    const srcFiles = this.getSourceFiles([
      'src/**/*.ts',
      'src/**/*.tsx',
      'src/**/*.js',
      'src/**/*.jsx',
    ]);
    return this.generateCacheKey([...files, ...srcFiles], 'eslint');
  }

  /**
   * Generate cache key for Playwright browsers
   * @returns {string} Playwright cache key
   */
  generatePlaywrightKey() {
    const files = ['package.json', 'playwright.config.ts'];
    return this.generateCacheKey(files, 'playwright');
  }

  /**
   * Get source files for caching (simplified for demo)
   * @param {string[]} patterns - Glob patterns
   * @returns {string[]} Array of file paths
   */
  getSourceFiles(patterns) {
    // Simplified: just return main entry points for demo
    // In production, you'd use a proper glob library
    return ['src/main.tsx', 'src/App.tsx', 'src/types/index.ts'].filter(file =>
      fs.existsSync(path.resolve(projectRoot, file))
    );
  }

  /**
   * Generate comprehensive caching strategy
   * @returns {Object} Complete cache configuration
   */
  optimizeCacheStrategy() {
    const strategy = {
      nodeModules: {
        key: this.generateNodeModulesKey(),
        paths: ['~/.npm', 'node_modules'],
        restoreKeys: [
          `node-modules-${process.env.RUNNER_OS || 'unknown'}-${process.env.CACHE_VERSION || 'v1'}-`,
        ],
        description: 'Node.js dependencies cache',
      },
      build: {
        key: this.generateBuildKey(),
        paths: ['dist', '.vite', 'node_modules/.vite'],
        restoreKeys: [
          `build-cache-${process.env.RUNNER_OS || 'unknown'}-${process.env.CACHE_VERSION || 'v1'}-`,
        ],
        description: 'Build artifacts and Vite cache',
      },
      typescript: {
        key: this.generateTypeScriptKey(),
        paths: ['.tsbuildinfo', 'dist/**/*.d.ts'],
        restoreKeys: [
          `typescript-${process.env.RUNNER_OS || 'unknown'}-${process.env.CACHE_VERSION || 'v1'}-`,
        ],
        description: 'TypeScript compilation cache',
      },
      eslint: {
        key: this.generateESLintKey(),
        paths: ['.eslintcache'],
        restoreKeys: [
          `eslint-${process.env.RUNNER_OS || 'unknown'}-${process.env.CACHE_VERSION || 'v1'}-`,
        ],
        description: 'ESLint results cache',
      },
      playwright: {
        key: this.generatePlaywrightKey(),
        paths: ['~/.cache/ms-playwright'],
        restoreKeys: [
          `playwright-${process.env.RUNNER_OS || 'unknown'}-${process.env.CACHE_VERSION || 'v1'}-`,
        ],
        description: 'Playwright browser binaries',
      },
    };

    // Store cache keys for efficiency tracking
    Object.entries(strategy).forEach(([name, config]) => {
      this.cacheKeys.set(name, config.key);
    });

    return strategy;
  }

  /**
   * Calculate cache efficiency metrics
   * @returns {Object} Cache performance metrics
   */
  calculateCacheEfficiency() {
    const totalOperations = this.cacheKeys.size;
    const cacheHitCount = Array.from(this.cacheHits.values()).reduce((sum, hits) => sum + hits, 0);

    const efficiency = totalOperations > 0 ? (cacheHitCount / totalOperations) * 100 : 0;

    return {
      efficiency: Math.round(efficiency * 100) / 100,
      totalOperations,
      cacheHits: cacheHitCount,
      cacheMisses: totalOperations - cacheHitCount,
      estimatedTimeSaved: cacheHitCount * 60, // Estimate 60 seconds saved per cache hit
    };
  }

  /**
   * Generate cache warming suggestions
   * @returns {Object} Cache warming recommendations
   */
  generateCacheWarmingStrategy() {
    return {
      dependencies: {
        trigger: 'package.json or package-lock.json changes',
        action: 'Warm node_modules cache after successful installs',
        frequency: 'On dependency changes',
      },
      build: {
        trigger: 'Source code or configuration changes',
        action: 'Cache build artifacts after successful builds',
        frequency: 'On each successful build',
      },
      typescript: {
        trigger: 'TypeScript source changes',
        action: 'Cache .tsbuildinfo and type definitions',
        frequency: 'On TypeScript compilation',
      },
      browsers: {
        trigger: 'Playwright version changes',
        action: 'Cache browser binaries after installation',
        frequency: 'On Playwright updates',
      },
    };
  }

  /**
   * Report cache performance metrics
   */
  reportCacheMetrics() {
    const efficiency = this.calculateCacheEfficiency();

    console.log('\n📊 Cache Performance Metrics:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Efficiency: ${efficiency.efficiency}%`);
    console.log(`   Cache Hits: ${efficiency.cacheHits}/${efficiency.totalOperations}`);
    console.log(`   Cache Misses: ${efficiency.cacheMisses}`);
    console.log(`   Estimated Time Saved: ${efficiency.estimatedTimeSaved}s`);

    if (efficiency.efficiency < 60) {
      console.warn('\n⚠️  Cache efficiency is below 60%. Consider optimizing cache keys.');
      console.log('💡 Suggestions:');
      console.log('   - Review file patterns in cache key generation');
      console.log('   - Ensure cache keys are stable across runs');
      console.log('   - Check for unnecessary cache invalidation');
    } else if (efficiency.efficiency > 80) {
      console.log('\n✅ Excellent cache performance! Pipeline should be fast.');
    }

    return efficiency;
  }

  /**
   * Generate GitHub Actions cache matrix
   * @returns {Object} Cache configuration for GitHub Actions
   */
  generateActionsMatrix() {
    const strategy = this.optimizeCacheStrategy();

    const matrix = Object.entries(strategy).map(([name, config]) => ({
      name,
      key: config.key,
      paths: config.paths.join('\n'),
      restoreKeys: config.restoreKeys.join('\n'),
      description: config.description,
    }));

    return {
      strategy,
      matrix,
      include: matrix,
    };
  }

  /**
   * Simulate cache hit/miss for testing
   * @param {string} cacheName - Name of cache to simulate
   * @param {boolean} isHit - Whether to simulate hit or miss
   */
  simulateCacheOperation(cacheName, isHit = true) {
    if (!this.cacheHits.has(cacheName)) {
      this.cacheHits.set(cacheName, 0);
    }

    if (isHit) {
      this.cacheHits.set(cacheName, this.cacheHits.get(cacheName) + 1);
      console.log(`✅ Cache HIT for ${cacheName}`);
    } else {
      console.log(`❌ Cache MISS for ${cacheName}`);
    }

    this.metrics.totalOperations++;
    if (isHit) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const optimizer = new CacheOptimizer();
  const command = process.argv[2] || 'strategy';

  switch (command) {
    case 'strategy':
      console.log('🏗️  Generating optimized cache strategy...\n');
      const strategy = optimizer.optimizeCacheStrategy();
      console.log('Generated cache strategy:');
      console.log(JSON.stringify(strategy, null, 2));
      break;

    case 'matrix':
      console.log('📋 Generating GitHub Actions cache matrix...\n');
      const matrix = optimizer.generateActionsMatrix();
      console.log(JSON.stringify(matrix, null, 2));
      break;

    case 'warm':
      console.log('🔥 Cache warming strategy:');
      const warming = optimizer.generateCacheWarmingStrategy();
      console.log(JSON.stringify(warming, null, 2));
      break;

    case 'test':
      console.log('🧪 Testing cache performance...\n');
      // Simulate some cache operations
      optimizer.simulateCacheOperation('nodeModules', true);
      optimizer.simulateCacheOperation('build', false);
      optimizer.simulateCacheOperation('typescript', true);
      optimizer.simulateCacheOperation('eslint', true);
      optimizer.simulateCacheOperation('playwright', false);

      optimizer.reportCacheMetrics();
      break;

    default:
      console.log('Usage: node cache-optimizer.js [strategy|matrix|warm|test]');
      break;
  }

  // Output for GitHub Actions if needed
  if (process.env.GITHUB_OUTPUT && command === 'strategy') {
    const strategy = optimizer.optimizeCacheStrategy();
    const output = Object.entries(strategy)
      .map(([name, config]) => `${name}-key=${config.key}`)
      .join('\n');

    fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
    console.log('\n📤 Cache keys exported to GITHUB_OUTPUT');
  }
}

export default CacheOptimizer;
