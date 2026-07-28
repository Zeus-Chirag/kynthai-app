'use client'

import { TermsOfService } from '@/components/kynthaii/legal/privacy-policy'
import { ErrorBoundary } from '@/components/kynthaii/error-boundary'

export default function TermsPage() {
  return (
    <ErrorBoundary>
      <TermsOfService />
    </ErrorBoundary>
  )
}
