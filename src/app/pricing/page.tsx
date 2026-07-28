import { Metadata } from 'next'
import { PricingPage } from '@/components/kynthaii/pricing-page'
import { ErrorBoundary } from '@/components/kynthaii/error-boundary'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Kynthai pricing plans — Free, Plus, and Family Pro health management plans for US families. Secure card and ACH billing.',
  openGraph: {
    title: 'Kynthai Pricing — AI Health Plans for American Families',
    description: 'Free, Plus ($9/mo), Family Pro ($19/mo) with secure card and ACH billing. AI health plans for US families.',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kynthai Pricing — AI Health Plans for American Families',
    description: 'Free, Plus ($9/mo), Family Pro ($19/mo) with secure card and ACH billing. AI health plans for US families.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
}

export default function PricingRoutePage() {
  return (
    <ErrorBoundary>
      <PricingPage />
    </ErrorBoundary>
  )
}
