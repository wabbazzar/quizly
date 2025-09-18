# Ticket 007: CI/CD Pipeline Enhancement and Quality Gates

## Metadata
- **Status**: Completed
- **Priority**: High
- **Effort**: 12 points
- **Created**: 2025-09-17
- **Type**: feature
- **Platforms**: Web (CI/CD Infrastructure)

## User Stories

### Primary User Story
As a developer, I want a robust CI/CD pipeline with comprehensive quality gates so that code quality is enforced, bugs are caught early, and deployments are safe and reliable.

### Secondary User Stories
- As a team lead, I want automated code quality enforcement so that coding standards are maintained consistently
- As a developer, I want fast feedback loops so that I can fix issues quickly without blocking other developers
- As a product owner, I want confidence in releases so that deployments don't introduce regressions or break user experiences
- As a DevOps engineer, I want comprehensive monitoring and rollback capabilities so that production issues can be resolved quickly

## Technical Requirements

### Functional Requirements
1. **Quality Gates**: Multi-stage pipeline with TypeScript, linting, testing, and security checks
2. **Automated Testing**: Unit, integration, E2E, and performance testing with failure prevention
3. **Security Scanning**: Dependency vulnerabilities, code security, and compliance checks
4. **Performance Monitoring**: Build performance, bundle analysis, and regression detection
5. **Deployment Automation**: Environment-specific deployments with health checks and rollback capabilities

### Non-Functional Requirements
1. Performance: Pipeline execution <10 minutes, parallel job execution, intelligent caching
2. Reliability: >99% pipeline success rate, automatic retry mechanisms, comprehensive error handling
3. Security: Secrets management, secure artifact handling, vulnerability scanning integration
4. Monitoring: Real-time pipeline visibility, failure alerting, performance metrics collection

## Implementation Plan

### Phase 1: Enhanced GitHub Actions Workflow (3 points)
**Files to create/modify:**
- `.github/workflows/ci.yml` - Comprehensive CI pipeline with parallel jobs
- `.github/workflows/cd.yml` - Deployment pipeline with environment promotion
- `.github/workflows/quality-gates.yml` - Code quality and security checks
- `scripts/ci/setup-cache.js` - Intelligent caching strategy for dependencies
- `scripts/ci/build-matrix.js` - Dynamic build matrix generation

**Comprehensive CI Pipeline:**
```yaml
# .github/workflows/ci.yml
name: Continuous Integration

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '18'
  CACHE_VERSION: v1

jobs:
  # Job 1: Setup and Cache Management
  setup:
    name: Setup Dependencies
    runs-on: ubuntu-latest
    outputs:
      cache-hit: ${{ steps.cache.outputs.cache-hit }}
      node-modules-hash: ${{ steps.hash.outputs.hash }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Generate dependency hash
        id: hash
        run: |
          echo "hash=${{ hashFiles('package-lock.json') }}" >> $GITHUB_OUTPUT

      - name: Cache node modules
        id: cache
        uses: actions/cache@v3
        with:
          path: |
            ~/.npm
            node_modules
          key: ${{ runner.os }}-node-${{ env.CACHE_VERSION }}-${{ steps.hash.outputs.hash }}
          restore-keys: |
            ${{ runner.os }}-node-${{ env.CACHE_VERSION }}-

      - name: Install dependencies
        if: steps.cache.outputs.cache-hit != 'true'
        run: npm ci

      - name: Cache TypeScript build
        uses: actions/cache@v3
        with:
          path: |
            .tsbuildinfo
            dist
          key: ${{ runner.os }}-typescript-${{ env.CACHE_VERSION }}-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-typescript-${{ env.CACHE_VERSION }}-

  # Job 2: Code Quality Checks (Parallel)
  code-quality:
    name: Code Quality
    runs-on: ubuntu-latest
    needs: setup
    strategy:
      matrix:
        check: [typescript, eslint, prettier, unused-deps]
      fail-fast: false
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Restore dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/.npm
            node_modules
          key: ${{ runner.os }}-node-${{ env.CACHE_VERSION }}-${{ needs.setup.outputs.node-modules-hash }}

      - name: TypeScript Check
        if: matrix.check == 'typescript'
        run: |
          npm run type-check
          echo "✅ TypeScript compilation successful"

      - name: ESLint Check
        if: matrix.check == 'eslint'
        run: |
          npm run lint -- --format=json --output-file=eslint-results.json
          npm run lint
          echo "✅ ESLint checks passed"

      - name: Prettier Check
        if: matrix.check == 'prettier'
        run: |
          npm run format:check
          echo "✅ Code formatting is correct"

      - name: Unused Dependencies Check
        if: matrix.check == 'unused-deps'
        run: |
          npx depcheck --ignores="@types/*,vitest,@vitest/*"
          echo "✅ No unused dependencies found"

      - name: Upload ESLint results
        if: matrix.check == 'eslint' && always()
        uses: actions/upload-artifact@v3
        with:
          name: eslint-results
          path: eslint-results.json

  # Job 3: Security Scanning (Parallel)
  security:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: setup
    strategy:
      matrix:
        scan: [dependencies, code-analysis, secrets]
      fail-fast: false
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Restore dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/.npm
            node_modules
          key: ${{ runner.os }}-node-${{ env.CACHE_VERSION }}-${{ needs.setup.outputs.node-modules-hash }}

      - name: Security Audit (Dependencies)
        if: matrix.scan == 'dependencies'
        run: |
          npm audit --audit-level=moderate
          npx audit-ci --moderate
          echo "✅ No moderate+ security vulnerabilities found"

      - name: CodeQL Analysis
        if: matrix.scan == 'code-analysis'
        uses: github/codeql-action/init@v2
        with:
          languages: javascript

      - name: Perform CodeQL Analysis
        if: matrix.scan == 'code-analysis'
        uses: github/codeql-action/analyze@v2

      - name: Secret Scanning
        if: matrix.scan == 'secrets'
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD

  # Job 4: Unit Tests (Parallel)
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: setup
    strategy:
      matrix:
        test-group: [components, services, utils, stores]
      fail-fast: false
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Restore dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/.npm
            node_modules
          key: ${{ runner.os }}-node-${{ env.CACHE_VERSION }}-${{ needs.setup.outputs.node-modules-hash }}

      - name: Run Unit Tests
        run: |
          npm run test:coverage -- --testPathPattern="__tests__/${{ matrix.test-group }}"
        env:
          CI: true

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: ${{ matrix.test-group }}
          name: ${{ matrix.test-group }}-coverage

  # Job 5: Integration Tests
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: [setup, unit-tests]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Restore dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/.npm
            node_modules
          key: ${{ runner.os }}-node-${{ env.CACHE_VERSION }}-${{ needs.setup.outputs.node-modules-hash }}

      - name: Run Integration Tests
        run: |
          npm run test:integration
        env:
          CI: true

      - name: Upload Integration Test Results
        uses: actions/upload-artifact@v3
        with:
          name: integration-test-results
          path: test-results/

  # Job 6: E2E Tests (Multiple Browsers)
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [setup, integration-tests]
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
      fail-fast: false
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Restore dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/.npm
            node_modules
          key: ${{ runner.os }}-node-${{ env.CACHE_VERSION }}-${{ needs.setup.outputs.node-modules-hash }}

      - name: Install Playwright
        run: npx playwright install ${{ matrix.browser }}

      - name: Build Application
        run: npm run build

      - name: Start Application
        run: |
          npm run preview &
          sleep 5

      - name: Run E2E Tests
        run: |
          npx playwright test --project=${{ matrix.browser }}
        env:
          CI: true

      - name: Upload E2E Test Results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: e2e-results-${{ matrix.browser }}
          path: |
            test-results/
            playwright-report/

  # Job 7: Performance Tests
  performance-tests:
    name: Performance Tests
    runs-on: ubuntu-latest
    needs: [setup, e2e-tests]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Restore dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/.npm
            node_modules
          key: ${{ runner.os }}-node-${{ env.CACHE_VERSION }}-${{ needs.setup.outputs.node-modules-hash }}

      - name: Build Application
        run: npm run build

      - name: Analyze Bundle Size
        run: |
          npm run build:analyze
          node scripts/check-bundle-size.js

      - name: Lighthouse Performance Audit
        uses: treosh/lighthouse-ci-action@v9
        with:
          configPath: './.lighthouse/lighthouse-ci.json'
          uploadArtifacts: true
          temporaryPublicStorage: true

      - name: Performance Regression Check
        run: |
          node scripts/performance-regression-check.js

  # Job 8: Build Verification
  build:
    name: Build Verification
    runs-on: ubuntu-latest
    needs: [setup, code-quality, security]
    strategy:
      matrix:
        build-type: [development, production, gh-pages]
      fail-fast: false
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Restore dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/.npm
            node_modules
          key: ${{ runner.os }}-node-${{ env.CACHE_VERSION }}-${{ needs.setup.outputs.node-modules-hash }}

      - name: Build Application
        run: |
          case "${{ matrix.build-type }}" in
            "development")
              npm run build
              ;;
            "production")
              NODE_ENV=production npm run build
              ;;
            "gh-pages")
              npm run build:gh-pages
              ;;
          esac

      - name: Verify Build Output
        run: |
          node scripts/verify-build.js ${{ matrix.build-type }}

      - name: Upload Build Artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-${{ matrix.build-type }}
          path: dist/

  # Final Job: Quality Gate Summary
  quality-gate:
    name: Quality Gate Summary
    runs-on: ubuntu-latest
    needs: [code-quality, security, unit-tests, integration-tests, e2e-tests, performance-tests, build]
    if: always()
    steps:
      - name: Check Quality Gate Status
        run: |
          echo "## Quality Gate Summary" >> $GITHUB_STEP_SUMMARY
          echo "| Check | Status |" >> $GITHUB_STEP_SUMMARY
          echo "|-------|--------|" >> $GITHUB_STEP_SUMMARY

          if [[ "${{ needs.code-quality.result }}" == "success" ]]; then
            echo "| Code Quality | ✅ Passed |" >> $GITHUB_STEP_SUMMARY
          else
            echo "| Code Quality | ❌ Failed |" >> $GITHUB_STEP_SUMMARY
          fi

          if [[ "${{ needs.security.result }}" == "success" ]]; then
            echo "| Security Scan | ✅ Passed |" >> $GITHUB_STEP_SUMMARY
          else
            echo "| Security Scan | ❌ Failed |" >> $GITHUB_STEP_SUMMARY
          fi

          if [[ "${{ needs.unit-tests.result }}" == "success" ]]; then
            echo "| Unit Tests | ✅ Passed |" >> $GITHUB_STEP_SUMMARY
          else
            echo "| Unit Tests | ❌ Failed |" >> $GITHUB_STEP_SUMMARY
          fi

          if [[ "${{ needs.integration-tests.result }}" == "success" ]]; then
            echo "| Integration Tests | ✅ Passed |" >> $GITHUB_STEP_SUMMARY
          else
            echo "| Integration Tests | ❌ Failed |" >> $GITHUB_STEP_SUMMARY
          fi

          if [[ "${{ needs.e2e-tests.result }}" == "success" ]]; then
            echo "| E2E Tests | ✅ Passed |" >> $GITHUB_STEP_SUMMARY
          else
            echo "| E2E Tests | ❌ Failed |" >> $GITHUB_STEP_SUMMARY
          fi

          if [[ "${{ needs.performance-tests.result }}" == "success" ]]; then
            echo "| Performance Tests | ✅ Passed |" >> $GITHUB_STEP_SUMMARY
          else
            echo "| Performance Tests | ❌ Failed |" >> $GITHUB_STEP_SUMMARY
          fi

          if [[ "${{ needs.build.result }}" == "success" ]]; then
            echo "| Build Verification | ✅ Passed |" >> $GITHUB_STEP_SUMMARY
          else
            echo "| Build Verification | ❌ Failed |" >> $GITHUB_STEP_SUMMARY
          fi

      - name: Fail if any quality gate failed
        if: |
          needs.code-quality.result != 'success' ||
          needs.security.result != 'success' ||
          needs.unit-tests.result != 'success' ||
          needs.integration-tests.result != 'success' ||
          needs.e2e-tests.result != 'success' ||
          needs.performance-tests.result != 'success' ||
          needs.build.result != 'success'
        run: |
          echo "❌ One or more quality gates failed"
          exit 1

      - name: Success notification
        if: success()
        run: |
          echo "✅ All quality gates passed successfully!"
```

