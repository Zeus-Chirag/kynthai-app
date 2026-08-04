'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pill, AlertTriangle, ShoppingCart, Clock, Plus, RefreshCw } from 'lucide-react'
import { logger } from '@/lib/logger'

interface MedicineInventoryItem {
  id: string
  medicationId: string
  medicationName: string
  dosage: string
  totalPills: number
  remaining: number
  refillDate: string | null
  expiryDate: string | null
}

export function MedicineCabinet() {
  const [inventory, setInventory] = useState<MedicineInventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/medicine-inventory')
      if (res.ok) {
        const data = await res.json()
        setInventory(data.inventory || [])
      }
    } catch (error) {
      logger.warn('Failed to fetch inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  const updateStock = async (id: string, remaining: number) => {
    try {
      await fetch('/api/medicine-inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, remaining }),
      })
      fetchInventory()
    } catch (error) {
      logger.warn('Failed to update stock:', error)
    }
  }

  const getStockStatus = (item: MedicineInventoryItem) => {
    const percentage = (item.remaining / item.totalPills) * 100
    if (percentage <= 0) return { status: 'out', color: 'destructive', label: 'Out of stock' }
    if (percentage <= 20) return { status: 'critical', color: 'destructive', label: 'Refill needed' }
    if (percentage <= 50) return { status: 'low', color: 'secondary', label: 'Running low' }
    return { status: 'good', color: 'default', label: 'In stock' }
  }

  const getDaysRemaining = (item: MedicineInventoryItem) => {
    if (!item.refillDate) return null
    const refillDate = new Date(item.refillDate)
    const today = new Date()
    const diffDays = Math.ceil((refillDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Medicine Cabinet
          </CardTitle>
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Add Medicine
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {inventory.length > 0 ? (
          inventory.map((item) => {
            const stockStatus = getStockStatus(item)
            const daysRemaining = getDaysRemaining(item)
            const percentage = Math.round((item.remaining / item.totalPills) * 100)

            return (
              <div
                key={item.id}
                className="p-4 border rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{item.medicationName}</h4>
                    <p className="text-sm text-muted-foreground">{item.dosage}</p>
                  </div>
                  <Badge variant={stockStatus.color as 'default' | 'secondary' | 'destructive'}>
                    {stockStatus.label}
                  </Badge>
                </div>

                {/* Stock Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Remaining: {item.remaining} / {item.totalPills}</span>
                    <span>{percentage}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        percentage <= 20 ? 'bg-red-500' :
                        percentage <= 50 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {daysRemaining !== null && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Refill in {daysRemaining} days</span>
                    </div>
                  )}
                  {item.expiryDate && (
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Expires: {new Date(item.expiryDate).toLocaleDateString('en-US')}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStock(item.id, Math.max(0, item.remaining - 1))}
                    disabled={item.remaining <= 0}
                  >
                    Take One
                  </Button>
                  <Button size="sm" variant="outline">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refill
                  </Button>
                  {percentage <= 20 && (
                    <Button size="sm" variant="default">
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      Order Now
                    </Button>
                  )}
                </div>
              </div>
            )
          })
        ) : (
          <div className="text-center py-8">
            <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No medicines in your cabinet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add your medications to track inventory and get refill reminders
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
