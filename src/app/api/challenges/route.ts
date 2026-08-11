import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/auth'
import { requireAuth, requireAuthWithCsrf, jsonOk, jsonError } from '@/lib/api-helpers'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'

type ChallengeType = 'adherence' | 'journal' | 'ai_chat' | 'family'

interface Challenge {
  id: string
  title: string
  description: string
  type: ChallengeType
  targetCount: number
  reward: string
  endsAt: string
}

interface UserChallengeProgress {
  challengeId: string
  currentCount: number
  joined: boolean
  completed: boolean
}

const CHALLENGES: Challenge[] = [
  { id: 'ch-journal-1', title: '5 Journal Entries', description: 'Complete 5 health journal entries this week.', type: 'journal', targetCount: 5, reward: 'Insight Badge', endsAt: '' },
  { id: 'ch-adherence-1', title: 'Perfect Adherence', description: 'Take all medications on time for 7 consecutive days.', type: 'adherence', targetCount: 7, reward: 'Gold Star', endsAt: '' },
  { id: 'ch-aichat-1', title: 'AI Health Chat', description: 'Have 10 meaningful conversations with your AI health assistant.', type: 'ai_chat', targetCount: 10, reward: 'Curious Mind Badge', endsAt: '' },
  { id: 'ch-family-1', title: 'Family Check-in', description: 'Check in with 3 family members this week through the care hub.', type: 'family', targetCount: 3, reward: 'Caretaker Badge', endsAt: '' },
]

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function getCurrentChallenge(): Challenge {
  const monday = getMonday(new Date())
  const weekIndex = Math.floor((Date.now() - monday.getTime()) / (7 * 24 * 60 * 60 * 1000))
  const template = CHALLENGES[weekIndex % CHALLENGES.length]
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { ...template, id: '', endsAt: sunday.toISOString() } as any
}

function getStreakType(challengeType: ChallengeType): string {
  switch (challengeType) {
    case 'adherence': return 'daily_meds'
    case 'journal': return 'journal'
    case 'ai_chat': return 'symptom'
    case 'family': return 'family_perfect'
  }
}

// GET /api/challenges
// Returns current active challenge with user progress, or challenge history.
export async function GET(req: NextRequest) {
  const { response, user } = await requireAuth(req)
  if (response || !user) return response!

  try {
    const url = new URL(req.url)
    const mode = url.searchParams.get('mode') // 'current' | 'history'

    if (mode === 'history') {
      // Return completed challenges via badges + streaks
      const badges = await db.userBadge.findMany({
        where: { userId: user.id },
        orderBy: { earnedAt: 'desc' },
        take: 20,
      })

      const streaks = await db.userStreak.findMany({
        where: { userId: user.id },
      })

      await logAudit(user.id, 'challenges.history', `badges=${badges.length}`)
      return jsonOk({ badges, streaks })
    }

    // Default: current challenge
    const challenge = getCurrentChallenge()
    const streakType = getStreakType(challenge.type)

    // Check if user has a streak for this challenge type
    const streak = await db.userStreak.findUnique({
      where: { userId_type: { userId: user.id, type: streakType } },
    })

    // Check if user earned the reward badge
    const badge = await db.userBadge.findUnique({
      where: { userId_badgeType: { userId: user.id, badgeType: challenge.id } },
    })

    const currentCount = streak?.count ?? 0
    const completed = !!badge
    const joined = currentCount > 0 || completed

    await logAudit(user.id, 'challenges.current', `type=${challenge.type} progress=${currentCount}/${challenge.targetCount}`)

    return jsonOk({
      challenge,
      progress: { challengeId: challenge.id, currentCount, joined, completed },
    })
  } catch (error) {
    logger.phiSafeError(error)
    return jsonError('Internal server error', 500)
  }
}

// POST /api/challenges
// Join a challenge or update progress.
export async function POST(req: NextRequest) {
  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!

  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return jsonError('Invalid request body', 400)
    }

    const { action, challengeId } = body as { action?: string; challengeId?: string }

    if (action === 'join') {
      if (!challengeId) return jsonError('challengeId is required', 400)

      // Find the challenge template
      const template = CHALLENGES.find((c) => c.id === challengeId)
      if (!template) return jsonError('Invalid challenge', 400)

      const streakType = getStreakType(template.type)

      // Create or ensure streak exists
      const existing = await db.userStreak.findUnique({
        where: { userId_type: { userId: user.id, type: streakType } },
      })

      if (!existing) {
        await db.userStreak.create({
          data: {
            userId: user.id,
            type: streakType,
            count: 0,
            bestCount: 0,
            // lastDate is a DateTime column — a date-only string ("2026-08-11")
            // makes Prisma reject the create with "premature end of input".
            lastDate: new Date(),
          },
        })
      }

      await logAudit(user.id, 'challenges.join', `challenge=${challengeId}`)
      return jsonOk({ joined: true })
    }

    return jsonError('Invalid action', 400)
  } catch (error) {
    logger.phiSafeError(error)
    return jsonError('Internal server error', 500)
  }
}
