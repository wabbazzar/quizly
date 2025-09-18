# CI/CD Pipeline Setup

This document describes the comprehensive CI/CD pipeline implementation for the
Quizly application.

## Overview

The CI/CD pipeline provides automated testing, quality gates, security scanning,
and deployment automation using GitHub Actions. It includes multiple parallel
jobs for optimal performance and comprehensive coverage.

## Pipeline Architecture

### 🔄 Continuous Integration (`ci.yml`)

**Triggers:**

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**

1. **Setup** - Dependency management and caching
2. **Code Quality** - TypeScript, ESLint, Prettier, dependency checks (parallel)
3. **Security** - Dependency audit, CodeQL analysis (parallel)
4. **Unit Tests** - Component, service, utility, store tests (parallel)
5. **Integration Tests** - Full integration test suite
6. **E2E Tests** - Cross-browser end-to-end testing (parallel)
7. **Performance Tests** - Lighthouse CI performance budgets
8. **Build Verification** - Multi-target build validation (parallel)
9. **Quality Gate Summary** - Aggregated pass/fail status

### 🚀 Continuous Deployment (`cd.yml`)

**Triggers:**

- Successful CI pipeline completion on `main` branch
- Manual workflow dispatch

**Jobs:**

1. **Deploy Staging** - Automatic deployment to staging environment
2. **Deploy Production** - Manual approval required, health checks, rollback
   capability
3. **Rollback Production** - Automatic rollback on deployment failure

### 🔍 PR Preview (`pr-preview.yml`)

**Triggers:**

- Pull request opened, synchronized, or reopened

**Jobs:**

1. **Deploy Preview** - Creates preview deployment for PR
2. **Test Preview** - Runs smoke and accessibility tests on preview
3. **Cleanup Preview** - Removes preview on PR close

## Quality Gates

### Code Quality Checks

- **TypeScript Compilation** - Strict type checking
- **ESLint** - Code quality and consistency
- **Prettier** - Code formatting
- **Unused Dependencies** - Dead code detection

### Security Scanning

- **Dependency Audit** - npm audit for known vulnerabilities
- **CodeQL Analysis** - Static code analysis for security issues
- **Secret Scanning** - TruffleHog integration

### Testing Coverage

- **Unit Tests** - >80% coverage target
- **Integration Tests** - Component integration validation
- **E2E Tests** - Cross-browser user journey testing
- **Performance Tests** - Lighthouse CI with budgets

### Build Validation

- **Multi-Target Builds** - Development, production, GitHub Pages
- **Bundle Analysis** - Size optimization and analysis
- **Asset Verification** - Build output validation

## Performance Optimizations

### Intelligent Caching

- **Node Modules** - npm dependencies with hash-based keys
- **Build Cache** - Vite build artifacts and TypeScript compilation
- **Browser Cache** - Playwright browser binaries
- **ESLint Cache** - Linting results caching

### Parallel Execution

- **Matrix Strategy** - Parallel test execution by category
- **Independent Jobs** - Non-dependent jobs run concurrently
- **Browser Testing** - Parallel cross-browser execution

### Cache Optimization Script

The `scripts/ci/cache-optimizer.js` provides:

- Intelligent cache key generation
- Cache hit/miss metrics
- Performance optimization suggestions
- GitHub Actions integration

## Security Features

### Secrets Management

Required secrets for full functionality:

```bash
# Deployment
NETLIFY_AUTH_TOKEN=<netlify-auth-token>
NETLIFY_STAGING_SITE_ID=<staging-site-id>
NETLIFY_PRODUCTION_SITE_ID=<production-site-id>
NETLIFY_PREVIEW_SITE_ID=<preview-site-id>

# Code Coverage
CODECOV_TOKEN=<codecov-token>

# Performance Monitoring
LHCI_GITHUB_APP_TOKEN=<lighthouse-ci-token>

# Notifications (optional)
SLACK_WEBHOOK=<slack-webhook-url>
```

### Security Scanning