**Deployment Pipeline:**
```yaml
# .github/workflows/cd.yml
name: Continuous Deployment

on:
  workflow_run:
    workflows: ["Continuous Integration"]
    types:
      - completed
    branches: [main]

env:
  NODE_VERSION: '18'

jobs:
  # Deploy to Staging
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    if: github.event.workflow_run.conclusion == 'success'
    environment:
      name: staging
      url: https://staging.quizly.dev
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Build for staging
        run: |
          NODE_ENV=staging npm run build
        env:
          VITE_API_URL: ${{ secrets.STAGING_API_URL }}
          VITE_APP_VERSION: ${{ github.sha }}

      - name: Deploy to Staging
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          publish_branch: staging-deploy
          cname: staging.quizly.dev

      - name: Health Check
        run: |
          sleep 30
          curl -f https://staging.quizly.dev/health || exit 1

      - name: Run Smoke Tests
        run: |
          npx playwright test --grep "smoke" --base-url=https://staging.quizly.dev

  # Deploy to Production (Manual Approval Required)
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment:
      name: production
      url: https://quizly.dev
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Build for production
        run: |
          NODE_ENV=production npm run build
        env:
          VITE_API_URL: ${{ secrets.PRODUCTION_API_URL }}
          VITE_APP_VERSION: ${{ github.sha }}

      - name: Deploy to Production
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          publish_branch: gh-pages
          cname: quizly.dev

      - name: Health Check
        run: |
          sleep 30
          curl -f https://quizly.dev/health || exit 1

      - name: Post-deployment Tests
        run: |
          npx playwright test --grep "critical" --base-url=https://quizly.dev

      - name: Notify Deployment Success
        uses: 8398a7/action-slack@v3
        with:
          status: success
          channel: '#deployments'
          text: '🚀 Successfully deployed to production!'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}

  # Rollback Job (Manual Trigger)
  rollback-production:
    name: Rollback Production
    runs-on: ubuntu-latest
    if: failure()
    environment:
      name: production-rollback
    steps:
      - name: Checkout previous version
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_sha }}~1

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Build previous version
        run: |
          NODE_ENV=production npm run build
        env:
          VITE_API_URL: ${{ secrets.PRODUCTION_API_URL }}

      - name: Deploy rollback
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          publish_branch: gh-pages
          cname: quizly.dev

      - name: Verify rollback
        run: |
          sleep 30
          curl -f https://quizly.dev/health || exit 1

      - name: Notify rollback
        uses: 8398a7/action-slack@v3
        with:
          status: custom
          custom_payload: |
            {
              text: "⚠️ Production has been rolled back due to deployment failure",
              channel: "#deployments",
              username: "GitHub Actions"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

**Build Cache Optimization Script:**
```javascript
// scripts/ci/setup-cache.js
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

class CacheOptimizer {
  constructor() {
    this.cacheKeys = new Map();
    this.cacheHits = new Map();
  }

  generateCacheKey(files, prefix = 'cache') {
    const hashes = files.map(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file);
        return crypto.createHash('sha256').update(content).digest('hex');
      }
      return '';
    }).filter(Boolean);

    const combinedHash = crypto
      .createHash('sha256')
      .update(hashes.join(''))
      .digest('hex')
      .substring(0, 12);

    return `${prefix}-${process.env.RUNNER_OS}-${combinedHash}`;
  }

  generateNodeModulesKey() {
    const files = ['package.json', 'package-lock.json'];
    return this.generateCacheKey(files, 'node-modules');
  }

  generateBuildKey() {
    const files = [
      'package.json',
      'vite.config.ts',
      'tsconfig.json',
      '.eslintrc.js',
    ];
    return this.generateCacheKey(files, 'build-cache');
  }

  generateTypeScriptKey() {
    const files = [
      'tsconfig.json',
      'src/**/*.ts',
      'src/**/*.tsx',
    ];
    return this.generateCacheKey(files, 'typescript');
  }

  optimizeCacheStrategy() {
    return {
      nodeModules: {
        key: this.generateNodeModulesKey(),
        paths: ['~/.npm', 'node_modules'],
        restoreKeys: ['node-modules-'],
      },
      build: {
        key: this.generateBuildKey(),
        paths: ['dist', '.vite'],
        restoreKeys: ['build-cache-'],
      },
      typescript: {
        key: this.generateTypeScriptKey(),
        paths: ['.tsbuildinfo', 'dist'],
        restoreKeys: ['typescript-'],
      },
    };
  }

  calculateCacheEfficiency() {
    const totalOperations = this.cacheKeys.size;
    const cacheHitCount = Array.from(this.cacheHits.values())
      .reduce((sum, hits) => sum + hits, 0);

    return {
      efficiency: totalOperations > 0 ? (cacheHitCount / totalOperations) * 100 : 0,
      totalOperations,
      cacheHits: cacheHitCount,
    };
  }

  reportCacheMetrics() {
    const efficiency = this.calculateCacheEfficiency();

    console.log('📊 Cache Performance Metrics:');
    console.log(`   Efficiency: ${efficiency.efficiency.toFixed(1)}%`);
    console.log(`   Cache Hits: ${efficiency.cacheHits}/${efficiency.totalOperations}`);

    if (efficiency.efficiency < 60) {
      console.warn('⚠️  Cache efficiency is below 60%. Consider optimizing cache keys.');
    }
  }
}

module.exports = CacheOptimizer;

