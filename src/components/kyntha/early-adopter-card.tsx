'use client'

import * as React from 'react'
import { Gift, Users, Check, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/lib/store'
import { EARLY_ADOPTER_TIERS } from '@/lib/commission'
import { formatPrice } from '@/lib/currency'

interface EarlyAdopterCardProps {
  onSelect: (type: 'individual' | 'family') => void
}

// Early Bird slots — fixed limited availability
const EARLY_BIRD_SLOTS = {
  individual: 300, // patient slots
  family: 200,     // family slots
}

export function EarlyAdopterCard({ onSelect }: EarlyAdopterCardProps) {
  const { currency } = useAppStore()
  const setCheckoutFounder = useAppStore((s) => s.setCheckoutFounder)
  const [slots, setSlots] = React.useState(EARLY_BIRD_SLOTS)

  const handleSelect = (type: 'individual' | 'family') => {
    setCheckoutFounder(true)
    onSelect(type)
  }

  const remainingIndividual = Math.max(0, slots.individual)
  const remainingFamily = Math.max(0, slots.family)
  const individualSoldOut = remainingIndividual === 0
  const familySoldOut = remainingFamily === 0

  return (
    <Card className="border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Early Bird Pricing</h3>
              <p className="text-sm text-muted-foreground">Limited slots — lock in forever pricing</p>
            </div>
          </div>
          <Badge className="bg-emerald-500">SAVE MORE</Badge>
        </div>

        <div className="rounded-lg border bg-white p-4 mb-4 dark:bg-background">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-500" />
              <span className="font-semibold">Individual Plan (Patient)</span>
            </div>
            {individualSoldOut ? (
              <Badge variant="destructive" className="text-[10px]">SOLD OUT</Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                {remainingIndividual} left
              </Badge>
            )}
          </div>
          <div className="flex items-baseline gap-2 mb-3">
              <>
                <span className="text-3xl font-bold text-emerald-600">$9.99</span>
                <span className="text-muted-foreground">/month</span>
              </>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <span>Or $99.99/year</span>
          </div>
          <Button
            onClick={() => handleSelect('individual')}
            className="w-full"
            variant="outline"
            disabled={individualSoldOut}
          >
            {individualSoldOut ? 'Sold Out' : 'Choose Individual'}
          </Button>
        </div>

        <div className="rounded-lg border bg-white p-4 mb-4 dark:bg-background">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" />
              <span className="font-semibold">Family Plan</span>
            </div>
            {familySoldOut ? (
              <Badge variant="destructive" className="text-[10px]">SOLD OUT</Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                {remainingFamily} left
              </Badge>
            )}
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold text-emerald-600">$19.99</span>
            <span className="text-muted-foreground">/month</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <span>Or $199.99/year</span>
          </div>
          <Button
            onClick={() => handleSelect('family')}
            className="w-full"
            variant="outline"
            disabled={familySoldOut}
          >
            {familySoldOut ? 'Sold Out' : 'Choose Family'}
          </Button>
        </div>

        <Separator className="my-4" />
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-emerald-500" />
            <span>300 patient slots · 200 family slots — limited availability</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-emerald-500" />
            <span>Cancel anytime — contact support to manage your subscription</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-emerald-500" />
            <span>Switch between monthly and annual plans anytime</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-emerald-500" />
            <span>Protected purchase with standard buyer safeguards</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
