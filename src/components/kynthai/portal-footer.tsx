'use client';

import * as React from 'react';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/* PortalFooter — minimal legal footer for all authenticated portals.  */
/* Renders above the fixed bottom nav (pb-24 clears the nav height).  */
/*                                                                     */
/* Deliberately trimmed to the links that matter on authenticated      */
/* screens: health-data privacy docs + ToS + CCPA rights link.         */
/* The full legal set (Cookies, Refunds, Medical Disclaimer,           */
/* Accessibility, Grievance) stays on the landing page footer, where   */
/* unauthenticated visitors see it.                                    */
/* ------------------------------------------------------------------ */
const LEGAL_LINKS = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Privacy Practices', href: '/privacy-practices' },
  { label: 'Patient Rights', href: '/patient-rights' },
  { label: 'Terms', href: '/terms' },
  { label: 'Do Not Sell (CCPA)', href: '/ccpa' },
] as const;

export function PortalFooter() {
  return (
    <footer className="border-t border-border/40 bg-background/60">
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-4 sm:px-6">
        <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          {LEGAL_LINKS.map(l => (
            <Link
              key={l.label}
              href={l.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <p suppressHydrationWarning className="mt-2 text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Kynthai™. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