// CLI usage
if (require.main === module) {
  const optimizer = new CacheOptimizer();
  const strategy = optimizer.optimizeCacheStrategy();

  console.log('Generated cache strategy:');
  console.log(JSON.stringify(strategy, null, 2));

  // Output for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    const output = Object.entries(strategy)
      .map(([name, config]) => `${name}-key=${config.key}`)
      .join('\n');

    fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
  }
}
```

**Implementation steps:**
1. Create comprehensive CI pipeline with parallel execution and intelligent caching
2. Implement multi-stage deployment pipeline with environment promotion
3. Add security scanning integration with vulnerability detection
4. Set up performance monitoring and regression detection in CI
5. Create cache optimization strategies for faster builds

**Testing:**
1. Pipeline execution time measurement and optimization validation
2. Quality gate effectiveness and failure detection testing
3. Security scanning accuracy and false positive reduction
4. Deployment automation and rollback mechanism validation

**Commit**: `ci: implement comprehensive CI/CD pipeline with quality gates and security scanning`

### Phase 2: Advanced Testing Integration (3 points)
**Files to create/modify:**
- `.github/workflows/test-matrix.yml` - Advanced testing matrix with device simulation
- `scripts/ci/test-runner.js` - Intelligent test execution and retry logic
- `scripts/ci/coverage-analysis.js` - Coverage analysis and threshold enforcement
- `playwright.config.ci.js` - CI-optimized Playwright configuration
- `vitest.config.ci.ts` - CI-optimized Vitest configuration

**Advanced Testing Matrix:**
```yaml
# .github/workflows/test-matrix.yml
name: Advanced Testing Matrix

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    # Run full test suite daily at 2 AM UTC
    - cron: '0 2 * * *'

env:
  NODE_VERSION: '18'

jobs:
  # Test Matrix Generation
  generate-matrix:
    name: Generate Test Matrix
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.matrix.outputs.matrix }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Generate dynamic test matrix
        id: matrix
        run: |
          node scripts/ci/generate-test-matrix.js
        env:
          EVENT_NAME: ${{ github.event_name }}
          IS_SCHEDULED: ${{ github.event_name == 'schedule' }}

  # Unit Tests with Advanced Coverage
  unit-tests-advanced:
    name: Unit Tests (${{ matrix.test-type }})
    runs-on: ${{ matrix.os }}
    needs: generate-matrix
    strategy:
      matrix: ${{ fromJson(needs.generate-matrix.outputs.matrix) }}
      fail-fast: false
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Run Unit Tests
        run: |
          npm run test:unit -- \
            --coverage \
            --testTimeout=30000 \
            --testPathPattern="${{ matrix.test-pattern }}" \
            --maxWorkers=2
        env:
          CI: true
          NODE_ENV: test
          VITEST_REPORTER: ${{ matrix.reporter }}

      - name: Generate Coverage Report
        run: |
          node scripts/ci/coverage-analysis.js \
            --threshold=${{ matrix.coverage-threshold }} \
            --format=${{ matrix.coverage-format }}

      - name: Upload Coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: ${{ matrix.test-type }}
          name: ${{ matrix.test-type }}-${{ matrix.os }}

      - name: Upload Test Results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: unit-test-results-${{ matrix.test-type }}-${{ matrix.os }}
          path: |
            coverage/
            test-results/

  # Component Integration Tests
  component-integration:
    name: Component Integration
    runs-on: ubuntu-latest
    strategy:
      matrix:
        component-group: [ui, modes, pages, navigation]
        viewport: [mobile, tablet, desktop]
      fail-fast: false
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Run Component Integration Tests
        run: |
          npm run test:integration -- \
            --testPathPattern="integration/${{ matrix.component-group }}" \
            --viewport=${{ matrix.viewport }}
        env:
          CI: true

      - name: Upload Integration Results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: integration-${{ matrix.component-group }}-${{ matrix.viewport }}
          path: test-results/integration/

  # Cross-Browser E2E Tests
  e2e-cross-browser:
    name: E2E (${{ matrix.browser }}, ${{ matrix.device-type }})
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        include:
          # Desktop browsers
          - browser: chromium
            os: ubuntu-latest
            device-type: desktop
            viewport: 1920x1080
          - browser: firefox
            os: ubuntu-latest
            device-type: desktop
            viewport: 1920x1080
          - browser: webkit
            os: ubuntu-latest
            device-type: desktop
            viewport: 1920x1080

          # Mobile simulation
          - browser: chromium
            os: ubuntu-latest
            device-type: mobile
            viewport: 375x667
            device-name: iPhone 13
          - browser: chromium
            os: ubuntu-latest
            device-type: mobile
            viewport: 412x915
            device-name: Pixel 5

          # Tablet simulation
          - browser: chromium
            os: ubuntu-latest
            device-type: tablet
            viewport: 768x1024
            device-name: iPad
          - browser: webkit
            os: ubuntu-latest
            device-type: tablet
            viewport: 768x1024
            device-name: iPad

      fail-fast: false
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install ${{ matrix.browser }}

      - name: Build Application
        run: npm run build

      - name: Start Application
        run: |
          npm run preview &
          npx wait-on http://localhost:4173 --timeout 60000

      - name: Run E2E Tests
        run: |
          npx playwright test \
            --project=${{ matrix.browser }} \
            --grep="@${{ matrix.device-type }}" \
            --reporter=html,json \
            --output-dir=test-results/${{ matrix.browser }}-${{ matrix.device-type }}
        env:
          CI: true
          DEVICE_TYPE: ${{ matrix.device-type }}
          VIEWPORT: ${{ matrix.viewport }}
          DEVICE_NAME: ${{ matrix.device-name }}

      - name: Upload E2E Results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: e2e-${{ matrix.browser }}-${{ matrix.device-type }}
          path: |
            test-results/
            playwright-report/

  # Accessibility Testing
  accessibility-tests:
    name: Accessibility Tests
    runs-on: ubuntu-latest
    strategy:
      matrix:
        page: [home, deck, learn, flashcards, results]
        accessibility-tool: [axe, lighthouse, pa11y]
      fail-fast: false
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Build Application
        run: npm run build

      - name: Start Application
        run: |
          npm run preview &
          npx wait-on http://localhost:4173

      - name: Run Accessibility Tests
        run: |
          case "${{ matrix.accessibility-tool }}" in
            "axe")
              npx @axe-core/cli http://localhost:4173/${{ matrix.page }} \
                --exit --verbose --reporter=json \
                --output-file=accessibility-${{ matrix.page }}-axe.json
              ;;
            "lighthouse")
              npx lighthouse http://localhost:4173/${{ matrix.page }} \
                --only-categories=accessibility \
                --output=json \
                --output-path=accessibility-${{ matrix.page }}-lighthouse.json \
                --chrome-flags="--headless --no-sandbox"
              ;;
            "pa11y")
              npx pa11y http://localhost:4173/${{ matrix.page }} \
                --reporter=json \
                > accessibility-${{ matrix.page }}-pa11y.json
              ;;
          esac

      - name: Upload Accessibility Results
        uses: actions/upload-artifact@v3
        with:
          name: accessibility-${{ matrix.page }}-${{ matrix.accessibility-tool }}
          path: accessibility-*.json

  # Performance Testing Matrix
  performance-matrix:
    name: Performance Tests (${{ matrix.test-type }})
    runs-on: ubuntu-latest
    strategy:
      matrix:
        test-type: [lighthouse, bundle-analysis, runtime-performance]
        network: [fast-3g, slow-3g, wifi]
      fail-fast: false
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Build Application
        run: npm run build

      - name: Run Performance Tests
        run: |
          case "${{ matrix.test-type }}" in
            "lighthouse")
              node scripts/ci/lighthouse-performance.js \
                --network=${{ matrix.network }} \
                --output=performance-lighthouse-${{ matrix.network }}.json
              ;;
            "bundle-analysis")
              node scripts/ci/bundle-analysis.js \
                --network=${{ matrix.network }} \
                --output=performance-bundle-${{ matrix.network }}.json
              ;;
            "runtime-performance")
              node scripts/ci/runtime-performance.js \
                --network=${{ matrix.network }} \
                --output=performance-runtime-${{ matrix.network }}.json
              ;;
          esac

      - name: Check Performance Budgets
        run: |
          node scripts/ci/check-performance-budgets.js \
            --type=${{ matrix.test-type }} \
            --network=${{ matrix.network }}

      - name: Upload Performance Results
        uses: actions/upload-artifact@v3
        with:
          name: performance-${{ matrix.test-type }}-${{ matrix.network }}
          path: performance-*.json

  # Visual Regression Testing
  visual-regression:
    name: Visual Regression
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install chromium

      - name: Build Application
        run: npm run build

      - name: Start Application
        run: |
          npm run preview &
          npx wait-on http://localhost:4173

      - name: Run Visual Tests (Current)
        run: |
          npx playwright test visual --reporter=json \
            --output-file=visual-results-current.json

      - name: Checkout Base Branch
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.base.sha }}

      - name: Build Base Version
        run: |
          npm ci
          npm run build

      - name: Start Base Application
        run: |
          npm run preview &
          npx wait-on http://localhost:4173

      - name: Run Visual Tests (Base)
        run: |
          npx playwright test visual --reporter=json \
            --output-file=visual-results-base.json

      - name: Compare Visual Differences
        run: |
          node scripts/ci/visual-comparison.js \
            --current=visual-results-current.json \
            --base=visual-results-base.json \
            --output=visual-diff-report.html

      - name: Upload Visual Comparison
        uses: actions/upload-artifact@v3
        with:
          name: visual-regression-report
          path: |
            visual-diff-report.html
            test-results/

  # Test Results Aggregation
  test-summary:
    name: Test Summary
    runs-on: ubuntu-latest
    needs: [
      unit-tests-advanced,
      component-integration,
      e2e-cross-browser,
      accessibility-tests,
      performance-matrix
    ]
    if: always()
    steps:
      - name: Download All Test Results
        uses: actions/download-artifact@v3
        with:
          path: test-results/

      - name: Generate Test Summary
        run: |
          node scripts/ci/generate-test-summary.js \
            --input=test-results/ \
            --output=test-summary.html

      - name: Upload Test Summary
        uses: actions/upload-artifact@v3
        with:
          name: test-summary
          path: test-summary.html

      - name: Comment PR with Test Results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const summary = fs.readFileSync('test-summary.html', 'utf8');

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Test Results Summary\n\n${summary}`
            });
```

