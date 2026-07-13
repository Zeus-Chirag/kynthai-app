'use client'

import { PrivacyPolicy } from "@/components/kyntha/legal/privacy-policy"
import { ErrorBoundary } from '@/components/kyntha/error-boundary'

export default function PrivacyPage() {
  return (
    <ErrorBoundary>
      <PrivacyPolicy />
    </ErrorBoundary>
  )
}
