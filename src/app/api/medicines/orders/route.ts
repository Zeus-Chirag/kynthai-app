import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/auth'
import { sanitizeText, rateLimit } from '@/lib/security'
import { requireAuth, requireAuthWithCsrf, jsonError, jsonOk, readJson, audit, parseJsonCol } from '@/lib/api-helpers'
export const dynamic = 'force-dynamic'

interface OrderItem { name?: string; price?: number; qty?: number }

// GET /api/medicines/orders?patientId=...
export async function GET(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuth(req)
  if (response || !user) return response!
  const u = user!

  const patientId = req.nextUrl.searchParams.get('patientId')?.trim()
  const target = patientId || u.id
  if (target !== u.id && u.role !== 'admin') {
    return jsonError('Forbidden — patientId must match session', 403)
  }

  const orders = await db.medicineOrder.findMany({
    where: { patientId: target },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return jsonOk(
    orders.map((o) => ({
      id: o.id,
      patientId: o.patientId,
      items: parseJsonCol(o.items, []),
      totalAmount: o.totalAmount,
      status: o.status,
      address: o.address,
      createdAt: o.createdAt.toISOString(),
    })),
  )
}

// POST /api/medicines/orders — place an order
export async function POST(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!
  const u = user!

  const body = await readJson<{
    patientId?: string
    items?: OrderItem[]
    address?: string
  }>(req)
  if (!body) return jsonError('Invalid JSON', 400)

  const patientId = body.patientId || u.id
  if (u.role === 'patient' && patientId !== u.id) {
    return jsonError('You can only place orders for yourself', 403)
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return jsonError('At least one item is required', 400)
  }

  const items = body.items.map((it) => ({
    name: sanitizeText(it.name, 120),
    price: Number(it.price) || 0,
    qty: Math.max(1, Number(it.qty) || 1),
  }))
  const total = items.reduce((s, it) => s + it.price * it.qty, 0)

  const order = await db.medicineOrder.create({
    data: {
      patientId,
      items: JSON.stringify(items),
      totalAmount: total,
      status: 'pending',
      address: sanitizeText(body.address, 500),
    },
  })

  await logAudit(u.id, 'medicines.order.place', `order=${order.id} total=${total}`)
  return jsonOk({
    id: order.id,
    patientId: order.patientId,
    items,
    totalAmount: order.totalAmount,
    status: order.status,
    address: order.address,
    createdAt: order.createdAt.toISOString(),
  })
}
