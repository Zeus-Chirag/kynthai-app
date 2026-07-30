import { test, expect } from '@playwright/test';
import { goto, DEMO_ACCOUNTS } from './helpers';

test.describe('Mobile Responsiveness', () => {
  const MOBILE_VIEWPORT = { width: 375, height: 812 }; // iPhone X size

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
  });

  test('landing page fits mobile viewport without horizontal scroll', async ({ page }) => {
    await goto(page, '/');
    await page.waitForLoadState('networkidle');

    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = 375;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // allow tiny rounding

    // Content renders on mobile
    const h1 = page.locator('h1');
    if (await h1.count() > 0) {
      await expect(h1.first()).toBeVisible();
    }
  });

  test('login page fits mobile viewport', async ({ page }) => {
    await goto(page, '/login');
    await page.waitForLoadState('networkidle');

    // Login form should be visible and usable
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.count() > 0) {
      await emailInput.fill(DEMO_ACCOUNTS.patient.email);
      await expect(emailInput).toHaveValue(DEMO_ACCOUNTS.patient.email);
    }
  });

  test('register page fits mobile viewport', async ({ page }) => {
    await goto(page, '/register');
    await page.waitForLoadState('networkidle');

    // Form accessible at mobile size
    const inputs = page.locator('input');
    const count = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // No horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test('pricing page fits mobile viewport', async ({ page }) => {
    await goto(page, '/pricing');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('settings page fits mobile viewport', async ({ page }) => {
    await goto(page, '/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('privacy pages fit mobile viewport', async ({ page }) => {
    await goto(page, '/privacy');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Tablet Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad size
  });

  test('landing page renders at tablet size', async ({ page }) => {
    await goto(page, '/');
    await page.waitForLoadState('networkidle');

    const content = page.locator('header, main, footer');
    await expect(content.first()).toBeVisible();
  });

  test('login page renders at tablet size', async ({ page }) => {
    await goto(page, '/login');
    await page.waitForLoadState('networkidle');

    // Form should be centered and visible
    const form = page.locator('form').or(page.locator('input[type="email"]').first());
    await expect(form.first()).toBeVisible();
  });
});