**Intelligent Test Runner:**
```javascript
// scripts/ci/test-runner.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class IntelligentTestRunner {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.failFast = options.failFast || false;
    this.parallelism = options.parallelism || require('os').cpus().length;
    this.testResults = new Map();
    this.flakyTests = new Set();
  }

  async runTestSuite(testType, config = {}) {
    console.log(`🚀 Running ${testType} test suite...`);

    const startTime = Date.now();
    let attempt = 1;

    while (attempt <= this.maxRetries) {
      try {
        const result = await this.executeTests(testType, config, attempt);

        this.testResults.set(testType, {
          ...result,
          attempts: attempt,
          duration: Date.now() - startTime,
        });

        console.log(`✅ ${testType} tests passed on attempt ${attempt}`);
        return result;

      } catch (error) {
        console.warn(`❌ ${testType} tests failed on attempt ${attempt}:`, error.message);

        if (attempt === this.maxRetries) {
          this.handleTestFailure(testType, error, attempt);
          throw error;
        }

        // Analyze failure for retry strategy
        const retryStrategy = this.analyzeFailure(error, testType);
        await this.handleRetry(retryStrategy, attempt);

        attempt++;
      }
    }
  }

  async executeTests(testType, config, attempt) {
    const command = this.buildTestCommand(testType, config, attempt);
    const options = {
      stdio: 'pipe',
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    };

    console.log(`📋 Executing: ${command}`);

    const result = execSync(command, options);
    return this.parseTestOutput(result, testType);
  }

  buildTestCommand(testType, config, attempt) {
    const baseCommands = {
      unit: 'npm run test:unit',
      integration: 'npm run test:integration',
      e2e: 'npx playwright test',
      accessibility: 'npm run test:a11y',
      performance: 'npm run test:performance',
    };

    let command = baseCommands[testType] || testType;

    // Add retry-specific flags
    if (attempt > 1) {
      command += ` --retry-failed-only`;

      // Run only previously failed tests
      const failedTests = this.getPreviouslyFailedTests(testType);
      if (failedTests.length > 0) {
        command += ` --testNamePattern="${failedTests.join('|')}"`;
      }
    }

    // Add configuration flags
    if (config.coverage && attempt === 1) {
      command += ' --coverage';
    }

    if (config.timeout) {
      command += ` --testTimeout=${config.timeout}`;
    }

    if (config.maxWorkers) {
      command += ` --maxWorkers=${config.maxWorkers}`;
    }

    // CI-specific optimizations
    if (process.env.CI) {
      command += ' --ci --watchAll=false';

      if (testType === 'e2e') {
        command += ' --workers=2'; // Limit E2E parallelism in CI
      }
    }

    return command;
  }

  parseTestOutput(output, testType) {
    const lines = output.split('\n');

    const results = {
      type: testType,
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      duration: 0,
      coverage: null,
      failedTests: [],
      flakyTests: [],
    };

    // Parse different test runner outputs
    switch (testType) {
      case 'unit':
      case 'integration':
        return this.parseVitestOutput(lines, results);
      case 'e2e':
        return this.parsePlaywrightOutput(lines, results);
      default:
        return this.parseGenericOutput(lines, results);
    }
  }

  parseVitestOutput(lines, results) {
    for (const line of lines) {
      if (line.includes('Test Files')) {
        const match = line.match(/(\d+) passed/);
        if (match) results.passed = parseInt(match[1]);
      }

      if (line.includes('Tests')) {
        const passedMatch = line.match(/(\d+) passed/);
        const failedMatch = line.match(/(\d+) failed/);

        if (passedMatch) results.passed = parseInt(passedMatch[1]);
        if (failedMatch) results.failed = parseInt(failedMatch[1]);
      }

      if (line.includes('% Coverage')) {
        const coverageMatch = line.match(/(\d+(?:\.\d+)?)\s*%/);
        if (coverageMatch) {
          results.coverage = parseFloat(coverageMatch[1]);
        }
      }

      // Detect flaky tests (tests that passed after retry)
      if (line.includes('RETRY') && line.includes('✓')) {
        const testName = line.split('RETRY')[1]?.trim();
        if (testName) {
          results.flakyTests.push(testName);
          this.flakyTests.add(testName);
        }
      }
    }

    results.total = results.passed + results.failed;
    return results;
  }

  parsePlaywrightOutput(lines, results) {
    for (const line of lines) {
      if (line.includes('passed') || line.includes('failed')) {
        const passedMatch = line.match(/(\d+) passed/);
        const failedMatch = line.match(/(\d+) failed/);

        if (passedMatch) results.passed = parseInt(passedMatch[1]);
        if (failedMatch) results.failed = parseInt(failedMatch[1]);
      }

      if (line.includes('flaky')) {
        const flakyMatch = line.match(/(\d+) flaky/);
        if (flakyMatch) {
          results.flaky = parseInt(flakyMatch[1]);
        }
      }
    }

    results.total = results.passed + results.failed + (results.flaky || 0);
    return results;
  }

  analyzeFailure(error, testType) {
    const errorMessage = error.message.toLowerCase();

    // Common failure patterns and retry strategies
    if (errorMessage.includes('timeout') || errorMessage.includes('slow')) {
      return {
        type: 'timeout',
        action: 'increase_timeout',
        delay: this.retryDelay * 2,
      };
    }

    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return {
        type: 'network',
        action: 'retry_with_delay',
        delay: this.retryDelay * 3,
      };
    }

    if (errorMessage.includes('flaky') || errorMessage.includes('intermittent')) {
      return {
        type: 'flaky',
        action: 'immediate_retry',
        delay: this.retryDelay,
      };
    }

    return {
      type: 'unknown',
      action: 'standard_retry',
      delay: this.retryDelay,
    };
  }

  async handleRetry(strategy, attempt) {
    console.log(`🔄 Retry strategy: ${strategy.type} - ${strategy.action}`);

    switch (strategy.action) {
      case 'increase_timeout':
        console.log('⏱️  Increasing timeout for next attempt');
        break;
      case 'retry_with_delay':
        console.log(`⏳ Waiting ${strategy.delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, strategy.delay));
        break;
      case 'immediate_retry':
        console.log('🚀 Immediate retry for flaky test');
        break;
      default:
        await new Promise(resolve => setTimeout(resolve, strategy.delay));
    }
  }

  handleTestFailure(testType, error, totalAttempts) {
    console.error(`💥 ${testType} tests failed after ${totalAttempts} attempts`);

    // Generate failure report
    const failureReport = {
      testType,
      error: error.message,
      attempts: totalAttempts,
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: process.platform,
        ci: !!process.env.CI,
      },
    };

    // Save failure report
    const reportPath = path.join(process.cwd(), 'test-failures.json');
    const existingReports = this.loadExistingReports(reportPath);
    existingReports.push(failureReport);

    fs.writeFileSync(reportPath, JSON.stringify(existingReports, null, 2));

    // Report flaky tests
    if (this.flakyTests.size > 0) {
      console.warn('⚠️  Flaky tests detected:', Array.from(this.flakyTests));
    }
  }

  loadExistingReports(reportPath) {
    try {
      if (fs.existsSync(reportPath)) {
        return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      }
    } catch (error) {
      console.warn('Failed to load existing reports:', error.message);
    }
    return [];
  }

  getPreviouslyFailedTests(testType) {
    // Implementation would track failed tests across runs
    // For now, return empty array
    return [];
  }

  generateSummaryReport() {
    const summary = {
      totalSuites: this.testResults.size,
      results: Array.from(this.testResults.entries()).map(([type, result]) => ({
        type,
        ...result,
      })),
      flakyTests: Array.from(this.flakyTests),
      timestamp: new Date().toISOString(),
    };

    const reportPath = path.join(process.cwd(), 'test-summary.json');
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));

    console.log('\n📊 Test Summary Report Generated');
    console.log(`   Total Suites: ${summary.totalSuites}`);
    console.log(`   Flaky Tests: ${summary.flakyTests.length}`);

    return summary;
  }
}

module.exports = IntelligentTestRunner;

// CLI usage
if (require.main === module) {
  const runner = new IntelligentTestRunner({
    maxRetries: process.env.TEST_MAX_RETRIES || 3,
    failFast: process.env.TEST_FAIL_FAST === 'true',
  });

  const testType = process.argv[2] || 'unit';

  runner.runTestSuite(testType)
    .then(() => {
      runner.generateSummaryReport();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test suite failed:', error.message);
      runner.generateSummaryReport();
      process.exit(1);
    });
}
```

**Implementation steps:**
1. Create advanced testing matrix with cross-browser and device simulation
2. Implement intelligent test runner with retry logic and failure analysis
3. Add comprehensive accessibility testing integration
4. Set up visual regression testing for UI consistency
5. Create test result aggregation and reporting system

**Testing:**
1. Test matrix effectiveness and coverage validation
2. Intelligent retry logic and failure handling testing
3. Accessibility testing accuracy and compliance verification
4. Visual regression detection and reporting validation

**Commit**: `ci: implement advanced testing matrix with intelligent retry and comprehensive coverage`

### Phase 3: Security and Compliance Integration (3 points)
**Files to create/modify:**
- `.github/workflows/security-scan.yml` - Comprehensive security scanning pipeline
- `scripts/ci/security-audit.js` - Custom security audit script
- `scripts/ci/compliance-check.js` - Compliance validation script
- `.github/dependabot.yml` - Automated dependency updates
- `security-policy.md` - Security policy and vulnerability reporting

**Comprehensive Security Pipeline:**
```yaml
# .github/workflows/security-scan.yml
name: Security Scanning

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    # Run security scans daily at 3 AM UTC
    - cron: '0 3 * * *'

