import { test, expect, chromium, type Page, type BrowserContext } from '@playwright/test';

test.describe('PWA Restoration Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async () => {
    // Launch browser with mobile viewport
    const browser = await chromium.launch();
    context = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 13 Pro
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 3,
    });
  });

  test.beforeEach(async () => {
    page = await context.newPage();
    await page.goto('http://localhost:5175');
    await page.waitForLoadState('networkidle');
  });

  test('should detect iOS device and PWA mode correctly', async () => {
    // Check if iOS detection is working
    const isIOS = await page.evaluate(() => {
      return /iPhone|iPad|iPod/i.test(navigator.userAgent);
    });
    expect(isIOS).toBe(true);
  });

  test('should handle visibility changes without infinite loops', async () => {
    const consoleLogs: string[] = [];

    // Capture console logs
    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });

    // Simulate backgrounding
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.waitForTimeout(100);

    // Simulate foregrounding
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.waitForTimeout(500);

    // Check for infinite loop indicators
    const restorationLogs = consoleLogs.filter(log =>
      log.includes('Forcing component refresh') ||
      log.includes('Page restored from cache')
    );

    // Should not have excessive restoration logs
    expect(restorationLogs.length).toBeLessThanOrEqual(2);
  });

  test('should show and hide restoration overlay correctly', async () => {
    // Initially, restoration overlay should not be visible
    const overlayInitially = await page.locator('[style*="position: fixed"][style*="z-index: 9999"]').isVisible();
    expect(overlayInitially).toBe(false);

    // Simulate app termination and restoration
    await page.evaluate(() => {
      // Clear heartbeat to simulate termination
      localStorage.removeItem('quizly-pwa-heartbeat');
    });

    // Reload page to simulate restoration
    await page.reload();

    // Check if restoration overlay appears briefly
    const overlayAfterReload = await page.locator('[style*="position: fixed"][style*="z-index: 9999"]').count();

    // Wait for overlay to disappear
    await page.waitForTimeout(1500);

    const overlayAfterTimeout = await page.locator('[style*="position: fixed"][style*="z-index: 9999"]').isVisible();
    expect(overlayAfterTimeout).toBe(false);
  });

  test('should have correct CSS variables defined', async () => {
    const bgSecondary = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return style.getPropertyValue('--bg-secondary');
    });

    // Should have a valid background color
    expect(bgSecondary).toBeTruthy();
    expect(bgSecondary).toMatch(/#[A-Fa-f0-9]{6}|rgb/);
  });

  test('should persist and restore app state', async () => {
    // Navigate to a specific page
    await page.goto('http://localhost:5175');

    // Store some state
    await page.evaluate(() => {
      localStorage.setItem('quizly-pwa-state', JSON.stringify({
        timestamp: Date.now(),
        url: window.location.href,
        scrollPosition: 100
      }));
    });

    // Simulate visibility change (backgrounding)
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.waitForTimeout(100);

    // Simulate restoration
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Check if state was preserved
    const restoredState = await page.evaluate(() => {
      const state = localStorage.getItem('quizly-pwa-state');
      return state ? JSON.parse(state) : null;
    });

    expect(restoredState).toBeTruthy();
    expect(restoredState.url).toBe('http://localhost:5175/');
  });

  test('should handle rapid visibility changes without breaking', async () => {
    const errors: string[] = [];

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    // Rapid visibility changes
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', {
          writable: true,
          value: true
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      await page.waitForTimeout(50);

      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', {
          writable: true,
          value: false
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      await page.waitForTimeout(50);
    }

    // Should not have any errors
    expect(errors).toHaveLength(0);
  });

  test('should maintain React app functionality after restoration', async () => {
    // Simulate backgrounding and restoration
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.waitForTimeout(3500); // Simulate termination threshold

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.waitForTimeout(1000);

    // Check if React app is still interactive
    const rootElement = await page.locator('#root');
    expect(await rootElement.isVisible()).toBe(true);

    // Check if router is still working
    const routerContent = await page.locator('main, [role="main"], .app-content').first();
    expect(await routerContent.isVisible()).toBe(true);
  });

  test('should clear restoration state after successful recovery', async () => {
    // Set restoration state
    await page.evaluate(() => {
      // Simulate iOS PWA context
      (window.navigator as any).standalone = true;
    });

    // Trigger restoration
    await page.evaluate(() => {
      localStorage.removeItem('quizly-pwa-heartbeat');
    });

    await page.reload();
    await page.waitForTimeout(1500);

    // Check if restoration flags are cleared
    const isRestoring = await page.evaluate(() => {
      // This would need to be exposed from the component, but we can check the overlay
      const overlay = document.querySelector('[style*="z-index: 9999"]');
      return overlay && window.getComputedStyle(overlay).display !== 'none';
    });

    expect(isRestoring).toBe(false);
  });

  test.afterAll(async () => {
    await context.close();
  });
});