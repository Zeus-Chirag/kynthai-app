import { test, expect } from '@playwright/test';

test('debug login', async ({ page }) => {
  page.on('console', msg => console.log('PAGE CONSOLE:', msg.text()))
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message))
  await page.goto('/login');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'e2e-report/login-initial.png', fullPage: true });
  await page.fill('input[type="email"]', 'patient@demo.kyntha.app');
  await page.fill('input[type="password"]', 'Demo@2024');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'e2e-report/login-after.png', fullPage: true });
  console.log('URL after login:', page.url());
});
