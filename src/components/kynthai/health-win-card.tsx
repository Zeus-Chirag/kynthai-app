'use client'

import { useMemo } from 'react'
import * as React from 'react'
import { KynthaiBrand } from './logo'
import { Flame, Trophy, Star, Heart, Brain, Shield, Award, Zap } from 'lucide-react'

export interface Achievement {
  id: string
  type: string
  title: string
  description: string
  icon: string
  score?: number
  streak?: number
  shareText: string
}

interface HealthWinCardProps {
  achievement: Achievement
  userName: string
}

const ACHIEVEMENT_GRADIENTS: Record<string, { from: string; to: string; accent: string }> = {
  streak_7:     { from: '#f59e0b', to: '#d97706', accent: '#fbbf24' },
  streak_30:    { from: '#8b5cf6', to: '#6d28d9', accent: '#a78bfa' },
  weekly_perfect: { from: '#10b981', to: '#059669', accent: '#34d399' },
  journal:      { from: '#6366f1', to: '#4f46e5', accent: '#818cf8' },
  chat_10:      { from: '#ec4899', to: '#db2777', accent: '#f472b6' },
  family_day:   { from: '#14b8a6', to: '#0d9488', accent: '#2dd4bf' },
  default:      { from: '#10b981', to: '#059669', accent: '#34d399' },
}

const ACHIEVEMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  streak_7: Flame,
  streak_30: Trophy,
  weekly_perfect: Star,
  journal: Brain,
  chat_10: Zap,
  family_day: Heart,
}

function getGradient(type: string): { from: string; to: string; accent: string } {
  return (ACHIEVEMENT_GRADIENTS[type] ?? ACHIEVEMENT_GRADIENTS.default) as { from: string; to: string; accent: string }
}

function getIcon(type: string): React.ComponentType<{ className?: string }> {
  return ACHIEVEMENT_ICONS[type] ?? Award
}

/**
 * HealthWinCard — a visually rich, shareable achievement card.
 *
 * Designed for WhatsApp/Instagram sharing with:
 * - Warm gradient background
 * - Avatar with user initial
 * - Achievement icon + text
 * - Pulse score + streak
 * - Kynthai branding
 * - Proper aspect ratio (4:5 portrait for social)
 */
export function HealthWinCard({ achievement, userName }: HealthWinCardProps) {
  const grad = getGradient(achievement.type)
  const Icon = useMemo(() => getIcon(achievement.type), [achievement.type])
  const initial = (userName?.[0] ?? 'U').toUpperCase()
  const dateStr = new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div
      className="relative overflow-hidden rounded-3xl shadow-2xl select-none"
      style={{
        width: '100%',
        maxWidth: 400,
        aspectRatio: '4 / 5',
        background: `linear-gradient(160deg, ${grad.from} 0%, ${grad.to} 100%)`,
      }}
    >
      {/* Decorative background elements */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, white, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -left-8 bottom-24 h-32 w-32 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, white, transparent 70%)' }}
      />

      {/* Content */}
      <div className="relative flex h-full flex-col justify-between p-6 text-white">
        {/* Top: Kynthai branding */}
        <div className="flex items-center justify-between">
          <KynthaiBrand iconSize={22} />
          <span className="text-[10px] font-medium uppercase tracking-widest opacity-80">
            Kynthai Health
          </span>
        </div>

        {/* Center: Achievement */}
        <div className="flex flex-col items-center text-center gap-3">
          {/* Icon circle */}
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm shadow-lg"
          >
            {React.createElement(Icon, { className: 'h-10 w-10 text-white' })}
          </div>

          {/* Achievement label */}
          <span
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: grad.accent }}
          >
            Achievement Unlocked
          </span>

          {/* Title */}
          <h2 className="text-xl font-bold leading-tight">
            {achievement.title}
          </h2>

          {/* Description */}
          <p className="text-sm opacity-90 leading-relaxed max-w-[260px]">
            {achievement.description}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-1">
            {achievement.score != null && (
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold">{achievement.score}</span>
                <span className="text-[10px] uppercase tracking-wider opacity-75">
                  Pulse Score
                </span>
              </div>
            )}
            {achievement.streak != null && achievement.streak > 0 && (
              <>
                <div className="h-8 w-px bg-white/30" />
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold">{achievement.streak}</span>
                  <span className="text-[10px] uppercase tracking-wider opacity-75">
                    Day Streak
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom: User + date */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Avatar */}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 text-sm font-bold backdrop-blur-sm">
              {initial}
            </div>
            <div>
              <p className="text-sm font-semibold">{userName}</p>
              <p className="text-[11px] opacity-75">Kynthai Health</p>
            </div>
          </div>
          <span className="text-[11px] opacity-70">{dateStr}</span>
        </div>

        {/* Bottom accent line */}
        <div
          className="absolute bottom-0 inset-x-0 h-1.5"
          style={{ background: `linear-gradient(90deg, ${grad.accent}, ${grad.from})` }}
        />
      </div>
    </div>
  )
}

