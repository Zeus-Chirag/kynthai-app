'use client'

import { MedicalDisclaimer as MedicalDisclaimerFull } from '@/components/kynthaii/legal/privacy-policy'
import { ErrorBoundary } from '@/components/kynthaii/error-boundary'

export default function MedicalDisclaimerPage() {
  return (
    <ErrorBoundary>
      <MedicalDisclaimerFull />
    </ErrorBoundary>
  )
}
