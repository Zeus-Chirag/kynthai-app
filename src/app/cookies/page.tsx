'use client'

import { CookiePolicy } from '@/components/kyntha/legal/privacy-policy'
import { ErrorBoundary } from '@/components/kyntha/error-boundary'

export default function CookiesPage() {
  return (
    <ErrorBoundary>
      <CookiePolicy />
    </ErrorBoundary>
  )
}