/**
 * HealthWinCardHTML — returns a self-contained HTML string of the card,
 * suitable for sharing via Web Share API or as an image source.
 */
export function HealthWinCardHTML(achievement: Achievement, userName: string): string {
  const grad = getGradient(achievement.type)
  const Icon = getIcon(achievement.type)
  const initial = (userName?.[0] ?? 'U').toUpperCase()
  const dateStr = new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial=1.0" />
  <title>${achievement.title} — Kynthai</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body>
  <div style="
    width: 400px; aspect-ratio: 4/5;
    background: linear-gradient(160deg, ${grad.from} 0%, ${grad.to} 100%);
    border-radius: 24px; overflow: hidden; position: relative;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
  ">
    <div style="position:absolute;right:-48px;top:-48px;width:192px;height:192px;border-radius:50%;background:radial-gradient(circle,white,transparent 70%);opacity:0.2;" />
    <div style="position:absolute;left:-32px;bottom:96px;width:128px;height:128px;border-radius:50%;background:radial-gradient(circle,white,transparent 70%);opacity:0.1;" />

    <div style="position:relative;height:100%;display:flex;flex-direction:column;justify-content:space-between;padding:24px;color:white;">
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:8px;">
          <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
            <path d="M24 38C18 34 8 28 8 18C8 12 12 8 17 8C20 8 22 10 24 10C26 10 28 8 31 8C36 8 40 12 40 18C40 28 30 34 24 38Z" fill="white" opacity="0.9"/>
            <path d="M12 24L17 24L19 18L21 30L24 14L27 30L29 18L31 24L36 24" stroke="white" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.7"/>
          </svg>
          <span style="font-weight:700;font-size:16px;letter-spacing:-0.02em;">Kynthai</span>
        </div>
        <span style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;opacity:0.7;">Kynthai Health</span>
      </div>

      <!-- Center -->
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;">
        <div style="width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.2);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 32px rgba(0,0,0,0.15);">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
          </svg>
        </div>
        <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:${grad.accent};">Achievement Unlocked</span>
        <h2 style="font-size:20px;font-weight:800;line-height:1.3;">${achievement.title}</h2>
        <p style="font-size:14px;opacity:0.9;line-height:1.5;max-width:260px;">${achievement.description}</p>
        <div style="display:flex;align-items:center;gap:24px;margin-top:4px;">
          ${achievement.score != null ? `<div style="text-align:center;"><div style="font-size:28px;font-weight:800;">${achievement.score}</div><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.7;">Pulse Score</div></div>` : ''}
          ${achievement.streak != null && achievement.streak > 0 ? `<div style="text-align:center;"><div style="font-size:28px;font-weight:800;">${achievement.streak}</div><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.7;">Day Streak</div></div>` : ''}
        </div>
      </div>

      <!-- Footer -->
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;">${initial}</div>
          <div>
            <div style="font-size:14px;font-weight:600;">${userName}</div>
            <div style="font-size:11px;opacity:0.7;">Kynthai Health</div>
          </div>
        </div>
        <span style="font-size:11px;opacity:0.65;">${dateStr}</span>
      </div>

      <div style="position:absolute;bottom:0;left:0;right:0;height:6px;background:linear-gradient(90deg, ${grad.accent}, ${grad.from});" />
    </div>
  </div>
</body>
</html>`
}
