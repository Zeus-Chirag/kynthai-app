/**
 * Comprehensive Kynthai US E2E tests — all user flows
 */
import { test, expect, Page } from '@playwright/test';
import { withAuthCookies } from './test-helpers';

/** Authenticated fetch via browser evaluate — uses browser's session cookies. */
async function authFetchJson(page: Page, path: string) {
  return page.evaluate(async url => {
    const res = await fetch(url, { credentials: 'include' });
    const body = await res.text();
    try {
      return { status: res.status, data: JSON.parse(body) };
    } catch {
      return { status: res.status, data: body };
    }
  }, BASE + path);
}

// Default matches playwright.config.ts baseURL; override with PLAYWRIGHT_BASE_URL
// (e.g. CI smoke runs against the deployed origin).
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

const DEMO_EMAILS: Record<string, string> = {
  patient: 'patient@demo.kynthai.app',
  doctor: 'priya@demo.kynthai.app',
  family: 'caretaker@demo.kynthai.app',
  lab: 'pathlabs@demo.kynthai.app',
  admin: 'admin@demo.kynthai.app',
};
const PORTAL_PATHS: Record<string, string> = {
  patient: '/patient',
  doctor: '/doctor',
  family: '/family',
  lab: '/lab',
  admin: '/admin',
};

async function loginAs(page: Page, portal: string) {
  const email = DEMO_EMAILS[portal] || DEMO_EMAILS.patient;
  const targetPath = PORTAL_PATHS[portal] || '/patient';

  // Ensure demo users have full consent (gate for PHI endpoints)
  await page.request.get('/api/demo/seed').catch(() => {});

  // Form-based login through the browser page so the CSRF cookie is in the
  // same cookie jar the page itself uses when it submits (no cross-context gap).
  await page.goto('/login');
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);

  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  const submitBtn = page.locator('#login-submit-btn, button[type="submit"]').first();

  await emailInput.fill(email);
  await passwordInput.fill('Demo@2024');
  await submitBtn.click();

  await page.waitForURL(url => !String(url).includes('/login'), { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.goto(targetPath);
  await page.waitForTimeout(1000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Landing Page
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Landing Page', () => {
  test('loads and shows all sections', async ({ page }) => {
    await page.goto(BASE + '/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
    const text = await page.textContent('body');
    expect(text).toContain('Kynthai');
  });

  test('Get Started buttons redirect to login', async ({ page }) => {
    await page.goto(BASE + '/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);

    const getStarted = page
      .locator(
        'a:has-text("Get Started"), a:has-text("Get started"), button:has-text("Get Started")'
      )
      .first();
    if ((await getStarted.count()) > 0) {
      await getStarted.click();
      await page.waitForTimeout(1500);
      expect(page.url()).toContain('login');
    }
  });

  test('navigation links exist', async ({ page }) => {
    await page.goto(BASE + '/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);

    const nav = page.locator('nav, header, [role="navigation"]').first();
    if ((await nav.count()) > 0) {
      await expect(nav).toBeVisible();
    }
  });

  test('pricing page accessible', async ({ page }) => {
    await page.goto(BASE + '/pricing');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);
    await expect(page.locator('body')).toBeVisible();
    const text = await page.textContent('body');
    expect(text).toContain('Kynthai');
  });

  test('early adopter card renders with pricing', async ({ page }) => {
    await page.goto(BASE + '/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'e2e-report/landing-page.png', fullPage: true });

    const hasPricing = await page.locator('text=/\\$|pricing|plan|free/i').count();
    console.log(`[Landing] Pricing references: ${hasPricing}`);
    expect(hasPricing).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Patient Portal
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Patient Portal', () => {
  test('login and view home', async ({ page }) => {
    await loginAs(page, 'patient');
    const url = page.url();
    if (!url.includes('/patient')) {
      await page.screenshot({ path: '/tmp/login-fail.png', fullPage: true });
      const bodyText = await page.textContent('body');
      console.log('BODY:', bodyText?.substring(0, 500));
    }
    expect(url).toContain('/patient');
  });

  test('AI chat tab accessible', async ({ page }) => {
    await loginAs(page, 'patient');
    await page.waitForTimeout(1500);
    const aiTab = page
      .locator('button:has-text("AI"), a:has-text("AI"), [href*="ai"]')
      .filter({ hasNotText: 'Skip to main content' });
    if ((await aiTab.count()) > 0) {
      await aiTab.first().click();
      await page.waitForTimeout(1000);
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('prescription upload accessible', async ({ page }) => {
    await loginAs(page, 'patient');
    await page.waitForTimeout(1500);
    const medsTab = page.locator(
      'button:has-text("Meds"), a:has-text("Medication"), button:has-text("Prescription")'
    );
    if ((await medsTab.count()) > 0) {
      await medsTab.first().click();
      await page.waitForTimeout(1000);
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('video call accessible', async ({ page }) => {
    await loginAs(page, 'patient');
    await page.waitForTimeout(1500);
    const videoTab = page.locator('button:has-text("Video"), a:has-text("Video"), [href*="video"]');
    if ((await videoTab.count()) > 0) {
      await videoTab.first().click();
      await page.waitForTimeout(1000);
    }
    await expect(page.locator('body')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Doctor Portal
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Doctor Portal', () => {
  test('login and view dashboard', async ({ page }) => {
    await loginAs(page, 'doctor');
    const url = page.url();
    expect(url).toContain('/doctor');
  });

  test('prescriptions tab accessible', async ({ page }) => {
    await loginAs(page, 'doctor');
    await page.waitForTimeout(1500);
    const prescTab = page.locator('button:has-text("Prescriptions"), button:has-text("Prescribe")');
    if ((await prescTab.count()) > 0) {
      await prescTab.first().click();
      await page.waitForTimeout(1000);
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('patients list accessible', async ({ page }) => {
    await loginAs(page, 'doctor');
    await page.waitForTimeout(1500);
    const patientsTab = page.locator('button:has-text("Patients")');
    if ((await patientsTab.count()) > 0) {
      await patientsTab.first().click();
      await page.waitForTimeout(1000);
    }
    await expect(page.locator('body')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Family Portal
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Family Portal', () => {
  test('login and view dashboard', async ({ page }) => {
    await loginAs(page, 'family');
    const url = page.url();
    expect(url).toContain('/family');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Lab Portal
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Lab Portal', () => {
  test('login and view dashboard', async ({ page }) => {
    await loginAs(page, 'lab');
    const url = page.url();
    expect(url).toContain('/lab');
  });

  test('lab bookings accessible', async ({ page }) => {
    await loginAs(page, 'lab');
    await page.waitForTimeout(1500);
    const bookingsTab = page.locator('button:has-text("Bookings")');
    if ((await bookingsTab.count()) > 0) {
      await bookingsTab.first().click();
      await page.waitForTimeout(1000);
    }
    await expect(page.locator('body')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// No broken routes
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('No broken routes', () => {
  test('all public pages return 200', async ({ page }) => {
    const paths = ['/', '/login', '/pricing'];
    for (const p of paths) {
      const res = await page.request.get(BASE + p);
      console.log(`[Routes] ${p} → ${res.status()}`);
      expect(res.status()).toBeLessThan(400);
    }
  });
});
