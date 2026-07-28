'use client'

import { TermsOfService } from '@/components/kynthai/legal/privacy-policy'
import { ErrorBoundary } from '@/components/kynthai/error-boundary'

export default function TermsPage() {
  return (
    <ErrorBoundary>
      <TermsOfService />
    </ErrorBoundary>
  )
}
