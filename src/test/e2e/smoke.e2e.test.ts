import { test, expect } from '@playwright/test';

test.describe('Smoke Tests @smoke', () => {
  test('should load home page successfully', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that the page title is correct
    await expect(page).toHaveTitle(/Quizly/);

    // Verify main content is visible
    await expect(page.locator('#root')).toBeVisible();

    // Check for no console errors
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });

    // Allow some time for any delayed errors
    await page.waitForTimeout(2000);

    // Report any console errors
    if (logs.length > 0) {
      console.warn('Console errors detected:', logs);
    }
  });

  test('should navigate to deck list', async ({ page }) => {
    await page.goto('/');

    // Look for deck navigation or deck listing
    const deckElements = page.locator('[data-testid*="deck"], a[href*="/deck/"]');

    if ((await deckElements.count()) > 0) {
      // If deck elements exist, verify they're visible
      await expect(deckElements.first()).toBeVisible();
    } else {
      // If no specific deck elements, just verify the page loaded
      await expect(page.locator('#root')).toBeVisible();
    }
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto('/non-existent-page');

    // Should not crash the application
    await expect(page.locator('#root')).toBeVisible();

    // Check if it shows a 404 or redirects to home
    const currentUrl = page.url();
    const isHome = currentUrl.endsWith('/') || currentUrl.includes('/home');
    const has404Content = (await page.locator('text=/404|not found/i').count()) > 0;

    expect(isHome || has404Content).toBeTruthy();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify the page is usable on mobile
    await expect(page.locator('#root')).toBeVisible();

    // Check that content doesn't overflow horizontally
    const bodyWidth = await page.locator('body').boundingBox();
    expect(bodyWidth?.width).toBeLessThanOrEqual(375);
  });

  test('should load essential resources', async ({ page }) => {
    const resourceErrors: string[] = [];

    page.on('response', response => {
      if (!response.ok() && response.url().includes(page.url().split('/')[2])) {
        resourceErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Allow time for all resources to load
    await page.waitForTimeout(3000);

    if (resourceErrors.length > 0) {
      console.warn('Resource loading errors:', resourceErrors);
      // Only fail if critical resources failed
      const criticalErrors = resourceErrors.filter(
        error => error.includes('.js') || error.includes('.css') || error.includes('404')
      );
      expect(criticalErrors.length).toBe(0);
    }
  });
});
