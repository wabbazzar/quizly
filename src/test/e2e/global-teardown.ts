import type { FullConfig } from '@playwright/test';

async function globalTeardown(_config: FullConfig) {
  console.log('🧹 Starting global E2E test teardown...');

  try {
    // Cleanup operations:
    // - Clear test data
    // - Reset test environment
    // - Clean up temporary files
    // - Close external services

    // Example: Clean up any test artifacts
    console.log('🗑️  Cleaning up test artifacts...');

    // You can add cleanup logic here
    // For example, clearing test databases, stopping services, etc.

    console.log('✅ Global E2E teardown completed');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw - allow tests to complete even if cleanup fails
  }
}

export default globalTeardown;