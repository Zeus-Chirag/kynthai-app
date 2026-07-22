'use client';

import * as React from 'react';
import Link from 'next/link';
import { Mail, HeartPulse, ShieldCheck, HelpCircle, Phone, AlertTriangle } from 'lucide-react';

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
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">

        {/* ── Help & Support ─────────────────────────────────────── */}
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Need help?
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="mailto:hello@kyntha.app?subject=Help+Request"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  Help Center
                </a>
                <a
                  href="mailto:hello@kyntha.app?subject=Talk+to+Human"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Talk to a human
                </a>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-600 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Medical Emergency? Call 911</span>
            </div>
          </div>
        </div>

        {/* ── Legal links ─────────────────────────────────────── */}
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