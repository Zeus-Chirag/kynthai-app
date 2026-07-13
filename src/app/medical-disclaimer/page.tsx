'use client'

import { MedicalDisclaimer as MedicalDisclaimerFull } from '@/components/kyntha/legal/privacy-policy'
import { ErrorBoundary } from '@/components/kyntha/error-boundary'

export default function MedicalDisclaimerPage() {
  return (
    <ErrorBoundary>
      <MedicalDisclaimerFull />
    </ErrorBoundary>
  )
}
