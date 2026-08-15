import { NextRequest, NextResponse } from 'next/server'
import { resetCircuitBreaker, getAllCircuitBreakers } from '@/lib/circuit-breaker'
import { requireAdmin } from '@/lib/api-helpers'

export async function POST(req: NextRequest) {
  try {
    const { response } = await requireAdmin(req)
    if (response) return response

    const body = await req.json()
    const { name } = body

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }

    // Check if circuit breaker exists
    const breakers = getAllCircuitBreakers()
    if (!breakers.has(name)) {
      return NextResponse.json(
        { error: `Circuit breaker '${name}' not found` },
        { status: 404 }
      )
    }

    resetCircuitBreaker(name)

    return NextResponse.json({
      success: true,
      message: `Circuit breaker '${name}' reset`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to reset circuit breaker' },
      { status: 500 }
    )
  }
}