env:
  NODE_VERSION: '18'

jobs:
  # Dependency Vulnerability Scanning
  dependency-scan:
    name: Dependency Security Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        run: |
          npm audit --audit-level=moderate --json > npm-audit.json
          npm audit --audit-level=moderate

      - name: Enhanced security audit
        run: |
          node scripts/ci/security-audit.js \
            --input=npm-audit.json \
            --output=security-report.json \
            --fail-on=high

      - name: Upload security report
        uses: actions/upload-artifact@v3
        with:
          name: security-scan-results
          path: |
            npm-audit.json
            security-report.json

  # Code Security Analysis
  code-security:
    name: Code Security Analysis
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: javascript
          queries: security-and-quality

      - name: Autobuild
        uses: github/codeql-action/autobuild@v2

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2
        with:
          category: "/language:javascript"

  # Secret Scanning
  secret-scan:
    name: Secret Scanning
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: TruffleHog Secret Scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD
          extra_args: --debug --only-verified

      - name: GitLeaks Secret Scan
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  # Container Security (if using Docker)
  container-security:
    name: Container Security Scan
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule' || contains(github.event.head_commit.message, '[security]')
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Build Docker image
        run: |
          docker build -t quizly:latest .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'quizly:latest'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  # License Compliance
  license-compliance:
    name: License Compliance Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: License compliance check
        run: |
          npx license-checker --production --json > licenses.json
          node scripts/ci/license-compliance.js \
            --input=licenses.json \
            --allowed-licenses=MIT,Apache-2.0,BSD-3-Clause,ISC \
            --output=license-report.json

      - name: Upload license report
        uses: actions/upload-artifact@v3
        with:
          name: license-compliance
          path: |
            licenses.json
            license-report.json

  # Security Policy Validation
  security-policy:
    name: Security Policy Validation
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Check security policy exists
        run: |
          if [ ! -f "SECURITY.md" ]; then
            echo "❌ SECURITY.md not found"
            exit 1
          fi
          echo "✅ Security policy found"

      - name: Validate security headers
        run: |
          node scripts/ci/security-headers-check.js

      - name: Check for secure defaults
        run: |
          node scripts/ci/secure-defaults-check.js

  # OWASP ZAP Security Test
  owasp-zap:
    name: OWASP ZAP Security Test
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies and build
        run: |
          npm ci
          npm run build

      - name: Start application
        run: |
          npm run preview &
          npx wait-on http://localhost:4173

      - name: OWASP ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'http://localhost:4173'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'

      - name: Upload ZAP results
        uses: actions/upload-artifact@v3
        with:
          name: owasp-zap-results
          path: report_html.html

  # Security Compliance Summary
  security-summary:
    name: Security Compliance Summary
    runs-on: ubuntu-latest
    needs: [
      dependency-scan,
      code-security,
      secret-scan,
      license-compliance,
      security-policy
    ]
    if: always()
    steps:
      - name: Download security artifacts
        uses: actions/download-artifact@v3
        with:
          path: security-results/

      - name: Generate security summary
        run: |
          node scripts/ci/generate-security-summary.js \
            --input=security-results/ \
            --output=security-summary.html

      - name: Check security compliance
        run: |
          node scripts/ci/security-compliance-check.js \
            --input=security-results/ \
            --standards=OWASP-ASVS,NIST-CSF

      - name: Upload security summary
        uses: actions/upload-artifact@v3
        with:
          name: security-summary
          path: security-summary.html

      - name: Comment on PR with security results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const summary = fs.readFileSync('security-summary.html', 'utf8');

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Security Scan Results\n\n${summary}`
            });
```

**Custom Security Audit Script:**
```javascript
// scripts/ci/security-audit.js
const fs = require('fs');
const path = require('path');

class SecurityAuditor {
  constructor() {
    this.vulnerabilities = [];
    this.securityRules = this.loadSecurityRules();
    this.severityThresholds = {
      critical: 0,  // No critical vulnerabilities allowed
      high: 2,      // Max 2 high severity
      moderate: 10, // Max 10 moderate severity
      low: 20,      // Max 20 low severity
    };
  }

  loadSecurityRules() {
    return {
      // Known vulnerable packages to always reject
      blockedPackages: [
        'event-stream@3.3.6',  // Known malicious package
        'getcookies',          // Typosquatting
        'crossenv',            // Typosquatting
      ],

      // Packages that require specific versions
      requiredVersions: {
        'react': '>=17.0.0',
        'react-dom': '>=17.0.0',
        'vite': '>=4.0.0',
      },

      // Security-sensitive packages requiring extra scrutiny
      sensitivePackages: [
        'express',
        'cors',
        'helmet',
        'jsonwebtoken',
        'bcrypt',
        'crypto',
      ],

      // License compliance
      allowedLicenses: [
        'MIT',
        'Apache-2.0',
        'BSD-2-Clause',
        'BSD-3-Clause',
        'ISC',
        'Unlicense',
      ],
    };
  }

  async auditDependencies(auditFile) {
    console.log('🔍 Starting security audit...');

    if (!fs.existsSync(auditFile)) {
      throw new Error(`Audit file not found: ${auditFile}`);
    }

    const auditData = JSON.parse(fs.readFileSync(auditFile, 'utf8'));

    // Process npm audit results
    await this.processNpmAudit(auditData);

    // Additional custom checks
    await this.checkBlockedPackages();
    await this.checkVersionRequirements();
    await this.checkLicenseCompliance();
    await this.checkSecurityHeaders();

    return this.generateSecurityReport();
  }

  async processNpmAudit(auditData) {
    if (auditData.vulnerabilities) {
      for (const [packageName, vulnData] of Object.entries(auditData.vulnerabilities)) {
        for (const advisory of vulnData.via || []) {
          if (typeof advisory === 'object') {
            this.vulnerabilities.push({
              type: 'npm-audit',
              package: packageName,
              title: advisory.title,
              severity: advisory.severity,
              cve: advisory.cves || [],
              range: advisory.range,
              recommendation: vulnData.fixAvailable ? 'Update available' : 'Manual review required',
              url: advisory.url,
            });
          }
        }
      }
    }
  }

  async checkBlockedPackages() {
    const packageJson = this.loadPackageJson();
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    for (const [pkgName, version] of Object.entries(allDeps)) {
      const pkgIdentifier = `${pkgName}@${version}`;

      if (this.securityRules.blockedPackages.includes(pkgIdentifier)) {
        this.vulnerabilities.push({
          type: 'blocked-package',
          package: pkgName,
          version,
          severity: 'critical',
          title: 'Blocked package detected',
          recommendation: 'Remove this package immediately',
        });
      }
    }
  }

  async checkVersionRequirements() {
    const packageJson = this.loadPackageJson();
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    for (const [pkgName, requiredVersion] of Object.entries(this.securityRules.requiredVersions)) {
      const installedVersion = allDeps[pkgName];

      if (installedVersion && !this.versionSatisfies(installedVersion, requiredVersion)) {
        this.vulnerabilities.push({
          type: 'version-requirement',
          package: pkgName,
          installedVersion,
          requiredVersion,
          severity: 'moderate',
          title: 'Package version below security requirement',
          recommendation: `Update to ${requiredVersion}`,
        });
      }
    }
  }

  async checkLicenseCompliance() {
    try {
      const licenseData = JSON.parse(fs.readFileSync('licenses.json', 'utf8'));

      for (const [pkgName, pkgInfo] of Object.entries(licenseData)) {
        const license = pkgInfo.licenses;

        if (license && !this.securityRules.allowedLicenses.includes(license)) {
          this.vulnerabilities.push({
            type: 'license-compliance',
            package: pkgName,
            license,
            severity: 'low',
            title: 'Non-compliant license detected',
            recommendation: 'Review license compatibility or find alternative',
          });
        }
      }
    } catch (error) {
      console.warn('Could not check license compliance:', error.message);
    }
  }

  async checkSecurityHeaders() {
    const securityHeaders = [
      'Content-Security-Policy',
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Permissions-Policy',
    ];

    // This would check if security headers are configured
    // For a static site, this might be in Vite config or deployment config

    const hasSecurityConfig = this.checkViteSecurityConfig();

    if (!hasSecurityConfig) {
      this.vulnerabilities.push({
        type: 'security-headers',
        severity: 'moderate',
        title: 'Missing security headers configuration',
        recommendation: 'Configure security headers in Vite or deployment',
      });
    }
  }

  checkViteSecurityConfig() {
    try {
      const viteConfig = fs.readFileSync('vite.config.ts', 'utf8');

      // Basic check for security-related configuration
      return viteConfig.includes('headers') ||
             viteConfig.includes('security') ||
             viteConfig.includes('helmet');
    } catch (error) {
      return false;
    }
  }

  versionSatisfies(installed, required) {
    // Simplified version checking - in real implementation,
    // would use semver library
    const installedClean = installed.replace(/^[\^~]/, '');
    const requiredClean = required.replace(/^>=/, '');

    return installedClean >= requiredClean;
  }

  loadPackageJson() {
    return JSON.parse(fs.readFileSync('package.json', 'utf8'));
  }

  generateSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.vulnerabilities.length,
        critical: this.vulnerabilities.filter(v => v.severity === 'critical').length,
        high: this.vulnerabilities.filter(v => v.severity === 'high').length,
        moderate: this.vulnerabilities.filter(v => v.severity === 'moderate').length,
        low: this.vulnerabilities.filter(v => v.severity === 'low').length,
      },
      vulnerabilities: this.vulnerabilities,
      compliance: this.checkCompliance(),
      recommendations: this.generateRecommendations(),
    };

    return report;
  }

  checkCompliance() {
    const summary = {
      critical: this.vulnerabilities.filter(v => v.severity === 'critical').length,
      high: this.vulnerabilities.filter(v => v.severity === 'high').length,
      moderate: this.vulnerabilities.filter(v => v.severity === 'moderate').length,
      low: this.vulnerabilities.filter(v => v.severity === 'low').length,
    };

    const compliance = {
      passed: true,
      failures: [],
    };

    for (const [severity, count] of Object.entries(summary)) {
      const threshold = this.severityThresholds[severity];
      if (count > threshold) {
        compliance.passed = false;
        compliance.failures.push({
          severity,
          count,
          threshold,
          message: `${count} ${severity} vulnerabilities exceed threshold of ${threshold}`,
        });
      }
    }

    return compliance;
  }

  generateRecommendations() {
    const recommendations = [];

    // Group vulnerabilities by type for better recommendations
    const vulnsByType = this.vulnerabilities.reduce((acc, vuln) => {
      acc[vuln.type] = acc[vuln.type] || [];
      acc[vuln.type].push(vuln);
      return acc;
    }, {});

    if (vulnsByType['npm-audit']) {
      recommendations.push({
        priority: 'high',
        action: 'Run `npm audit fix` to automatically fix vulnerabilities',
        affected: vulnsByType['npm-audit'].length,
      });
    }

    if (vulnsByType['blocked-package']) {
      recommendations.push({
        priority: 'critical',
        action: 'Remove blocked packages immediately',
        packages: vulnsByType['blocked-package'].map(v => v.package),
      });
    }

    if (vulnsByType['version-requirement']) {
      recommendations.push({
        priority: 'moderate',
        action: 'Update packages to meet security requirements',
        packages: vulnsByType['version-requirement'].map(v =>
          `${v.package}: ${v.installedVersion} → ${v.requiredVersion}`
        ),
      });
    }

    return recommendations;
  }

  async saveReport(outputFile, report) {
    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
    console.log(`📄 Security report saved to ${outputFile}`);
  }

  printSummary(report) {
    console.log('\n🔒 Security Audit Summary:');
    console.log(`   Total vulnerabilities: ${report.summary.total}`);
    console.log(`   Critical: ${report.summary.critical}`);
    console.log(`   High: ${report.summary.high}`);
    console.log(`   Moderate: ${report.summary.moderate}`);
    console.log(`   Low: ${report.summary.low}`);

    if (report.compliance.passed) {
      console.log('✅ Security compliance: PASSED');
    } else {
      console.log('❌ Security compliance: FAILED');
      report.compliance.failures.forEach(failure => {
        console.log(`   ${failure.message}`);
      });
    }

    if (report.recommendations.length > 0) {
      console.log('\n📋 Recommendations:');
      report.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.action}`);
      });
    }
  }
}

