/**
 * Extracts internal landing-page components into separate section files.
 * Run: node scripts/split-landing.js
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(process.cwd(), 'src/components/kyntha/landing-page.tsx');
const SECTIONS_DIR = path.join(process.cwd(), 'src/components/kyntha/sections');
const content = fs.readFileSync(FILE, 'utf-8');

// Ensure sections dir exists
if (!fs.existsSync(SECTIONS_DIR)) fs.mkdirSync(SECTIONS_DIR, { recursive: true });

/**
 * Extract a component between start and end line numbers (1-indexed, inclusive).
 * We know the exact line numbers from the awk scan.
 */

function extract(name, start, end, fileName, extraHeader = '') {
  const lines = content.split('\n');
  const slice = lines.slice(start - 1, end);

  // Determine imports needed from the slice
  const needsReact = slice.some(l =>
    /React\.useState|React\.ComponentType|React\.useEffect|React\.useMemo|React\.useCallback|React\.useRef|const \[.*\] = React/i.test(
      l
    )
  );
  const needsLucide = match => {
    const icons = [];
    for (const [i, l] of slice.entries()) {
      if (match(l, i, slice)) icons.push('some');
    }
    return icons.length > 0;
  };

  // Scan for specific imports used
  const iconSet = new Set();
  const iconPatterns = [
    'Sparkles',
    'Bell',
    'AlertTriangle',
    'Users',
    'Stethoscope',
    'ShieldCheck',
    'ShieldPlus',
    'Scale',
    'Server',
    'ArrowRight',
    'Check',
    'HeartPulse',
    'Mail',
    'Gift',
    'Pill',
    'Lock',
    'FlaskConical',
    'Video',
    'Camera',
    'ShoppingBag',
    'Languages',
    'Microscope',
    'DollarSign',
    'Globe',
    'Accessibility',
    'UserPlus',
    'Phone',
    'Package',
    'ScanSearch',
    'Bot',
    'TrendingUp',
    'CreditCard',
    'CheckCircle',
    'Siren',
    'Zap',
    'DollarSign',
    'ChevronRight',
    'Twitter',
    'Instagram',
    'Linkedin',
    'Youtube',
    'Mail as MailIcon',
  ];

  // Generic scan: look for <XIcon where X starts with uppercase
  const iconRegex = /<([A-Z]\w+)\s+className=/g;
  const mentioned = new Set();
  let m;
  const headerStr = slice.join('\n').substring(0, 5000);
  while ((m = iconRegex.exec(headerStr)) !== null) {
    mentioned.add(m[1]);
  }

  // Remove AnchorIcon (from lucide) — keep it
  // Filter to lucide icons only
  const ALL_LUCIDE = new Set([
    'Sparkles',
    'Bell',
    'AlertTriangle',
    'Users',
    'Stethoscope',
    'ShieldCheck',
    'ShieldPlus',
    'Scale',
    'Server',
    'ArrowRight',
    'Check',
    'HeartPulse',
    'Mail',
    'Gift',
    'Pill',
    'Lock',
    'FlaskConical',
    'Video',
    'Camera',
    'ShoppingBag',
    'Languages',
    'Microscope',
    'DollarSign',
    'Globe',
    'Accessibility',
    'UserPlus',
    'Phone',
    'Package',
    'ScanSearch',
    'Bot',
    'TrendingUp',
    'CreditCard',
    'CheckCircle',
    'Siren',
    'ChevronRight',
    'Twitter',
    'Instagram',
    'Linkedin',
    'Youtube',
    'Lock',
  ]);
  const lucideIcons = [...mentioned].filter(i => ALL_LUCIDE.has(i));

  // Scan for UI components
  const uiComponents = new Set();
  const uiPatterns = [
    'Button',
    'Card',
    'CardContent',
    'Badge',
    'Accordion',
    'AccordionItem',
    'AccordionTrigger',
    'AccordionContent',
    'Separator',
  ];
  for (const ui of uiPatterns) {
    if (
      content
        .substring(content.indexOf(slice[0]) - 200, content.indexOf(slice[0]))
        .includes(`from '@/components/ui/${ui.toLowerCase()}`) ||
      content.substring(content.indexOf(slice[0]) - 500, content.indexOf(slice[0])).includes(ui)
    ) {
      // Actually let's just check from the file segments containing this component
      if (headerStr.includes(`<${ui}`) || headerStr.includes(`{${ui}`)) {
        uiComponents.add(ui);
      }
    }
  }

  // Scan for imports from src/
  const sectionHeader = slice.slice(0, 20).join('\n');
  const customImports = [];
  const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
  let im;
  while ((im = importRegex.exec(sectionHeader)) !== null) {
    if (im[1].startsWith('@/') && !im[1].startsWith('@/components/ui/')) {
      customImports.push(im[0]);
    }
  }

  // Check if cn is used
  const usesCn = slice.some(l => /cn\(/.test(l) || /\bcn\b/.test(l));
  const usesReact = slice.some(l => /\bReact\./.test(l) || /React\.FC|React\.use/.test(l));
  const usesType = slice.some(l => /LoginPortal/.test(l));
  const usesUseAppStore = slice.some(l => /useAppStore/.test(l));
  const usesFormatPrice = slice.some(l => /formatPrice/.test(l));
  const usesPRICING = slice.some(l => /PRICING/.test(l));
  const usesYearlySavings = slice.some(l => /yearlySavingsPct/.test(l));
  const usesDoctorsFee = slice.some(l => /DOCTOR_BASE_FEE_PCT/.test(l));
  const usesLabsFee = slice.some(l => /LAB_BASE_FEE_PCT/.test(l));
  const usesCurrency = slice.some(l => /PRICING|formatPrice|yearlySavingsPct/.test(l));

  // Check for SmallFeature being rendered
  const usesSmallFeature = slice.some(l => /<SmallFeature/.test(l));

  // Build header
  let header = "'use client';\n\n";
  if (usesReact) {
    header += "import React from 'react';\n";
  }
  if (lucideIcons.length > 0) {
    header += `import { ${lucideIcons.join(', ')} } from 'lucide-react';\n`;
  }

  const uiMap = {
    Button: `import { Button } from '@/components/ui/button';\n`,
    Card: `import { Card, CardContent } from '@/components/ui/card';\n`,
    Badge: `import { Badge } from '@/components/ui/badge';\n`,
    Accordion: `import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';\n`,
    Separator: `import { Separator } from '@/components/ui/separator';\n`,
  };

  if (uiComponents.has('Card')) header += uiMap['Card'];
  if (uiComponents.has('Button')) header += uiMap['Button'];
  if (uiComponents.has('Badge')) header += uiMap['Badge'];
  if (uiComponents.has('Accordion')) header += uiMap['Accordion'];
  if (uiComponents.has('Separator')) header += uiMap['Separator'];

  if (usesCn) header += "import { cn } from '@/lib/utils';\n";
  if (usesType) header += "import type { LoginPortal } from '@/lib/store';\n";
  if (usesUseAppStore) header += "import { useAppStore } from '@/lib/store';\n";
  if (usesCurrency || usesPRICING || usesFormatPrice)
    header += "import { PRICING, formatPrice, yearlySavingsPct } from '@/lib/currency';\n";
  if (usesDoctorsFee) header += "import { DOCTOR_BASE_FEE_PCT } from '@/lib/commission';\n";
  if (usesLabsFee) header += "import { LAB_BASE_FEE_PCT } from '@/lib/commission';\n";

  if (extraHeader) header += extraHeader + '\n';

  header += '\n';

  // Write file
  const fullContent = header + slice.join('\n');
  fs.writeFileSync(path.join(SECTIONS_DIR, fileName), fullContent);
  console.log(`  Created: sections/${fileName} (${slice.length} lines)`);

  return { start, end, fileName };
}

// Extract components based on line numbers from the fenced blocks above
// We need to be precise about line numbers since reading showed exact boundaries

const sections = extract('proof-strip.tsx', 76, 140, 'proof-strip.tsx');
extract('trust-stats.tsx', 228, 276, 'trust-stats.tsx');
extract('feature-strip.tsx', 365, 392, 'feature-strip.tsx');
// BentoFeatures + SmallFeature: 393-659
extract('bento-features.tsx', 393, 622, 'bento-features.tsx');
// SmallFeature needs to be in bento-features.tsx - re-append it
bextract('bento-features.tsx', 623, 659, 'bento-features.tsx');
extract('user-type-features.tsx', 660, 810, 'user-type-features.tsx');
extract('value-statements.tsx', 813, 884, 'value-statements.tsx');
extract('founder-story.tsx', 887, 958, 'founder-story.tsx');
extract('launch-cta.tsx', 961, 1003, 'launch-cta.tsx');
// EmailCapture: 1006-1079
extract('email-capture.tsx', 1006, 1079, 'email-capture.tsx');
extract('honest-social-proof.tsx', 1082, 1176, 'honest-social-proof.tsx');
extract('pricing-teaser.tsx', 1179, 1386, 'pricing-teaser.tsx');
extract('commission-section.tsx', 1389, 1469, 'commission-section.tsx');
extract('us-trust.tsx', 1472, 1565, 'us-trust.tsx');
extract('faq-section.tsx', 1568, 1641, 'faq-section.tsx');

console.log('\nAll section files extracted.');
