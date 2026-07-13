import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/auth'
import { requireAuthWithCsrf, jsonError, jsonOk, readJson, audit } from '@/lib/api-helpers'
import { sanitizeText } from '@/lib/security'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'

// POST /api/referral — Generate referral link or apply referral code
export async function POST(req: NextRequest) {
  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!

  try {
    const body = await readJson<{ action?: string; code?: string }>(req)
    if (!body) return jsonError('Invalid JSON', 400)

    // Generate referral link
    if (body.action === 'generate') {
      // Check if user already has a referral code
      let referralCode = await db.referral.findFirst({
        where: { referrerId: user.id },
      })

      if (!referralCode) {
        // Create new referral code
        const code = generateReferralCode(user.name ?? '')
        referralCode = await db.referral.create({
          data: {
            referrerId: user.id,
            code,
            referralCount: 0,
          },
        })
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kyntha.app'
      const referralLink = `${baseUrl}/ref/${referralCode.code}`

      return jsonOk({
        code: referralCode.code,
        link: referralLink,
        referralCount: referralCode.referralCount,
        rewards: getRewards(referralCode.referralCount),
      })
    }

    // Apply referral code
    if (body.action === 'apply' && body.code) {
      const code = sanitizeText(body.code, 20).toUpperCase()
      if (!code) return jsonError('Referral code is required', 400)

      // Find the referral
      const referral = await db.referral.findFirst({
        where: { code },
      })

      if (!referral) {
        return jsonError('Invalid referral code', 404)
      }

      if (referral.referrerId === user.id) {
        return jsonError('You cannot use your own referral code', 400)
      }

      // Check if user already used a referral
      const existingReferral = await db.referralUsage.findFirst({
        where: { usedById: user.id },
      })

      if (existingReferral) {
        return jsonError('You have already used a referral code', 400)
      }

      // Apply referral
      await db.referralUsage.create({
        data: {
          referralId: referral.id,
          usedById: user.id,
          referrerId: referral.referrerId,
        },
      })

      // Update referral count
      await db.referral.update({
        where: { id: referral.id },
        data: { referralCount: { increment: 1 } },
      })

      // Grant reward to both users
      await grantReferralReward(user.id, 'referred')
      await grantReferralReward(referral.referrerId, 'referrer')

      await logAudit(user.id, 'referral.applied', `code=${code} referrer=${referral.referrerId}`)

      return jsonOk({
        success: true,
        message: 'Referral applied! Both you and your friend get rewards.',
      })
    }

    return jsonError('Invalid action', 400)
  } catch (error) {
    logger.phiSafeError(error)
    return jsonError('Internal server error', 500)
  }
}

// GET /api/referral — Get user's referral stats
export async function GET(req: NextRequest) {
  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!

  try {
    const referral = await db.referral.findFirst({
      where: { referrerId: user.id },
    })

    if (!referral) {
      return jsonOk({
        code: null,
        link: null,
        referralCount: 0,
        rewards: getRewards(0),
      })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kyntha.app'
    return jsonOk({
      code: referral.code,
      link: `${baseUrl}/ref/${referral.code}`,
      referralCount: referral.referralCount,
      rewards: getRewards(referral.referralCount),
    })
  } catch (error) {
    logger.phiSafeError(error)
    return jsonError('Internal server error', 500)
  }
}

function generateReferralCode(name: string): string {
  const prefix = name.slice(0, 3).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}-${random}`
}

function getRewards(referralCount: number) {
  const rewards = [
    { threshold: 1, reward: '$25 credit', description: 'Get $25 off your next payment' },
    { threshold: 3, reward: '1 month free', description: 'Get 1 month free subscription' },
    { threshold: 5, reward: 'Free annual plan', description: 'Get annual plan for free' },
    { threshold: 10, reward: 'Lifetime Plus', description: 'Free Plus plan for life' },
  ]

  const unlocked = rewards.filter((r) => referralCount >= r.threshold)
  const nextReward = rewards.find((r) => referralCount < r.threshold)

  return {
    unlocked,
    nextReward,
    totalReferrals: referralCount,
  }
}

async function grantReferralReward(userId: string, type: 'referred' | 'referrer') {
  // Grant credit to user
  await db.payment.create({
    data: {
      userId,
      type: 'referral_reward',
      amount: type === 'referred' ? 10 : 10,
      currency: 'USD',
      status: 'succeeded',
      provider: 'internal',
      description: `Referral reward (${type})`,
    },
  })
}
