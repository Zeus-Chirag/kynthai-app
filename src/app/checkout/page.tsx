'use client'

import { useAppStore } from '@/lib/store'
import { CheckoutPage } from '@/components/kynthai/checkout-page'

export default function CheckoutRoute() {
  const checkoutTier = useAppStore((s) => s.checkoutTier) || 'plus'

  // ponytail: CheckoutPage handles its own busy state internally (card
  // processing), so no Suspense fallback / separate loader is needed here.
  return <CheckoutPage tier={checkoutTier} />
}
