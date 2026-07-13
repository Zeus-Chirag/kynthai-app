'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { Suspense, type ReactNode } from 'react'

// Lazy-load animation utilities — they pull in Framer Motion (~40 KB)
const Reveal = dynamic(() =>
  import('./animations').then((m) => m.Reveal)
)
const StaggerGroup = dynamic(() =>
  import('./animations').then((m) => m.StaggerGroup)
)
const StaggerItem = dynamic(() =>
  import('./animations').then((m) => m.StaggerItem)
)

/* ------------------------------------------------------------------ */
/* Props for a reveal-wrapped section slot                            */
/* ------------------------------------------------------------------ */
export interface SectionSlotProps {
  /** Gap class for the outer wrapper */
  gap?: string
  /** Inner content */
  children: ReactNode
}

/* ------------------------------------------------------------------ */
/* ReavealSection — wraps a server-rendered section with a fade+slide */
/* This is a CLIENT component: Framer Motion lives in the client chunk */
/* ------------------------------------------------------------------ */
export function RevealSection({ gap = '', children }: SectionSlotProps) {
  return (
    <Reveal>
      <div className={gap}>{children}</div>
    </Reveal>
  )
}

/* ------------------------------------------------------------------ */
/* StaggerGroup — grid with staggered children animation              */
/* ------------------------------------------------------------------ */
export interface StaggerGridProps {
  children: ReactNode
  className?: string
}
export function StaggerGrid({ children, className = '' }: StaggerGridProps) {
  return (
    <StaggerGroup className={className}>
      {children}
    </StaggerGroup>
  )
}
