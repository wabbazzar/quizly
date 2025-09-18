module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:5173',
        'http://localhost:5173/deck/typescript-fundamentals',
        'http://localhost:5173/flashcards/typescript-fundamentals',
        'http://localhost:5173/learn/typescript-fundamentals',
      ],
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 30000,
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        preset: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
        },
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:pwa': ['warn', { minScore: 0.8 }],

        // Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 1500 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'first-meaningful-paint': ['warn', { maxNumericValue: 2000 }],
        'speed-index': ['warn', { maxNumericValue: 3000 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'max-potential-fid': ['warn', { maxNumericValue: 130 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],

        // Performance budgets
        'resource-summary:script:size': ['error', { maxNumericValue: 200000 }], // 200KB
        'resource-summary:total:size': ['warn', { maxNumericValue: 1000000 }], // 1MB
        'resource-summary:image:size': ['warn', { maxNumericValue: 500000 }], // 500KB

        // Progressive Web App
        'installable-manifest': ['warn', { minScore: 1 }],
        'service-worker': ['warn', { minScore: 1 }],
        'works-offline': ['warn', { minScore: 1 }],

        // Accessibility
        'color-contrast': ['error', { minScore: 1 }],
        'heading-order': ['error', { minScore: 1 }],
        'html-has-lang': ['error', { minScore: 1 }],
        'image-alt': ['error', { minScore: 1 }],
        label: ['error', { minScore: 1 }],
        'link-name': ['error', { minScore: 1 }],

        // Best Practices
        'uses-https': ['error', { minScore: 1 }],
        'is-on-https': ['error', { minScore: 1 }],
        'errors-in-console': ['warn', { maxNumericValue: 0 }],
        'no-vulnerable-libraries': ['error', { minScore: 1 }],

        // SEO
        'document-title': ['error', { minScore: 1 }],
        'meta-description': ['error', { minScore: 1 }],
        'http-status-code': ['error', { minScore: 1 }],
        'crawlable-anchors': ['error', { minScore: 1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
      githubAppToken: process.env.LHCI_GITHUB_APP_TOKEN,
      githubApiHost: 'api.github.com',
      githubStatusContextSuffix: '/lighthouse',
    },
    server: {
      port: 9001,
      storage: {
        storageMethod: 'sql',
        sqlDialect: 'sqlite',
        sqlDatabasePath: '.lighthouseci/lighthouse.db',
      },
    },
    wizard: {
      preset: 'ci',
    },
  },
};
