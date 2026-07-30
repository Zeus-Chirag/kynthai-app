import { Page, expect } from '@playwright/test';

// ── Demo account credentials ──────────────────────────────────────────
export const DEMO_ACCOUNTS = {
  patient: { email: 'patient@demo.kynthai.app', password: 'Demo@2024', role: 'patient' },
  caretaker: { email: 'caretaker@demo.kynthai.app', password: 'Demo@2024', role: 'caretaker' },
  doctor: { email: 'priya@demo.kynthai.app', password: 'Demo@2024', role: 'doctor' },
  lab: { email: 'pathlabs@demo.kynthai.app', password: 'Demo@2024', role: 'lab' },
  admin: { email: 'admin@demo.kynthai.app', password: 'Demo@2024', role: 'admin' },
} as const;

export type DemoRole = keyof typeof DEMO_ACCOUNTS;

// ── Navigation ────────────────────────────────────────────────────────

/** Navigate to a path and wait for the page to be fully loaded */
export async function goto(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'networkidle' });
}

/** Assert we're on a specific URL path */
export async function expectPath(page: Page, path: string) {
  await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

/** Fill in an input field by label text */
export async function fillByLabel(page: Page, label: string, value: string) {
  const field = page.getByLabel(label, { exact: false });
  await field.fill(value);
}

/** Click a button by its text content */
export async function clickButton(page: Page, text: string) {
  await page.getByRole('button', { name: text, exact: false }).click();
}

/** Check page has no console errors (call at end of test) */
export async function assertNoConsoleErrors(errors: string[]) {
  const critical = errors.filter(e =>
    !e.includes('favicon') &&
    !e.includes('Failed to load resource') &&
    !e.includes('404')
  );
  expect(critical).toEqual([]);
}

// ── Auth helpers ──────────────────────────────────────────────────────

/** Log in with a demo account — returns the page after login redirect */
export async function loginAs(page: Page, role: DemoRole, expectRedirect?: string) {
  const account = DEMO_ACCOUNTS[role];
  await goto(page, '/login');
  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.fill('input[type="email"]', account.email);
  await page.fill('input[type="password"]', account.password);

  // Click submit
  await page.click('button[type="submit"]');

  // Wait for redirect after login
  if (expectRedirect) {
    await page.waitForURL(`**${expectRedirect}`, { timeout: 15000 });
  } else {
    // Wait for navigation to complete
    await page.waitForTimeout(3000);
  }
}

// ── Response helpers ──────────────────────────────────────────────────

/** Collect console errors during a test — attach to page.on('console') */
export function collectConsoleErrors(errors: string[]) {
  return (msg: { type: () => string; text: () => string }) => {
    if (msg.type() === 'error') errors.push(msg.text().slice(0, 200));
  };
}
