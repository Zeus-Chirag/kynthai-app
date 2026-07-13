import { NextRequest } from 'next/server'
import { clearSessionCookie, getSessionUser } from '@/lib/auth'
import { logAudit } from '@/lib/auth'
import { db } from '@/lib/db'
import { checkCsrf } from '@/lib/csrf'
import { jsonOk, audit } from '@/lib/api-helpers'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  await checkCsrf(req)
  const user = await getSessionUser()
  if (user) {
    try {
      await db.user.update({
        where: { id: user.id },
        data: { sessionToken: null, sessionExpiry: null },
      })
    } catch { /* ignore */ }
    await logAudit(user.id, 'auth.logout')
  }
  await clearSessionCookie()
  return jsonOk({ success: true })
}
