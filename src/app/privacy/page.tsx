'use client'

import { PrivacyPolicy } from "@/components/kynthai/legal/privacy-policy"
import { ErrorBoundary } from '@/components/kynthai/error-boundary'

export default function PrivacyPage() {
  return (
    <ErrorBoundary>
      <PrivacyPolicy />
    </ErrorBoundary>
  )
}
