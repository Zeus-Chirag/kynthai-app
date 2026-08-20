'use client'

import { useAppStore } from '@/lib/store'
import { CheckoutPage } from '@/components/kynthai/checkout-page'
import { ErrorBoundary } from '@/components/kynthai/error-boundary'

export default function CheckoutRoute() {
  const checkoutTier = useAppStore((s) => s.checkoutTier) || 'plus'

  // ponytail: CheckoutPage handles its own busy state internally (card
  // processing), so no Suspense fallback / separate loader is needed here.
  return (
    <ErrorBoundary>
      <CheckoutPage tier={checkoutTier} />
    </ErrorBoundary>
  )
}