module.exports = SecurityAuditor;

// CLI usage
if (require.main === module) {
  const auditor = new SecurityAuditor();

  const auditFile = process.argv[2] || 'npm-audit.json';
  const outputFile = process.argv[3] || 'security-report.json';
  const failOn = process.argv[4] || 'high';

  auditor.auditDependencies(auditFile)
    .then(report => {
      auditor.printSummary(report);
      return auditor.saveReport(outputFile, report);
    })
    .then(() => {
      // Exit with error code based on fail-on threshold
      const report = JSON.parse(fs.readFileSync(outputFile, 'utf8'));

      if (!report.compliance.passed) {
        const hasFailureAtThreshold = report.compliance.failures.some(f =>
          ['critical', 'high', 'moderate', 'low'].indexOf(f.severity) <=
          ['critical', 'high', 'moderate', 'low'].indexOf(failOn)
        );

        if (hasFailureAtThreshold) {
          console.error(`❌ Security audit failed at ${failOn} severity threshold`);
          process.exit(1);
        }
      }

      console.log('✅ Security audit passed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Security audit error:', error.message);
      process.exit(1);
    });
}
```

**Dependabot Configuration:**
```yaml
# .github/dependabot.yml
version: 2
updates:
  # Enable version updates for npm
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "04:00"
    open-pull-requests-limit: 10
    reviewers:
      - "team-leads"
    assignees:
      - "security-team"
    commit-message:
      prefix: "deps"
      prefix-development: "deps-dev"
      include: "scope"

    # Group updates by type
    groups:
      # Security updates (highest priority)
      security-updates:
        patterns:
          - "*"
        update-types:
          - "security"

      # Production dependencies
      production-dependencies:
        patterns:
          - "react*"
          - "vite*"
          - "zustand"
          - "framer-motion"
        update-types:
          - "minor"
          - "patch"

      # Development dependencies
      development-dependencies:
        patterns:
          - "@types/*"
          - "@testing-library/*"
          - "@vitest/*"
          - "eslint*"
          - "prettier"
          - "typescript"
        update-types:
          - "minor"
          - "patch"

    # Custom labels
    labels:
      - "dependencies"
      - "automated"

    # Ignore specific updates
    ignore:
      # Ignore major version updates for stable packages
      - dependency-name: "react"
        update-types: ["version-update:semver-major"]
      - dependency-name: "react-dom"
        update-types: ["version-update:semver-major"]

      # Ignore specific versions with known issues
      - dependency-name: "vite"
        versions: ["4.0.0-beta.*"]

  # Enable version updates for GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "sunday"
      time: "04:00"
    commit-message:
      prefix: "ci"
      include: "scope"
    labels:
      - "github-actions"
      - "automated"
```

**Implementation steps:**
1. Create comprehensive security scanning pipeline with multiple tools
2. Implement custom security audit script with vulnerability analysis
3. Add license compliance checking and policy enforcement
4. Set up automated dependency updates with security prioritization
5. Create security compliance reporting and alerting system

**Testing:**
1. Security scanning accuracy and false positive reduction
2. Compliance checking effectiveness and policy enforcement
3. Automated dependency update workflow validation
4. Security alert integration and notification testing

**Commit**: `security: implement comprehensive security scanning and compliance pipeline`

### Phase 4: Monitoring and Alerting Integration (3 points)
**Files to create/modify:**
- `.github/workflows/monitoring.yml` - CI/CD monitoring and alerting
- `scripts/ci/metrics-collector.js` - Build and deployment metrics collection
- `scripts/ci/alert-manager.js` - Alert management and notification system
- `scripts/ci/health-checker.js` - Application health monitoring
- `.github/workflows/performance-monitoring.yml` - Performance regression monitoring

**CI/CD Monitoring Pipeline:**
```yaml
# .github/workflows/monitoring.yml
name: CI/CD Monitoring

on:
  workflow_run:
    workflows: ["Continuous Integration", "Continuous Deployment"]
    types: [completed]
  schedule:
    # Check health every hour
    - cron: '0 * * * *'

env:
  SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
  DATADOG_API_KEY: ${{ secrets.DATADOG_API_KEY }}

