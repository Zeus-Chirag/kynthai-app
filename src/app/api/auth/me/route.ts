import { NextRequest } from 'next/server'
import { getSessionUser, logAudit } from '@/lib/auth'
import { applyStandardHeaders, jsonOk } from '@/lib/api-helpers'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return applyStandardHeaders(jsonOk({ authenticated: false, user: null }))
  }
  // HIPAA: audit session verification
  await logAudit(user.id, 'auth.me')
  return applyStandardHeaders(jsonOk({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      subscriptionTier: user.subscriptionTier,
      emailVerified: user.emailVerified,
      consentAccepted: user.consentAccepted,
      dataProcessingConsent: user.dataProcessingConsent,
      aiTrainingConsent: user.aiTrainingConsent,
      // isDemo omitted — would reveal test/demo account status to client
    },
  }))
}
