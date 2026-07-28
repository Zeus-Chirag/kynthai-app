'use client'

import { PrivacyPolicy } from "@/components/kynthaii/legal/privacy-policy"
import { ErrorBoundary } from '@/components/kynthaii/error-boundary'

export default function PrivacyPage() {
  return (
    <ErrorBoundary>
      <PrivacyPolicy />
    </ErrorBoundary>
  )
}
