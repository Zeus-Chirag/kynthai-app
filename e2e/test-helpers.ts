/**
 * Shared E2E test helpers for Kynthai.
 *
 * Login via browser page (not page.request) so the CSRF cookie lands in the
 * same cookie jar that the rendered page uses when it submits the login form.
 */

async function fillLoginAndSubmit(page: any, email: string): Promise<void> {
  // Pre-set cookie consent so the bottom banner never blocks clicks on portal pages.
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page
    .evaluate(() => {
      try {
        localStorage.setItem(
          'kynthai-cookie-consent-v1',
          JSON.stringify({ accepted: true, timestamp: Date.now() })
        );
      } catch {
        /* ignore */
      }
    })
    .catch(() => {});

  await page.goto('/login');
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);

  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  const submitBtn = page.locator('#login-submit-btn, button[type="submit"]').first();

  await emailInput.fill(email);
  await passwordInput.fill('Demo@2024');
  await submitBtn.click();

  // Wait for navigation (success redirects away from /login)
  await page.waitForURL(url => !String(url).includes('/login'), { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
}

export async function apiLoginAsPatient(page: any, gotoPath = '/patient'): Promise<void> {
  await fillLoginAndSubmit(page, 'patient@demo.kynthai.app');
  await page.goto(gotoPath);
  await page.waitForTimeout(1000);
}

export async function apiLoginAs(
  page: any,
  portal: string,
  pathMap: Record<string, string> = PORTAL_PATHS
): Promise<void> {
  const emailMap: Record<string, string> = {
    patient: 'patient@demo.kynthai.app',
    doctor: 'priya@demo.kynthai.app',
    family: 'caretaker@demo.kynthai.app',
    lab: 'pathlabs@demo.kynthai.app',
    admin: 'admin@demo.kynthai.app',
  };

  const email = emailMap[portal] || emailMap.patient;
  const targetPath = pathMap[portal] || '/patient';

  await fillLoginAndSubmit(page, email);
  await page.goto(targetPath);
  await page.waitForTimeout(1000);
}

export const PORTAL_PATHS: Record<string, string> = {
  patient: '/patient',
  doctor: '/doctor',
  family: '/family',
  lab: '/lab',
  admin: '/admin',
};

/**
 * Bridge browser cookies into page.request so API calls carry the session.
 */
export async function withAuthCookies(page: any): Promise<string> {
  const cookies = await page.context().cookies('http://localhost:4000');
  return cookies.map(c => `${c.name}=${c.value}`).join('; ');
}
