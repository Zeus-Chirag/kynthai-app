'use client';

import * as React from 'react';
import Link from 'next/link';
import { Mail, HeartPulse, ShieldCheck } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* PortalFooter — shared legal footer for all authenticated portals    */
/* Appended after <divn>, sits above the fixed bottom navigation bar. */
/* ------------------------------------------------------------------ */
const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Cookie Policy', href: '/cookies' },
  { label: 'Do Not Sell My Info (CCPA)', href: '/ccpa' },
  { label: 'Data Subject Rights (CCPA)', href: '/ccpa-rights' },
  { label: 'Refund & Cancellation', href: '/refund-cancellation' },
  { label: 'Grievance', href: '/grievance' },
  { label: 'Medical Disclaimer', href: '/medical-disclaimer' },
] as const;

const REGISTERED_OFFICE = '1209 Orange St, Wilmington, DE 19801, United States';

export function PortalFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        {/* Legal links */}
        <nav aria-label="Legal" className="mb-4">
          <ul role="list" className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            {LEGAL_LINKS.map(l => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contact */}
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
          <a
            href="mailto:privacy@kyntha.app?subject=Grievance%20-%20Please%20describe%20your%20issue"
            className="inline-flex items-center gap-1.5 text-emerald-600 transition-colors hover:text-emerald-700"
          >
            <Mail className="h-3.5 w-3.5" />
            Grievance: privacy@kyntha.app
          </a>
          <a
            href="mailto:privacy@kyntha.app"
            className="inline-flex items-center gap-1.5 text-emerald-600 transition-colors hover:text-emerald-700"
          >
            <Mail className="h-3.5 w-3.5" />
            Support: privacy@kyntha.app
          </a>
        </div>

        {/* Registered office + copyright */}
        <div className="space-y-1 text-[11px] text-muted-foreground">
          <p>
            <span className="font-medium text-foreground/70">Registered Office:</span>{' '}
            {REGISTERED_OFFICE}
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            © {new Date().getFullYear()} Kyntha™. All rights reserved.
            <span className="inline-flex items-center gap-1">
              Made with <HeartPulse className="h-3 w-3 text-emerald-600" /> for healthier families.
            </span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              CCPA/CPRA compliant
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
