import { NextRequest, NextResponse } from 'next/server'
import { getAllCircuitBreakers } from '@/lib/circuit-breaker'
import { requireAdmin } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  try {
    const { response, user } = await requireAdmin(req)
    if (response) return response
    const breakers = getAllCircuitBreakers()
    const status: Record<string, unknown> = {}

    for (const [name, breaker] of breakers.entries()) {
      status[name] = {
        state: breaker.state,
        failures: breaker.failures,
        successes: breaker.successes,
        lastFailureTime: breaker.lastFailureTime ? new Date(breaker.lastFailureTime).toISOString() : null,
        nextAttempt: breaker.nextAttempt ? new Date(breaker.nextAttempt).toISOString() : null,
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      circuitBreakers: status,
      healthy: Object.values(status).every(b => (b as { state?: string }).state !== 'open'),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch circuit breaker status' },
      { status: 500 }
    )
  }
}
