import { chromium, type FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global E2E test setup...');

  const { baseURL } = config.projects[0].use;

  if (!baseURL) {
    throw new Error('Base URL is not configured');
  }

  // Launch browser for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for application to be ready
    console.log(`⏳ Waiting for application at ${baseURL}...`);
    await page.goto(baseURL, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // Verify core application is loaded
    await page.waitForSelector('[data-testid="app-root"], #root', {
      timeout: 30000,
    });

    console.log('✅ Application is ready for E2E testing');

    // You can perform additional setup here:
    // - Authentication setup
    // - Database seeding
    // - Feature flag configuration
    // - Test data preparation

    // Example: Check if test data endpoints are available
    try {
      const response = await page.request.get('/data/deck-manifest.json');
      if (response.ok()) {
        console.log('✅ Test data endpoints are accessible');
      } else {
        console.warn('⚠️  Test data endpoints may not be available');
      }
    } catch (error) {
      console.warn('⚠️  Could not verify test data endpoints');
    }
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✅ Global E2E setup completed');
}

export default globalSetup;