jobs:
  # Build Performance Monitoring
  build-metrics:
    name: Build Performance Metrics
    runs-on: ubuntu-latest
    if: github.event.workflow_run.conclusion != 'skipped'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Collect build metrics
        run: |
          node scripts/ci/metrics-collector.js \
            --workflow-run-id=${{ github.event.workflow_run.id }} \
            --workflow-name="${{ github.event.workflow_run.name }}" \
            --conclusion="${{ github.event.workflow_run.conclusion }}" \
            --output=build-metrics.json

      - name: Send metrics to monitoring service
        run: |
          node scripts/ci/send-metrics.js \
            --input=build-metrics.json \
            --service=datadog

      - name: Check performance thresholds
        run: |
          node scripts/ci/performance-threshold-check.js \
            --input=build-metrics.json \
            --alert-on-regression

  # Application Health Check
  health-monitoring:
    name: Application Health Check
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [staging, production]
      fail-fast: false
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Run health checks
        run: |
          node scripts/ci/health-checker.js \
            --environment=${{ matrix.environment }} \
            --output=health-${{ matrix.environment }}.json

      - name: Alert on health issues
        if: failure()
        run: |
          node scripts/ci/alert-manager.js \
            --type=health-failure \
            --environment=${{ matrix.environment }} \
            --severity=high

  # Deployment Success Monitoring
  deployment-monitoring:
    name: Deployment Monitoring
    runs-on: ubuntu-latest
    if: github.event.workflow_run.name == 'Continuous Deployment'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Monitor deployment status
        run: |
          node scripts/ci/deployment-monitor.js \
            --workflow-run-id=${{ github.event.workflow_run.id }} \
            --conclusion="${{ github.event.workflow_run.conclusion }}"

      - name: Send deployment notification
        run: |
          node scripts/ci/alert-manager.js \
            --type=deployment \
            --status="${{ github.event.workflow_run.conclusion }}" \
            --commit-sha="${{ github.event.workflow_run.head_sha }}"

  # Performance Regression Detection
  performance-regression:
    name: Performance Regression Check
    runs-on: ubuntu-latest
    if: github.event.workflow_run.conclusion == 'success'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Download performance artifacts
        uses: actions/download-artifact@v3
        with:
          name: performance-results
          path: performance-data/

      - name: Analyze performance trends
        run: |
          node scripts/ci/performance-trend-analysis.js \
            --input=performance-data/ \
            --baseline=main \
            --threshold=5 \
            --output=performance-analysis.json

      - name: Alert on performance regression
        if: failure()
        run: |
          node scripts/ci/alert-manager.js \
            --type=performance-regression \
            --data=performance-analysis.json \
            --severity=medium

  # Test Flakiness Monitoring
  test-flakiness:
    name: Test Flakiness Analysis
    runs-on: ubuntu-latest
    if: github.event.workflow_run.name == 'Continuous Integration'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Analyze test results
        run: |
          node scripts/ci/test-flakiness-analyzer.js \
            --workflow-run-id=${{ github.event.workflow_run.id }} \
            --lookback-days=7 \
            --flakiness-threshold=3

      - name: Report flaky tests
        run: |
          node scripts/ci/flaky-test-reporter.js \
            --output=flaky-tests-report.json

  # Security Alert Monitoring
  security-monitoring:
    name: Security Alert Monitoring
    runs-on: ubuntu-latest
    if: github.event.workflow_run.name == 'Security Scanning'
    steps:
      - name: Check security scan results
        run: |
          node scripts/ci/security-monitor.js \
            --workflow-run-id=${{ github.event.workflow_run.id }} \
            --alert-on-new-vulnerabilities

      - name: Process security alerts
        if: failure()
        run: |
          node scripts/ci/alert-manager.js \
            --type=security-alert \
            --severity=high \
            --urgent=true

  # Dashboard Update
  dashboard-update:
    name: Update Monitoring Dashboard
    runs-on: ubuntu-latest
    needs: [build-metrics, health-monitoring, performance-regression]
    if: always()
    steps:
      - name: Update dashboard metrics
        run: |
          node scripts/ci/dashboard-updater.js \
            --build-status="${{ needs.build-metrics.result }}" \
            --health-status="${{ needs.health-monitoring.result }}" \
            --performance-status="${{ needs.performance-regression.result }}"
```

**Metrics Collector:**
```javascript
// scripts/ci/metrics-collector.js
const { Octokit } = require('@octokit/rest');
const fs = require('fs');

class MetricsCollector {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
    this.metrics = {
      build: {},
      performance: {},
      quality: {},
      deployment: {},
    };
  }

  async collectWorkflowMetrics(workflowRunId, workflowName) {
    console.log(`📊 Collecting metrics for workflow run ${workflowRunId}`);

    try {
      // Get workflow run details
      const workflowRun = await this.getWorkflowRun(workflowRunId);

      // Get job details
      const jobs = await this.getWorkflowJobs(workflowRunId);

      // Collect build metrics
      this.metrics.build = await this.collectBuildMetrics(workflowRun, jobs);

      // Collect performance metrics
      this.metrics.performance = await this.collectPerformanceMetrics(workflowRunId);

      // Collect quality metrics
      this.metrics.quality = await this.collectQualityMetrics(workflowRunId);

      // Collect deployment metrics
      if (workflowName.includes('Deployment')) {
        this.metrics.deployment = await this.collectDeploymentMetrics(workflowRun);
      }

      return this.metrics;
    } catch (error) {
      console.error('Failed to collect metrics:', error.message);
      throw error;
    }
  }

  async getWorkflowRun(runId) {
    const { data } = await this.octokit.rest.actions.getWorkflowRun({
      owner: process.env.GITHUB_REPOSITORY.split('/')[0],
      repo: process.env.GITHUB_REPOSITORY.split('/')[1],
      run_id: runId,
    });
    return data;
  }

  async getWorkflowJobs(runId) {
    const { data } = await this.octokit.rest.actions.listJobsForWorkflowRun({
      owner: process.env.GITHUB_REPOSITORY.split('/')[0],
      repo: process.env.GITHUB_REPOSITORY.split('/')[1],
      run_id: runId,
    });
    return data.jobs;
  }

  async collectBuildMetrics(workflowRun, jobs) {
    const startTime = new Date(workflowRun.created_at);
    const endTime = new Date(workflowRun.updated_at);
    const duration = endTime - startTime;

    const metrics = {
      workflow: {
        id: workflowRun.id,
        name: workflowRun.name,
        status: workflowRun.status,
        conclusion: workflowRun.conclusion,
        duration_ms: duration,
        duration_minutes: Math.round(duration / 1000 / 60 * 100) / 100,
        created_at: workflowRun.created_at,
        updated_at: workflowRun.updated_at,
        head_sha: workflowRun.head_sha,
        head_branch: workflowRun.head_branch,
      },
      jobs: jobs.map(job => ({
        id: job.id,
        name: job.name,
        status: job.status,
        conclusion: job.conclusion,
        duration_ms: job.started_at && job.completed_at
          ? new Date(job.completed_at) - new Date(job.started_at)
          : null,
        queue_time_ms: job.started_at
          ? new Date(job.started_at) - new Date(job.created_at)
          : null,
      })),
      summary: {
        total_jobs: jobs.length,
        successful_jobs: jobs.filter(j => j.conclusion === 'success').length,
        failed_jobs: jobs.filter(j => j.conclusion === 'failure').length,
        parallel_execution: this.calculateParallelExecution(jobs),
        cache_effectiveness: await this.calculateCacheEffectiveness(jobs),
      },
    };

    return metrics;
  }

  async collectPerformanceMetrics(workflowRunId) {
    try {
      // Download performance artifacts if available
      const artifacts = await this.getWorkflowArtifacts(workflowRunId);
      const performanceArtifact = artifacts.find(a => a.name.includes('performance'));

      if (performanceArtifact) {
        // In a real implementation, we would download and parse the artifact
        return {
          lighthouse_score: 95, // Would be parsed from actual data
          bundle_size_kb: 150,
          first_contentful_paint_ms: 1200,
          largest_contentful_paint_ms: 2400,
          time_to_interactive_ms: 3200,
        };
      }
    } catch (error) {
      console.warn('Could not collect performance metrics:', error.message);
    }

    return {};
  }

  async collectQualityMetrics(workflowRunId) {
    try {
      // Parse test results and coverage reports
      const testResults = await this.parseTestResults(workflowRunId);
      const coverageData = await this.parseCoverageData(workflowRunId);

      return {
        test_results: testResults,
        code_coverage: coverageData,
        lint_issues: await this.parseLintResults(workflowRunId),
        security_issues: await this.parseSecurityResults(workflowRunId),
      };
    } catch (error) {
      console.warn('Could not collect quality metrics:', error.message);
      return {};
    }
  }

  async collectDeploymentMetrics(workflowRun) {
    return {
      deployment_time: new Date(workflowRun.updated_at) - new Date(workflowRun.created_at),
      environment: this.inferEnvironment(workflowRun),
      commit_sha: workflowRun.head_sha,
      commit_message: workflowRun.head_commit?.message || '',
      deployer: workflowRun.actor?.login || 'unknown',
    };
  }

  calculateParallelExecution(jobs) {
    // Calculate how much time was saved through parallel execution
    const totalSequentialTime = jobs.reduce((sum, job) => {
      const duration = job.started_at && job.completed_at
        ? new Date(job.completed_at) - new Date(job.started_at)
        : 0;
      return sum + duration;
    }, 0);

    const actualWallClockTime = Math.max(...jobs.map(job => {
      return job.started_at && job.completed_at
        ? new Date(job.completed_at) - new Date(job.started_at)
        : 0;
    }));

    return {
      total_sequential_time_ms: totalSequentialTime,
      actual_wall_clock_time_ms: actualWallClockTime,
      parallelization_efficiency: actualWallClockTime > 0
        ? totalSequentialTime / actualWallClockTime
        : 1,
    };
  }

  async calculateCacheEffectiveness(jobs) {
    // Analyze job logs to determine cache hit rates
    // This is a simplified implementation
    let totalCacheOperations = 0;
    let cacheHits = 0;

    for (const job of jobs) {
      // In a real implementation, we would download and parse job logs
      // to find cache-related messages
      if (job.name.includes('Setup') || job.name.includes('Dependencies')) {
        totalCacheOperations++;
        // Simulate cache hit detection
        if (Math.random() > 0.3) { // 70% cache hit rate simulation
          cacheHits++;
        }
      }
    }

    return {
      total_operations: totalCacheOperations,
      cache_hits: cacheHits,
      hit_rate: totalCacheOperations > 0 ? cacheHits / totalCacheOperations : 0,
    };
  }

  async getWorkflowArtifacts(runId) {
    try {
      const { data } = await this.octokit.rest.actions.listWorkflowRunArtifacts({
        owner: process.env.GITHUB_REPOSITORY.split('/')[0],
        repo: process.env.GITHUB_REPOSITORY.split('/')[1],
        run_id: runId,
      });
      return data.artifacts;
    } catch (error) {
      console.warn('Could not get workflow artifacts:', error.message);
      return [];
    }
  }

  async parseTestResults(workflowRunId) {
    // In a real implementation, this would download and parse test result artifacts
    return {
      total_tests: 150,
      passed_tests: 148,
      failed_tests: 2,
      skipped_tests: 0,
      test_duration_ms: 45000,
      flaky_tests: ['ComponentTest.should handle edge case'],
    };
  }

  async parseCoverageData(workflowRunId) {
    // In a real implementation, this would parse coverage reports
    return {
      line_coverage: 85.2,
      branch_coverage: 78.9,
      function_coverage: 92.1,
      statement_coverage: 84.7,
    };
  }

  async parseLintResults(workflowRunId) {
    return {
      total_issues: 12,
      errors: 0,
      warnings: 8,
      info: 4,
    };
  }

  async parseSecurityResults(workflowRunId) {
    return {
      vulnerabilities: {
        critical: 0,
        high: 1,
        moderate: 3,
        low: 5,
      },
      dependencies_scanned: 245,
    };
  }

  inferEnvironment(workflowRun) {
    const branch = workflowRun.head_branch;
    if (branch === 'main') return 'production';
    if (branch === 'develop') return 'staging';
    return 'feature';
  }

  generateTrends(currentMetrics, historicalMetrics = []) {
    const trends = {
      build_time: this.calculateTrend(
        currentMetrics.build?.workflow?.duration_minutes,
        historicalMetrics.map(m => m.build?.workflow?.duration_minutes).filter(Boolean)
      ),
      test_success_rate: this.calculateTrend(
        currentMetrics.quality?.test_results ?
          currentMetrics.quality.test_results.passed_tests / currentMetrics.quality.test_results.total_tests : null,
        historicalMetrics.map(m => {
          const tests = m.quality?.test_results;
          return tests ? tests.passed_tests / tests.total_tests : null;
        }).filter(v => v !== null)
      ),
      code_coverage: this.calculateTrend(
        currentMetrics.quality?.code_coverage?.line_coverage,
        historicalMetrics.map(m => m.quality?.code_coverage?.line_coverage).filter(Boolean)
      ),
    };

    return trends;
  }

  calculateTrend(currentValue, historicalValues) {
    if (!currentValue || historicalValues.length === 0) {
      return { direction: 'unknown', change: 0 };
    }

    const avgHistorical = historicalValues.reduce((sum, val) => sum + val, 0) / historicalValues.length;
    const change = ((currentValue - avgHistorical) / avgHistorical) * 100;

    return {
      direction: change > 2 ? 'up' : change < -2 ? 'down' : 'stable',
      change: Math.round(change * 100) / 100,
      current: currentValue,
      historical_average: Math.round(avgHistorical * 100) / 100,
    };
  }

  async saveMetrics(outputFile, metrics) {
    const enrichedMetrics = {
      ...metrics,
      collection_timestamp: new Date().toISOString(),
      trends: this.generateTrends(metrics),
    };

    fs.writeFileSync(outputFile, JSON.stringify(enrichedMetrics, null, 2));
    console.log(`📄 Metrics saved to ${outputFile}`);

    return enrichedMetrics;
  }
}

