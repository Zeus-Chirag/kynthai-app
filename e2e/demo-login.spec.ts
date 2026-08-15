import { test, expect } from '@playwright/test';

test.describe('Demo Login Flow', () => {
  test('patient demo can login via demo button', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Verify demo buttons are visible
    const demoBtn = page.locator('button:has-text("Demo Patient")');
    await expect(demoBtn).toBeVisible({ timeout: 5000 });
    console.log('[Demo] Demo Patient button visible');

    // Click demo button
    await demoBtn.click();
    await page.waitForTimeout(2000);

    // Should redirect to /patient
    console.log('[Demo] URL after click:', page.url());
    await expect(page.url()).toContain('/patient');
  });

  test('doctor demo can login via demo button', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const demoBtn = page.locator('button:has-text("Demo Doctor")');
    await expect(demoBtn).toBeVisible({ timeout: 5000 });
    await demoBtn.click();
    await page.waitForTimeout(2000);

    console.log('[Demo] URL after doctor click:', page.url());
    await expect(page.url()).toContain('/doctor');
  });

  test('family demo can login via demo button', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const demoBtn = page.locator('button:has-text("Demo Family")');
    await expect(demoBtn).toBeVisible({ timeout: 5000 });
    await demoBtn.click();
    await page.waitForTimeout(2000);

    console.log('[Demo] URL after family click:', page.url());
    await expect(page.url()).toContain('/caretaker');
  });

  test('lab demo can login via demo button', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const demoBtn = page.locator('button:has-text("Demo Lab")');
    await expect(demoBtn).toBeVisible({ timeout: 5000 });
    await demoBtn.click();
    await page.waitForTimeout(2000);

    console.log('[Demo] URL after lab click:', page.url());
    await expect(page.url()).toContain('/lab');
  });
});
