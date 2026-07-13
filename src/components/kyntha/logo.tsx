'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Kyntha — Heart of Health
 *
 * Canonical icon source — used by KynthaIcon, KynthaLogo, KynthaBrand.
 * Do NOT duplicate this geometry elsewhere; import from here.
 *
 * A heart shape with a pulse line — symbolizing life, health, and care.
 * The pulse represents the heartbeat of the family, monitored and protected.
 *
 * © Kyntha Health Technologies — original artistic work
 */

export function KynthaIcon({
  className,
  size = 36,
}: {
  className?: string
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      role="img"
      aria-label="Kyntha icon"
    >
      <defs>
        <linearGradient id="kyntha-heart-grad" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d399" />
          <stop offset="0.5" stopColor="#10b981" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="kyntha-pulse" x1="12" y1="24" x2="36" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6ee7b7" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
      </defs>

      {/* Heart shape */}
      <path
        d="M24 38 C18 34, 8 28, 8 18 C8 12, 12 8, 17 8 C20 8, 22 10, 24 10 C26 10, 28 8, 31 8 C36 8, 40 12, 40 18 C40 28, 30 34, 24 38Z"
        fill="url(#kyntha-heart-grad)"
      />

      {/* Pulse line */}
      <path
        d="M12 24 L17 24 L19 18 L21 30 L24 14 L27 30 L29 18 L31 24 L36 24"
        stroke="url(#kyntha-pulse)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Small cross */}
      <rect x="22" y="33" width="4" height="1.5" rx="0.5" fill="white" opacity="0.9" />
      <rect x="23.25" y="31.75" width="1.5" height="4" rx="0.5" fill="white" opacity="0.9" />
    </svg>
  )
}

export function KynthaLogo({
  className,
  iconSize = 32,
  showText = true,
  textClassName,
}: {
  className?: string
  iconSize?: number
  showText?: boolean
  textClassName?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <KynthaIcon size={iconSize} />
      {showText && (
        <span
          className={cn(
            'font-bold tracking-tight text-foreground',
            textClassName
          )}
          style={{ fontSize: iconSize * 0.62 }}
        >
          Kyntha
        </span>
      )}
    </span>
  )
}

export function KynthaBrand({
  className,
  iconSize = 28,
}: {
  className?: string
  iconSize?: number
}) {
  return (
    <span className={cn('inline-flex items-center gap-2 select-none', className)}>
      <KynthaIcon size={iconSize} />
      <span
        className="font-bold tracking-tight text-xl"
        style={{
          background: 'linear-gradient(110deg, #34d399 0%, #10b981 40%, #059669 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Kyntha
      </span>
    </span>
  )
}
