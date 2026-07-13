'use client'

import * as React from 'react'
import { Gift, Clock, Users, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EarlyAdopterBannerProps {
  onGetStarted: (portal?: string) => void
}

export function EarlyAdopterBanner({ onGetStarted }: EarlyAdopterBannerProps) {
  return (
    <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          {/* Left: Main message */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold">
                🎉 Early pricing — $9.99/mo Individual, $19.99/mo Family
              </p>
              <p className="text-sm text-emerald-100">
                Transparent pricing with no surprise charges at checkout.
              </p>
            </div>
          </div>

          {/* Right: CTA */}
          <Button
            onClick={() => onGetStarted('caretaker')}
            className="bg-white text-emerald-700 hover:bg-emerald-50"
            size="sm"
          >
            Get Started
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
