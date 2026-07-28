'use client'

import { CookiePolicy } from '@/components/kynthai/legal/privacy-policy'
import { ErrorBoundary } from '@/components/kynthai/error-boundary'

export default function CookiesPage() {
  return (
    <ErrorBoundary>
      <CookiePolicy />
    </ErrorBoundary>
  )
}
