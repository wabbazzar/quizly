import { test, expect } from '@playwright/test';

const GH_PAGES_URL = 'https://wabbazzar.github.io/quizly';
const LOCAL_URL = 'http://localhost:5173/quizly';

test.describe('GitHub Pages Deployment', () => {
  test('should load the app on GitHub Pages URL', async ({ page }) => {
    // Test the actual GitHub Pages deployment
    const response = await page.goto(GH_PAGES_URL, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Check if the page loads successfully
    expect(response?.status()).toBe(200);

    // Check if the root element exists
    await expect(page.locator('#root')).toBeVisible();

    // Check if the app renders correctly
    await expect(page.locator('h1').first()).toBeVisible();

    // Check if routing works
    await page.goto(`${GH_PAGES_URL}/`, { waitUntil: 'networkidle' });
    await expect(page.locator('#root')).toBeVisible();
  });

  test('should handle routing correctly with base path', async ({ page }) => {
    await page.goto(GH_PAGES_URL);

    // Check if internal navigation works
    const learnLink = page.locator('a[href*="/learn"]').first();
    if (await learnLink.isVisible()) {
      await learnLink.click();
      await expect(page.url()).toContain('/quizly/learn');
    }
  });

  test('should load PWA manifest and service worker', async ({ page }) => {
    await page.goto(GH_PAGES_URL);

    // Check if manifest is loaded
    const manifestResponse = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (link) {
        const response = await fetch(link.href);
        return {
          ok: response.ok,
          status: response.status,
          href: link.href,
        };
      }
      return null;
    });

    expect(manifestResponse).not.toBeNull();
    expect(manifestResponse?.ok).toBe(true);

    // Check if service worker registration is attempted
    const swRegistration = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });

    expect(swRegistration).toBe(true);
  });

  test('should load static assets with correct base path', async ({ page }) => {
    await page.goto(GH_PAGES_URL);

    // Intercept failed requests
    const failedRequests: string[] = [];
    page.on('requestfailed', request => {
      failedRequests.push(request.url());
    });

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that critical assets loaded
    const jsFiles = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      return scripts.map(s => (s as HTMLScriptElement).src);
    });

    const cssFiles = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      return links.map(l => (l as HTMLLinkElement).href);
    });

    // Verify assets have correct base path
    jsFiles.forEach(url => {
      expect(url).toContain('/quizly/');
    });

    cssFiles.forEach(url => {
      expect(url).toContain('/quizly/');
    });

    // Check that no critical assets failed to load
    const criticalFailures = failedRequests.filter(
      url => url.includes('.js') || url.includes('.css') || url.includes('index.html')
    );

    expect(criticalFailures).toHaveLength(0);
  });
});

test.describe('Local Development with Base Path', () => {
  test.skip('should work locally with base path', async ({ page }) => {
    // This test would run against local dev server with base path
    await page.goto(LOCAL_URL);
    await expect(page.locator('#root')).toBeVisible();
  });
});
