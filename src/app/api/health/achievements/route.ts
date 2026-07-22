import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/auth'
import { checkConsent, jsonOk, jsonError, requireAuth } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'

export const runtime = 'nodejs'

/**
 * GET /api/health/achievements
 *
 * Returns the authenticated user's recent achievements for sharing.
 * Checks streaks, badges, journal entries, and AI chat activity.
 */
export async function GET(req: NextRequest) {
  try {
    const { response, user } = await requireAuth(req)
    if (response || !user) return response!

    const consentError = checkConsent(user)
    if (consentError) return consentError

    // Audit: achievements access
    await logAudit(user.id, 'achievements.read', { resourceType: 'UserBadge' })

    const achievements = await computeAchievements(user.id)

    return jsonOk({ achievements })
  } catch (error) {
    logger.phiSafeError(error)
    return jsonError('Internal server error', 500)
  }
}

async function computeAchievements(userId: string) {
  const results: Array<{
    id: string
    type: string
    title: string
    description: string
    icon: string
    shareText: string
  }> = []

  // 1. Streak achievements
  const streaks = await db.userStreak.findMany({
    where: { userId },
  })

  const medsStreak = streaks.find((s) => s.type === 'daily_meds')
  const weeklyStreak = streaks.find((s) => s.type === 'weekly_perfect')
  const familyStreak = streaks.find((s) => s.type === 'family_perfect')

  if (medsStreak && medsStreak.count >= 7) {
    results.push({
      id: `streak_7_${medsStreak.id}`,
      type: 'streak_7',
      title: '7-Day Streak Champion',
      description: `${medsStreak.count} consecutive days of perfect medication adherence!`,
      icon: 'flame',
      shareText: `I just hit a ${medsStreak.count}-day medication streak on Kyntha! Consistent care makes all the difference.`,
    })
  }

  if (medsStreak && medsStreak.count >= 30) {
    results.push({
      id: `streak_30_${medsStreak.id}`,
      type: 'streak_30',
      title: 'Monthly Perfect',
      description: `${medsStreak.count} days of perfect medication adherence — a full month!`,
      icon: 'trophy',
      shareText: `30 days of perfect medication adherence with Kyntha! Health is consistency.`,
    })
  }

  if (weeklyStreak && weeklyStreak.count >= 1) {
    results.push({
      id: `weekly_${weeklyStreak.id}`,
      type: 'weekly_perfect',
      title: 'Perfect Week',
      description: '100% medication adherence for an entire week!',
      icon: 'star',
      shareText: `Perfect week of medication adherence on Kyntha! Every dose counts.`,
    })
  }

  // 2. Journal achievement
  const journalCount = await db.healthJournal.count({
    where: { userId },
  })

  if (journalCount >= 1) {
    results.push({
      id: `journal_${userId}`,
      type: 'journal',
      title: 'Health Journal Started',
      description: 'Started tracking health with daily journal entries.',
      icon: 'brain',
      shareText: `Started my health journal on Kyntha! Tracking symptoms, mood and vitals daily helps me stay aware.`,
    })
  }

  // 3. AI chat achievements
  const aiChatCount = await db.chatMessage.count({
    where: {
      userId,
      role: 'user',
    },
  })

  if (aiChatCount >= 10) {
    results.push({
      id: `chat_${userId}`,
      type: 'chat_10',
      title: 'AI Health Explorer',
      description: `${aiChatCount}+ AI health conversations — exploring health knowledge!`,
      icon: 'zap',
      shareText: `${aiChatCount}+ AI health chats on Kyntha! My personal health assistant is always ready.`,
    })
  }

  // 4. Family perfect day
  if (familyStreak && familyStreak.count >= 1) {
    results.push({
      id: `family_${familyStreak.id}`,
      type: 'family_day',
      title: 'Family Health Champion',
      description: `Perfect health day for the whole family! ${familyStreak.count} days and counting.`,
      icon: 'heart',
      shareText: `Keeping my whole family healthy with Kyntha! ${familyStreak.count} days of family health wins.`,
    })
  }

  return results
}
