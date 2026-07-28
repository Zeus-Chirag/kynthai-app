import { test, expect } from '@playwright/test';

test('quick login sanity', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  await page.fill('input[type="email"]', 'patient@demo.kynthai.app');
  await page.fill('input[type="password"]', 'Demo@2024');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.includes('login'), { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  console.log('URL after wait:', page.url());
  await expect(page.locator('text=Demo mode — sample data')).toBeVisible();
});
