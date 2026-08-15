import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('ERR: ' + msg.text().slice(0, 200));
    else if (msg.type() === 'warn') errors.push('WARN: ' + msg.text().slice(0, 200));
    else console.log('CONSOLE:', msg.text().slice(0, 80));
  });
  page.on('pageerror', err => errors.push('PAGE ERR: ' + err.message));

  // Login
  console.log('=== Login ===');
  await page.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000/login', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.fill('input[type="email"]', 'patient@demo.kynthai.app');
  await page.fill('input[type="password"]', 'Demo@2024');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/patient', { timeout: 15000 });
  await page.waitForTimeout(5000);

  console.log('URL:', page.url());

  // Click the avatar button (has "K" fallback text)
  console.log('\n=== Clicking avatar (K) button ===');
  const avatarBtn = page.locator('button:has-text("K")').first();
  if (await avatarBtn.count() > 0) {
    await avatarBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/after-avatar-click.png', fullPage: true });

    const afterHTML = await page.locator('body').innerHTML();
    const hasProfile = afterHTML.includes('Profile') || afterHTML.includes('Settings');
    const hasLogout = afterHTML.includes('Log out');
    const hasDarkMode = afterHTML.includes('Dark mode') || afterHTML.includes('Light mode');
    const hasHealthScore = afterHTML.includes('Health Score') || afterHTML.includes('Health');
    console.log('Sheet opened:', hasProfile);
    console.log('Has Log out:', hasLogout);
    console.log('Has Dark mode:', hasDarkMode);
    console.log('Has Health Score:', hasHealthScore);
    console.log('Has Data export:', afterHTML.includes('Export'));
    console.log('Has Delete account:', afterHTML.includes('Delete'));
    console.log('Has Referral:', afterHTML.includes('Referral'));

    if (hasLogout) {
      console.log('\n=== Clicking Log out ===');
      await page.locator('button:has-text("Log out")').first().click();
      await page.waitForTimeout(5000);
      await page.screenshot({ path: '/tmp/after-logout.png', fullPage: true });
      console.log('URL after logout:', page.url());
      const afterBody = await page.textContent('body');
      console.log('On login page:', afterBody?.includes('Sign in'));
    } else {
      console.log('\nFAIL: ProfileHub sheet did not open');
    }
  }

  console.log('\nJS ERRORS:', errors.length ? errors : 'None');
  await browser.close();
})();