- **Dependency Vulnerabilities** - Automated security audits
- **Code Analysis** - GitHub CodeQL integration
- **Secret Detection** - TruffleHog scanning

## Monitoring and Alerting

### Build Metrics

- **Pipeline Duration** - Target <10 minutes
- **Cache Efficiency** - Target >80% hit rate
- **Test Coverage** - Target >80% coverage
- **Bundle Size** - Target <200KB initial JS

### Quality Metrics

- **Lighthouse Scores** - Target >90 performance
- **Accessibility** - Target >95% compliance
- **Security** - Zero high-severity vulnerabilities
- **Best Practices** - Target >90% score

## Deployment Environments

### 🔧 Staging

- **URL:** `https://staging-quizly.netlify.app`
- **Trigger:** Automatic on `main` branch push
- **Features:** Source maps, debug info, preview features

### 🚀 Production

- **URL:** `https://quizly.netlify.app`
- **Trigger:** Manual approval required
- **Features:** Optimized builds, monitoring, rollback capability

### 👁️ PR Previews

- **URL:** `https://pr-{number}--quizly.netlify.app`
- **Trigger:** Automatic on PR creation/update
- **Features:** Isolated environment, automatic cleanup

## Rollback Strategy

### Automatic Rollback

- **Health Check Failure** - Automatic rollback to previous version
- **Critical Test Failure** - Immediate rollback triggered
- **Resource Issues** - Fallback to stable deployment

### Manual Rollback

- **Workflow Dispatch** - Manual rollback trigger
- **Emergency Process** - Fast rollback to any previous version
- **Verification** - Automated health checks after rollback

## Usage Guide

### Running Tests Locally

```bash
# All quality checks
npm run ci:quality

# All tests
npm run ci:test

# Full CI simulation
npm run ci:build
```

### Cache Management

```bash
# Generate cache strategy
node scripts/ci/cache-optimizer.js strategy

# Test cache performance
node scripts/ci/cache-optimizer.js test

# Generate GitHub Actions matrix
node scripts/ci/cache-optimizer.js matrix
```

### Build Verification

```bash
# Verify production build
npm run build
node scripts/verify-build.js production

# Verify GitHub Pages build
npm run build:gh-pages
node scripts/verify-build.js gh-pages
```

## Troubleshooting

### Common Issues

**Cache Misses**

- Check cache key generation
- Verify file patterns in cache-optimizer.js
- Review GitHub Actions cache limits

**Test Failures**

- Check test environment setup
- Verify browser installations
- Review test timeouts and dependencies

**Deployment Failures**

- Check secrets configuration
- Verify Netlify site configuration
- Review build output verification

**Performance Issues**

- Review bundle analysis reports
- Check Lighthouse CI results
- Optimize asset loading

### Debug Commands

```bash
# Check cache efficiency
node scripts/ci/cache-optimizer.js test

# Validate build output
node scripts/verify-build.js <build-type>

# Test preview deployment locally
npm run preview

# Run specific test suites
npm run test:integration
npm run test:e2e -- --headed
```

## Maintenance

### Regular Tasks

- **Weekly:** Review Dependabot PRs
- **Monthly:** Update CI/CD pipeline dependencies
- **Quarterly:** Review cache efficiency and optimization

### Monitoring

- **Pipeline Performance** - GitHub Actions insights
- **Cache Hit Rates** - CI logs and metrics
- **Security Alerts** - GitHub security advisories
- **Performance Budgets** - Lighthouse CI reports

## Contributing

When modifying the CI/CD pipeline:

1. **Test Locally** - Run relevant scripts locally first
2. **Small Changes** - Make incremental improvements
3. **Document Updates** - Update this documentation
4. **Monitor Impact** - Watch pipeline performance after changes

### Pipeline Development

- Use branch protection rules
- Require status checks for PRs
- Test changes in feature branches
- Monitor resource usage and costs

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Netlify Deploy Documentation](https://docs.netlify.com/)
- [Playwright Testing](https://playwright.dev/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [CodeQL Analysis](https://docs.github.com/en/code-security/code-scanning)
