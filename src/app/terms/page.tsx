'use client'

import { TermsOfService } from '@/components/kyntha/legal/privacy-policy'
import { ErrorBoundary } from '@/components/kyntha/error-boundary'

export default function TermsPage() {
  return (
    <ErrorBoundary>
      <TermsOfService />
    </ErrorBoundary>
  )
}
