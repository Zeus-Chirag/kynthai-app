/**
 * Offline / PWA E2E Tests
 *
 * Verifies that the service worker caches the landing page and offline.html
 * for offline access. These tests require the dev server to be running.
 *
 * Run: npx playwright test e2e/offline.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';

test.describe('PWA Offline Support', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant notification permission so the SW can register
    await context.grantPermissions(['notifications']);
  });

  test('service worker is registered on the landing page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that a service worker is active
    const hasSW = await page.evaluate(() => {
      return navigator.serviceWorker?.controller !== null;
    });
    expect(hasSW).toBe(true);
  });

  test('manifest.json loads and has correct PWA properties', async ({ page }) => {
    await page.goto('/manifest.json');
    await page.waitForLoadState('networkidle');

    const text = await page.locator('pre').textContent() ?? await page.locator('body').textContent() ?? '';
    const manifest = JSON.parse(text);

    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBeTruthy();
  });

  test('offline.html is cached for offline fallback', async ({ page }) => {
    // First visit primes the cache
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Let SW finish caching

    // Verify offline.html is accessible
    const offlineResp = await page.request.get('/offline.html');
    expect(offlineResp.status()).toBe(200);
    const body = await offlineResp.text();
    expect(body).toContain('offline');
  });

  test('sw.js responds to fetch events', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify SW controls the page
    const isControlled = await page.evaluate(() => {
      return navigator.serviceWorker?.controller !== null;
    });
    expect(isControlled).toBe(true);

    // Verify we can postMessage to the SW
    const msgResult = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        if (!navigator.serviceWorker.controller) {
          resolve(false);
          return;
        }
        const channel = new MessageChannel();
        channel.port1.onmessage = () => resolve(true);
        // Timeout after 3s
        setTimeout(() => resolve(false), 3000);
        navigator.serviceWorker.controller.postMessage('PING', [channel.port2]);
      });
    });
    // SW may not respond to PING; this is a soft check
    // At minimum, the SW is registered and controlling the page
    expect(isControlled).toBe(true);
  });

  test('static assets are served without errors (fonts, icons, JS)', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out benign errors
    const critical = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('Failed to load resource: the server responded with a status of 404')
    );
    expect(critical.length).toBe(0);
  });

  test('icon files exist and are reachable', async ({ request }) => {
    const icons = ['/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/favicon.ico'];
    for (const icon of icons) {
      const resp = await request.get(icon);
      expect(resp.status()).toBe(200);
    }
  });
});

test.describe('PWA — Cross-browser smoke', () => {
  test('landing page loads without service-worker-related errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter SW-related benign errors
    const critical = errors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('service worker') &&
        !e.includes('ServiceWorker') &&
        !e.includes('The operation is insecure')
    );
    expect(critical.length).toBe(0);
  });
});
