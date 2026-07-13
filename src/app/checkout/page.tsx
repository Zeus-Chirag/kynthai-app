'use client'

import { Suspense } from 'react'
import { useAppStore } from '@/lib/store'
import { CheckoutPage } from '@/components/kyntha/checkout-page'

export default function CheckoutRoute() {
  const checkoutTier = useAppStore((s) => s.checkoutTier) || 'plus'
  const user = useAppStore((s) => s.user)

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      }
    >
      <CheckoutPage tier={checkoutTier} />
    </Suspense>
  )
}
