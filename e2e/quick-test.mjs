import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  
  console.log('[TEST] Navigating to landing page...');
  await page.goto('http://localhost:8000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('[TEST] Title:', await page.title());
  await page.screenshot({ path: 'e2e-report/quick-landing.png' });
  console.log('[TEST] Screenshot saved');
  
  // Check if landing page has doctor-related content
  const bodyText = await page.textContent('body');
  const hasKynthai = bodyText?.includes('Kynthai');
  console.log('[TEST] Has Kynthai branding:', hasKynthai);
  
  await browser.close();
  console.log('[TEST] Quick smoke test PASSED');
}

main().catch(e => { console.error('[TEST] FAILED:', e.message); process.exit(1); });
