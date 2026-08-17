import type { Metadata } from 'next'
import Link from 'next/link'
import { ErrorBoundary } from '@/components/kynthai/error-boundary'

export const metadata: Metadata = {
  title: 'Legal & Privacy',
  description: 'All Kynthai legal documents — privacy policy, terms, CCPA rights, and more.',
}

const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '/privacy', description: 'How we collect, use, and protect your health data.' },
  { label: 'Privacy Practices', href: '/privacy-practices', description: 'US consumer health privacy under applicable laws.' },
  { label: 'Terms of Service', href: '/terms', description: 'The agreement between you and Kynthai.' },
  { label: 'Do Not Sell My Information (CCPA)', href: '/ccpa', description: 'Your California privacy rights — opt out of data sale/sharing.' },
  { label: 'Patient Rights', href: '/patient-rights', description: 'Your rights as a Kynthai platform user.' },
  { label: 'Refund & Cancellation', href: '/refund-cancellation', description: 'How billing, refunds, and cancellations work.' },
  { label: 'Medical Disclaimer', href: '/medical-disclaimer', description: 'Kynthai is not a substitute for professional medical advice.' },
  { label: 'Accessibility Statement', href: '/accessibility', description: 'WCAG 2.1 AA commitment and accessibility features.' },
  { label: 'Cookie Policy', href: '/cookies', description: 'How we use cookies and tracking technologies.' },
  { label: 'Grievance', href: '/grievance', description: 'How to report concerns or file a complaint.' },
]

export default function LegalPage() {
  return (
    <ErrorBoundary>
      <div className="min-h-dvh bg-background">
        <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center px-4 py-3">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
            <h1 className="ml-4 text-lg font-semibold">Legal &amp; Privacy</h1>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-8">
          <p className="mb-6 text-sm text-muted-foreground">
            You agreed to our Terms of Service and Privacy Policy when you signed up.
            Below are all legal documents for reference.
          </p>

          <ul className="space-y-1">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex items-center justify-between rounded-lg border border-border/60 p-4 transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/5"
                >
                  <div>
                    <p className="text-sm font-medium">{link.label}</p>
                    <p className="text-xs text-muted-foreground">{link.description}</p>
                  </div>
                  <span className="text-muted-foreground">→</span>
                </Link>
              </li>
            ))}
          </ul>

          <p suppressHydrationWarning className="mt-8 text-center text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} Kynthai™. All rights reserved.
          </p>
        </main>
      </div>
    </ErrorBoundary>
  )
}
