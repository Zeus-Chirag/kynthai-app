'use client';

import * as React from 'react';
import Link from 'next/link';
import { KynthaiBrand } from './logo';
import { Mail, ShieldCheck, HeartPulse, Twitter, Instagram, Linkedin, Youtube } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* LandingFooter — site footer with navigation links (client island)  */
/* ------------------------------------------------------------------ */
export function LandingFooter() {
  const socials = [
    { label: 'Twitter / X', icon: Twitter, href: 'https://twitter.com/kynthai' },
    { label: 'Instagram', icon: Instagram, href: 'https://instagram.com/kynthai' },
    { label: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com/company/kynthai' },
    { label: 'YouTube', icon: Youtube, href: 'https://youtube.com/@kynthai' },
  ];

  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:gap-6 md:gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="border-b border-border/40 pb-6 md:border-0 md:pb-0">
            <KynthaiBrand />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Health management for families, patients, doctors and labs — in one beautiful app.
              Built for America, by founders who care.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Privacy-first · Secure billing
            </div>
            <a
              href="mailto:privacy@kynthai.app"
              className="mt-3 inline-flex items-center gap-1.5 py-2 -my-2 text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-700"
            >
              <Mail className="h-3.5 w-3.5" />
              privacy@kynthai.app
            </a>
            {/* Social icons */}
            <div className="mt-4 flex items-center gap-3">
              {socials.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/20"
                  aria-label={s.label}
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <FooterColumn
            title="Product"
            links={[
              { label: 'Pricing', href: '/pricing' },
              { label: 'How It Works', href: '/#how-it-works' },
              { label: 'Features', href: '/#bento-features' },
              { label: 'FAQ', href: '/#faq' },
              { label: 'Family Portal', href: '/login' },
              { label: 'Doctor Portal', href: '/login' },
              { label: 'Lab Portal', href: '/login' },
              { label: 'Reviews', href: '/#reviews' },
            ]}
          />

          {/* AI Features */}
          <FooterColumn
            title="AI Features"
            links={[
              { label: 'AI Health Chat', href: '/login' },
              { label: 'Symptom Analyzer', href: '/login' },
              { label: 'Identify Medicine', href: '/login' },
              { label: 'Drug Interactions', href: '/login' },
              { label: 'Prescription Scanner', href: '/login' },
              { label: 'Health Insights', href: '/login' },
              { label: 'Smart Reminders', href: '/login' },
              { label: 'Lab Test Booking', href: '/login' },
            ]}
          />

          {/* Company */}
          <FooterColumn
            title="Company"
            links={[
              { label: 'Privacy Policy', href: '/privacy' },
              { label: 'Terms of Service', href: '/terms' },
              { label: 'Refund & Cancellation', href: '/refund-cancellation' },
              { label: 'Grievance', href: '/grievance' },
              { label: 'Cookie Policy', href: '/cookies' },
              { label: 'Data Subject Rights (CCPA)', href: '/ccpa' },
              { label: 'Accessibility', href: '/accessibility' },
              { label: 'Medical Disclaimer', href: '/medical-disclaimer' },
            ]}
          />
        </div>

        <div className="mt-6 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-4 text-xs text-muted-foreground sm:flex-row sm:items-start">
          <div className="space-y-1 flex-1 min-w-0">
            <p suppressHydrationWarning>© {new Date().getFullYear()} Kynthai™. All rights reserved.</p>
            <p className="text-[10px] leading-relaxed">
              Kynthai Health Technologies LLC · United States
            </p>
            <p className="text-[10px] leading-relaxed">
              Kynthai and the Kynthai logo are trademarks of Kynthai Health Technologies (pending). All
              other trademarks, service marks, and trade names are the property of their respective
              owners.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-700 dark:text-emerald-300">
              Built for America
              <span aria-hidden="true">🇺🇸</span>
            </span>
            <p className="flex items-center gap-1.5">
              Made with <HeartPulse className="h-3 w-3 text-emerald-600" /> for healthier families.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

type FooterLink =
  | { label: string; href: string; onClick?: never }
  | { label: string; href?: never; onClick: () => void };

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <nav aria-label={title}>
      <p className="text-xs font-semibold uppercase tracking-wider text-foreground/80">{title}</p>
      <ul className="mt-2.5 space-y-1.5" role="list">
        {links.map(l => (
          <li key={l.label}>
            {l.href ? (
              <Link
                href={l.href}
                className="inline-block py-1.5 -my-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ) : (
              <button
                onClick={l.onClick}
                className="inline-block py-1.5 -my-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                type="button"
              >
                {l.label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
