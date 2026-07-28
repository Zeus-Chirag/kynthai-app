'use client'

import { CookiePolicy } from '@/components/kynthaii/legal/privacy-policy'
import { ErrorBoundary } from '@/components/kynthaii/error-boundary'

export default function CookiesPage() {
  return (
    <ErrorBoundary>
      <CookiePolicy />
    </ErrorBoundary>
  )
}
