import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

interface TestPage {
  path: string;
  name: string;
}

const PAGES_TO_TEST: TestPage[] = [
  { path: '/', name: 'Landing' },
  { path: '/login', name: 'Login' },
  { path: '/patient', name: 'Patient Portal' },
  { path: '/doctor', name: 'Doctor Portal' },
  { path: '/caretaker', name: 'Caretaker Portal' },
  { path: '/lab', name: 'Lab Portal' },
];

for (const tp of PAGES_TO_TEST) {
  test(`${tp.name} - WCAG AA audit`, async ({ page }) => {
    await page.goto(`${BASE_URL}${tp.path}`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Run axe accessibility audit
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa', 'wcag21aa', 'best-practice'])
      .analyze();
    
    console.log(`${tp.name} (${tp.path}):`);
    console.log(`  Violations: ${accessibilityScanResults.violations.length}`);
    console.log(`  Passes: ${accessibilityScanResults.passes.length}`);
    console.log(`  Incomplete: ${accessibilityScanResults.incomplete.length}`);
    
    if (accessibilityScanResults.violations.length > 0) {
      console.log('  VIOLATIONS:');
      for (const violation of accessibilityScanResults.violations) {
        console.log(`    - ${violation.id}: ${violation.description} (impact: ${violation.impact})`);
        console.log(`      Nodes: ${violation.nodes.length}`);
        for (const node of violation.nodes.slice(0, 3)) {
          console.log(`      - ${node.html.substring(0, 100)}...`);
        }
      }
    }
    
    // Fail if any critical/serious violations
    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    
    if (criticalViolations.length > 0) {
      throw new Error(`${tp.name} has ${criticalViolations.length} critical/serious WCAG AA violations`);
    }
  });
}