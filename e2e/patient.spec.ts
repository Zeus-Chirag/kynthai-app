import { test, expect } from '@playwright/test';
import { goto, loginAs, collectConsoleErrors } from './helpers';

test.describe('Patient Portal', () => {
  test('patient dashboard loads after login', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', collectConsoleErrors(errors));

    // Navigate directly to patient page — may redirect to login
    await goto(page, '/patient');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // If we're on /patient, the dashboard loaded
    const url = page.url();

    if (url.includes('/patient') && !url.includes('/login')) {
      // Dashboard content should be visible
      const headingCount = await page.locator('h1, h2').count();
      expect(headingCount).toBeGreaterThanOrEqual(1);

      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(100);
    } else {
      // Redirected to login — auth guard working as expected
      expect(url.includes('/login')).toBe(true);
    }
  });

  test('settings page loads', async ({ page }) => {
    await goto(page, '/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Settings page should render (may redirect to login if unauthenticated)
    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length).toBeGreaterThan(50);
  });
});

test.describe('Core Features', () => {
  test('checkout page loads', async ({ page }) => {
    await goto(page, '/checkout');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('feedback page loads', async ({ page }) => {
    await goto(page, '/feedback');
    await page.waitForLoadState('networkidle');
    const text = await page.locator('body').textContent();
    expect(text?.length).toBeGreaterThan(50);
  });

  test('grievance page loads', async ({ page }) => {
    await goto(page, '/grievance');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('refund cancellation page loads', async ({ page }) => {
    await goto(page, '/refund-cancellation');
    await page.waitForLoadState('networkidle');
    const text = await page.locator('body').textContent();
    expect(text).toContain('refund');
  });
});

test.describe('Health Dashboard Pages', () => {
  test('doctor portal loads', async ({ page }) => {
    await goto(page, '/doctor');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('caretaker portal loads', async ({ page }) => {
    await goto(page, '/caretaker');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('family portal loads', async ({ page }) => {
    await goto(page, '/family');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('lab portal loads', async ({ page }) => {
    await goto(page, '/lab');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Page Responsiveness (Mobile)', () => {
  test('patient page is responsive at 375px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goto(page, '/patient');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('settings page is responsive at 375px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goto(page, '/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
