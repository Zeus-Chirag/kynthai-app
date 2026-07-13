# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: appointment-booking.spec.ts >> Scenario 5: Viewing Upcoming Appointments >> appointments API returns patient appointments
- Location: e2e/appointment-booking.spec.ts:302:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
Call log:
  - navigating to "http://localhost:3000/login", waiting until "load"

```

# Test source

```ts
  1   | /**
  2   |  * Kyntha Healthcare — E2E Appointment Booking & Management Flow Tests
  3   |  * Tests all 8 appointment lifecycle scenarios with screenshots at each step.
  4   |  */
  5   | 
  6   | import { test, expect } from '@playwright/test';
  7   | 
  8   | const DEMO_EMAIL = 'patient@demo.kyntha.app';
  9   | const DEMO_PASSWORD = 'Demo@2024';
  10  | 
  11  | async function loginAsPatient(page: any) {
> 12  |   await page.goto('/login');
      |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
  13  |   await page.waitForLoadState('networkidle', { timeout: 20000 });
  14  |   const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  15  |   const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  16  |   const submitBtn = page.locator('button[type="submit"]').first();
  17  |   await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  18  |   await emailInput.fill(DEMO_EMAIL);
  19  |   await passwordInput.fill(DEMO_PASSWORD);
  20  |   await submitBtn.click();
  21  |   await page.waitForURL((url: any) => !url.pathname.includes('login'), { timeout: 15000 });
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
```