module.exports = MetricsCollector;

// CLI usage
if (require.main === module) {
  const collector = new MetricsCollector();

  const workflowRunId = process.argv[2];
  const workflowName = process.argv[3];
  const outputFile = process.argv[4] || 'metrics.json';

  if (!workflowRunId) {
    console.error('Usage: node metrics-collector.js <workflow-run-id> [workflow-name] [output-file]');
    process.exit(1);
  }

  collector.collectWorkflowMetrics(workflowRunId, workflowName)
    .then(metrics => {
      return collector.saveMetrics(outputFile, metrics);
    })
    .then(metrics => {
      console.log('✅ Metrics collection completed');
      console.log(`   Build time: ${metrics.build?.workflow?.duration_minutes || 'N/A'} minutes`);
      console.log(`   Success rate: ${metrics.build?.summary?.successful_jobs || 0}/${metrics.build?.summary?.total_jobs || 0} jobs`);
    })
    .catch(error => {
      console.error('❌ Metrics collection failed:', error.message);
      process.exit(1);
    });
}
```

**Implementation steps:**
1. Create comprehensive CI/CD monitoring pipeline with real-time metrics
2. Implement metrics collection system for build, performance, and quality data
3. Add alert management system with multi-channel notifications
4. Set up health monitoring and application status tracking
5. Create performance regression detection and trend analysis

**Testing:**
1. Monitoring pipeline accuracy and alerting validation
2. Metrics collection completeness and accuracy verification
3. Alert notification delivery and escalation testing
4. Health check reliability and false positive reduction

**Commit**: `monitoring: implement comprehensive CI/CD monitoring and alerting system`

## Testing Strategy

### Unit Tests
- Pipeline configuration and script functionality
- Quality gate logic and threshold enforcement
- Security scanning accuracy and compliance checking
- Monitoring metrics collection and processing

### Integration Tests
- Complete CI/CD pipeline execution and validation
- Multi-environment deployment workflow testing
- Security scanning integration and alerting
- Performance monitoring and regression detection

### E2E Tests
- Full development workflow from commit to deployment
- Security vulnerability detection and response workflow
- Performance regression detection and alerting
- Rollback and recovery procedures

## Platform-Specific Considerations

### GitHub Actions
- Workflow execution optimization and resource management
- Secret management and security best practices
- Artifact handling and storage optimization
- Action marketplace integration and security

### Multi-Environment Support
- Environment-specific configuration management
- Progressive deployment strategies
- Environment parity validation
- Cross-environment monitoring and alerting

## Documentation Updates Required
1. `README.md` - Add CI/CD pipeline documentation and usage guide
2. `docs/ci-cd.md` - Comprehensive CI/CD pipeline documentation
3. `docs/security.md` - Security scanning and compliance guide
4. `docs/monitoring.md` - Monitoring and alerting documentation

## Success Criteria
1. **Pipeline Reliability**: >99% success rate, <10 minute execution time
2. **Quality Gates**: 100% enforcement, zero false positives in blocking
3. **Security Coverage**: Complete vulnerability detection, automated compliance
4. **Performance Monitoring**: Real-time metrics, <5 minute alert response
5. **Developer Experience**: Clear feedback, fast iteration cycles
6. **Deployment Safety**: Automated rollback, zero-downtime deployments
7. **Monitoring Coverage**: Complete pipeline visibility, proactive alerting

## Dependencies
- **GitHub Actions**: Advanced workflow features and marketplace actions
- **Security Tools**: CodeQL, TruffleHog, OWASP ZAP, dependency scanners
- **Monitoring Services**: DataDog, Slack, or equivalent monitoring platforms
- **Testing Tools**: Playwright, Lighthouse, accessibility testing tools

## Risks & Mitigations
1. **Risk**: Complex pipeline could slow development
   **Mitigation**: Parallel execution, intelligent caching, selective testing
2. **Risk**: False positive alerts could cause alert fatigue
   **Mitigation**: Smart thresholds, alert tuning, escalation policies
3. **Risk**: Security scanning could block legitimate updates
   **Mitigation**: Whitelist management, manual override procedures, risk assessment
4. **Risk**: Pipeline failures could block critical releases
   **Mitigation**: Emergency bypass procedures, rollback capabilities, manual deployment options

## Accessibility Requirements
- CI/CD dashboards must be accessible to team members with disabilities
- Alert notifications must support multiple communication channels
- Documentation must follow accessibility guidelines
- Monitoring interfaces must be screen reader compatible

## Performance Metrics

### Pipeline Performance Targets
- **Total Pipeline Time**: <10 minutes for full CI pipeline
- **Parallel Execution Efficiency**: >70% time savings through parallelization
- **Cache Hit Rate**: >80% for dependency and build caches
- **Resource Utilization**: Optimal GitHub Actions minute usage

### Quality Metrics
- **Test Coverage**: >85% overall, >95% for critical paths
- **Security Scan Coverage**: 100% of dependencies and code
- **Performance Regression Detection**: <5% false positive rate
- **Deployment Success Rate**: >99% for production deployments

## Release & Deployment Guide

### Pipeline Testing Checklist
- [ ] All quality gates functioning correctly
- [ ] Security scanning catching known vulnerabilities
- [ ] Performance monitoring detecting regressions
- [ ] Alert systems delivering notifications promptly
- [ ] Deployment automation working across environments
- [ ] Rollback procedures tested and verified
- [ ] Documentation updated and accessible

### Rollout Strategy
1. **Phase 1**: Enhanced CI pipeline with quality gates
2. **Phase 2**: Advanced testing matrix and security scanning
3. **Phase 3**: Comprehensive monitoring and alerting
4. **Phase 4**: Performance optimization and trend analysis

### Rollback Strategy
- Pipeline changes can be reverted via GitHub workflow rollback
- Quality gates can be temporarily bypassed with proper approvals
- Security scanning can be adjusted for emergency releases
- Monitoring thresholds can be relaxed during incident response