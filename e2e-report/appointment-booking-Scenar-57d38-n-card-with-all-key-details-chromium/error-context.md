# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: appointment-booking.spec.ts >> Scenario 3: Choosing Healthcare Providers >> displays doctor information card with all key details
- Location: e2e/appointment-booking.spec.ts:160:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main"
  - generic [ref=e4]:
    - generic [ref=e5]:
      - button "Back" [ref=e6]:
        - img [ref=e7]
        - text: Back
      - generic [ref=e9]:
        - img "Kynthai icon" [ref=e10]
        - generic [ref=e15]: Kynthai
      - button "Home" [ref=e16]
    - generic [ref=e17]:
      - generic [ref=e18]:
        - heading "Keep the whole family on track with shared reminders." [level=1] [ref=e19]
        - paragraph [ref=e20]: Family portal — sign in or create an account to continue.
        - generic [ref=e21]:
          - button "Family Manage up to 4 family members" [ref=e22]:
            - img [ref=e24]
            - heading "Family" [level=3] [ref=e29]
            - paragraph [ref=e30]: Manage up to 4 family members
          - button "Patient Your personal health companion" [ref=e31]:
            - img [ref=e33]
            - heading "Patient" [level=3] [ref=e36]
            - paragraph [ref=e37]: Your personal health companion
          - button "Doctor Verified practitioners" [ref=e38]:
            - img [ref=e40]
            - heading "Doctor" [level=3] [ref=e44]
            - paragraph [ref=e45]: Verified practitioners
          - button "Lab Diagnostic partners" [ref=e46]:
            - img [ref=e48]
            - heading "Lab" [level=3] [ref=e52]
            - paragraph [ref=e53]: Diagnostic partners
      - generic [ref=e56]:
        - generic [ref=e57]:
          - button "Sign In" [ref=e58]
          - button "Create Account" [ref=e59]
        - generic [ref=e60]:
          - img [ref=e62]
          - generic [ref=e67]:
            - paragraph [ref=e68]: Family portal
            - paragraph [ref=e69]: Manage up to 4 family members
        - generic [ref=e70]:
          - generic [ref=e71]:
            - generic [ref=e72]: Email
            - textbox "Email" [ref=e73]:
              - /placeholder: you@example.com
              - text: patient@demo.kynthai.app
          - generic [ref=e74]:
            - generic [ref=e75]: Password
            - generic [ref=e76]:
              - textbox "Password" [ref=e77]:
                - /placeholder: Enter your password
                - text: Demo@2024
              - button "Show password" [ref=e78]:
                - img [ref=e79]
          - button "Sign In" [ref=e82]:
            - text: Sign In
            - img
        - generic [ref=e83]:
          - img [ref=e84]
          - text: Data encrypted in transit & at rest · HIPAA-aligned
  - generic [ref=e90]:
    - img [ref=e92]
    - generic [ref=e94]:
      - heading "We use cookies" [level=3] [ref=e95]
      - paragraph [ref=e96]:
        - text: Kynthai uses essential cookies for authentication and local storage for preferences. Essential cookies cannot be disabled because they are required for the service to function. With your consent, we also use analytics and marketing cookies to improve your experience. See our
        - button "Privacy Policy" [ref=e97]
        - text: for details, including your CCPA/CPRA rights.
      - generic [ref=e98]:
        - button "Accept all" [ref=e99]
        - button "Essential only" [ref=e100]
        - button "Manage" [ref=e101]
    - button "Close" [ref=e102]:
      - img [ref=e103]
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e111] [cursor=pointer]:
    - img [ref=e112]
  - alert [ref=e115]
