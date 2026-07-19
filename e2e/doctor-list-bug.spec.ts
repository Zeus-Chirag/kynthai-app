import { test, expect } from '@playwright/test';

test('Doctor listing bug — Care tab shows doctors after portal-loaders fix', async ({ page }) => {
  // Login via API
  const csrfRes = await page.request.get('http://localhost:4000/api/auth/csrf');
  const csrfToken = (await csrfRes.json()).token;
  await page.request.post('http://localhost:4000/api/auth/login', {
    data: { email: 'patient@demo.kyntha.app', password: 'Demo@2024' },
    headers: { 'X-CSRF-Token': csrfToken },
  });

  await page.goto('http://localhost:4000/patient');
  await page.waitForTimeout(5000);

  // Accept cookies consent if present (this blocks clicks)
  const acceptAll = page.locator('button:has-text("Accept all")').first();
  if (await acceptAll.count() > 0) {
    await acceptAll.click();
    await page.waitForTimeout(1000);
  }

  // Dismiss any toast/snackbar at bottom
  const tryAgain = page.locator('button:has-text("Try again")').first();
  if (await tryAgain.count() > 0) {
    await tryAgain.click();
    await page.waitForTimeout(500);
  }

  // Click Care tab — use force: true in case of transient overlays
  const careTab = page.locator('button:has-text("Care")').first();
  expect(await careTab.count()).toBeGreaterThan(0);

  await careTab.click({ force: true });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'e2e-report/care-tab-fixed.png', fullPage: true });

  const doctorNames = await page.locator('text=/Dr\\./i').count();
  const bookBtns = await page.locator('button:has-text("Book Video Consult")').count();

  console.log(`Doctors rendered: ${doctorNames}, Book buttons: ${bookBtns}`);
  expect(doctorNames).toBeGreaterThanOrEqual(1, 'At least one doctor should be visible');
  expect(bookBtns).toBeGreaterThanOrEqual(1, 'Book Video Consult button should exist');
});
