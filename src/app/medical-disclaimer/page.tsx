'use client'

import { MedicalDisclaimer as MedicalDisclaimerFull } from '@/components/kynthai/legal/privacy-policy'
import { ErrorBoundary } from '@/components/kynthai/error-boundary'

export default function MedicalDisclaimerPage() {
  return (
    <ErrorBoundary>
      <MedicalDisclaimerFull />
    </ErrorBoundary>
  )
}