```

# Test source

```ts
  1   | /**
  2   |  * Kynthai Healthcare — E2E Appointment Booking & Management Flow Tests
  3   |  * Tests all 8 appointment lifecycle scenarios with screenshots at each step.
  4   |  */
  5   | 
  6   | import { test, expect } from '@playwright/test';
  7   | 
  8   | const DEMO_EMAIL = 'patient@demo.kynthai.app';
  9   | const DEMO_PASSWORD = 'Demo@2024';
  10  | 
  11  | async function loginAsPatient(page: any) {
  12  |   await page.goto('/login');
  13  |   await page.waitForLoadState('networkidle', { timeout: 20000 });
  14  |   const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  15  |   const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  16  |   const submitBtn = page.locator('button[type="submit"]').first();
  17  |   await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  18  |   await emailInput.fill(DEMO_EMAIL);
  19  |   await passwordInput.fill(DEMO_PASSWORD);
  20  |   await submitBtn.click();
> 21  |   await page.waitForURL((url: any) => !url.pathname.includes('login'), { timeout: 15000 });
      |              ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  22  |   await page.waitForTimeout(2000);
  23  | }
  24  | 
  25  | async function openBookingDialog(page: any) {
  26  |   // Try multiple ways to get to the booking dialog
  27  |   // 1. Click "Find Care" tab
  28  |   const findCare = page.locator('button:has-text("Find Care")').first();
  29  |   if (await findCare.count() > 0) {
  30  |     await findCare.click();
  31  |     await page.waitForTimeout(1200);
  32  |   }
  33  |   // 2. Click "Doctors" tab inside market
  34  |   const doctorsTab = page.locator('[role="tab"]:has-text("Doctors")').first();
  35  |   if (await doctorsTab.count() > 0) {
  36  |     await doctorsTab.click();
  37  |     await page.waitForTimeout(800);
  38  |   }
  39  |   // 3. Click Book Video Consult button
  40  |   const bookBtn = page.locator('button:has-text("Book Video Consult")').first();
  41  |   if (await bookBtn.count() > 0) {
  42  |     await bookBtn.click();
  43  |     await page.waitForTimeout(1000);
  44  |     return true;
  45  |   }
  46  |   return false;
  47  | }
  48  | 
  49  | // ═══════════════════════════════════════════════════════════════════════════════
  50  | // SCENARIO 1: Finding and Booking an Appointment
  51  | // ═══════════════════════════════════════════════════════════════════════════════
  52  | test.describe('Scenario 1: Finding and Booking an Appointment', () => {
  53  |   test('displays doctor listings with ratings, fees, and Book buttons', async ({ page }) => {
  54  |     await loginAsPatient(page);
  55  |     await openBookingDialog(page);
  56  |     // Go back to listing
  57  |     page.goto('/patient');
  58  |     await page.waitForTimeout(2000);
  59  | 
  60  |     await page.screenshot({ path: 'e2e-report/S1-doctors-listing.png', fullPage: true });
  61  | 
  62  |     const doctorCards = await page.locator('text=/Dr\\./i').count();
  63  |     console.log(`[S1] Doctor name elements: ${doctorCards}`);
  64  |     expect(doctorCards).toBeGreaterThan(0);
  65  | 
  66  |     const bookButtons = await page.locator('button:has-text("Book Video Consult")').count();
  67  |     console.log(`[S1] "Book Video Consult" buttons: ${bookButtons}`);
  68  |     expect(bookButtons).toBeGreaterThan(0);
  69  |   });
  70  | 
  71  |   test('opens booking dialog with date picker and time slots', async ({ page }) => {
  72  |     await loginAsPatient(page);
  73  |     const dialogOpened = await openBookingDialog(page);
  74  |     expect(dialogOpened).toBe(true);
  75  | 
  76  |     await page.screenshot({ path: 'e2e-report/S1-booking-dialog.png', fullPage: true });
  77  | 
  78  |     const dateInput = page.locator('input[type="date"]').first();
  79  |     expect(await dateInput.count()).toBeGreaterThan(0);
  80  | 
  81  |     const slotButtons = page.locator('button').filter({ hasText: /\d{1,2}:\d{2}/ });
  82  |     const slotCount = await slotButtons.count();
  83  |     console.log(`[S1] Time slot buttons in dialog: ${slotCount}`);
  84  |     expect(slotCount).toBeGreaterThan(0);
  85  |   });
  86  | });
  87  | 
  88  | // ═══════════════════════════════════════════════════════════════════════════════
  89  | // SCENARIO 2: Selecting Available Time Slots
  90  | // ═══════════════════════════════════════════════════════════════════════════════
  91  | test.describe('Scenario 2: Selecting Time Slots', () => {
  92  |   test.beforeEach(async ({ page }) => {
  93  |     await loginAsPatient(page);
  94  |   });
  95  | 
  96  |   test('shows hardcoded time slots regardless of doctor availability', async ({ page }) => {
  97  |     const opened = await openBookingDialog(page);
  98  |     if (!opened) { test.skip(true, 'Booking dialog not accessible'); return; }
  99  | 
  100 |     await page.screenshot({ path: 'e2e-report/S2-time-slots.png', fullPage: true });
  101 | 
  102 |     const allSlots = await page.locator('button').filter({ hasText: /\d{1,2}:\d{2}\s?(AM|PM)/ }).allTextContents();
  103 |     console.log(`[S2] All time slots: ${JSON.stringify(allSlots)}`);
  104 | 
  105 |     // These are the hardcoded TIME_SLOTS in market-view.tsx
  106 |     const expectedSlots = ['09:00 AM', '10:30 AM', '12:00 PM', '02:30 PM', '04:00 PM', '05:30 PM'];
  107 |     for (const slot of expectedSlots) {
  108 |       const found = allSlots.some((s: string) => s.includes(slot.replace(' AM', '').replace(' PM', '')));
  109 |       console.log(`[S2] Slot "${slot}" present: ${found}`);
  110 |     }
  111 |   });
  112 | 
  113 |   test('allows selecting a slot and highlights it visually', async ({ page }) => {
  114 |     const opened = await openBookingDialog(page);
  115 |     if (!opened) { test.skip(true); return; }
  116 | 
  117 |     const firstSlot = page.locator('button').filter({ hasText: /\d{1,2}:\d{2}/ }).first();
  118 |     if (await firstSlot.count() > 0) {
  119 |       await firstSlot.click();
  120 |       await page.waitForTimeout(300);
  121 |       const isSelected = await firstSlot.evaluate((el: any) =>
```