'use client'

import * as React from 'react'
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  AnimatePresence,
  type Variants,
} from 'framer-motion'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Shared animation constants — import these in components             */
/* ------------------------------------------------------------------ */
export const EASE_STANDARD = [0.16, 1, 0.3, 1] as const
export const EASE_OUT     = [0.22, 1, 0.36, 1] as const
export const DURATION_STANDARD = 0.75 as const

/* ------------------------------------------------------------------ */
/* Reveal — fade + slide up when scrolled into view                    */
/* ------------------------------------------------------------------ */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  once = true,
}: {
  children: React.ReactNode
  delay?: number
  y?: number
  className?: string
  once?: boolean
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once, margin: '-80px' })
  const reduced = useReducedMotion()

  // Respect prefers-reduced-motion: just fade, no slide
  const effectiveY = reduced ? 0 : y

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: effectiveY }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: effectiveY }}
      transition={{ duration: reduced ? 0.2 : 0.75, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* StaggerGroup + StaggerItem                                          */
/* ------------------------------------------------------------------ */
const groupVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
  },
}

export function StaggerGroup({
  children,
  className,
  once = true,
}: {
  children: React.ReactNode
  className?: string
  once?: boolean
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once, margin: '-60px' })
  const reduced = useReducedMotion()

  return (
    <motion.div
      ref={ref}
      variants={reduced ? {} : groupVariants}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      className={className}
      style={reduced ? { opacity: inView ? 1 : 0 } : undefined}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Counter — animated number counting up when in view                  */
/* Uses requestAnimationFrame interpolation for jitter-free counting    */
/* ------------------------------------------------------------------ */
export function Counter({
  to,
  from = 0,
  duration = 1.8,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: {
  to: number
  from?: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const reduced = useReducedMotion()

  const [display, setDisplay] = React.useState(from.toFixed(decimals))

  React.useEffect(() => {
    if (!inView || reduced) {
      setDisplay(to.toFixed(decimals))
      return
    }

    const startTime = performance.now()
    const diff = to - from
    let rafId: number

    function tick(now: number) {
      const elapsed = (now - startTime) / 1000
      const t = Math.min(elapsed / duration, 1)
      // Smooth ease-out curve: 1 - (1-t)^3
      const eased = 1 - Math.pow(1 - t, 3)
      const current = from + diff * eased
      setDisplay(current.toFixed(decimals))
      if (t < 1) {
        rafId = requestAnimationFrame(tick)
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [inView, to, from, duration, decimals, reduced])

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Magnetic — button that subtly follows the cursor                    */
/* ------------------------------------------------------------------ */
export function Magnetic({
  children,
  strength = 0.35,
  className,
}: {
  children: React.ReactNode
  strength?: number
  className?: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 180, damping: 14 })
  const sy = useSpring(y, { stiffness: 180, damping: 14 })

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const relX = e.clientX - (rect.left + rect.width / 2)
    const relY = e.clientY - (rect.top + rect.height / 2)
    x.set(relX * strength)
    y.set(relY * strength)
  }
  function onLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: sx, y: sy }}
      className={cn('inline-block', className)}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* TiltCard — 3D tilt on mouse move                                   */
/* ------------------------------------------------------------------ */
export function TiltCard({
  children,
  className,
  max = 8,
}: {
  children: React.ReactNode
  className?: string
  max?: number
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const srx = useSpring(rx, { stiffness: 200, damping: 18 })
  const sry = useSpring(ry, { stiffness: 200, damping: 18 })

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    ry.set(px * max * 2)
    rx.set(-py * max * 2)
  }
  function onLeave() {
    rx.set(0)
    ry.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        rotateX: srx,
        rotateY: sry,
        perspective: '900px',
        transformStyle: 'preserve-3d',
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* AnimatedGradientText — shimmering gradient headline                 */
/* Keyframes defined in src/app/globals.css                            */
/* ------------------------------------------------------------------ */
export function AnimatedGradientText({
  children,
  className,
  from = '#10b981',
  via = '#14b8a6',
  to = '#0d9488',
}: {
  children: React.ReactNode
  className?: string
  from?: string
  via?: string
  to?: string
}) {
  const reduced = useReducedMotion()

  return (
    <span
      className={cn(
        'inline-block bg-clip-text text-transparent',
        reduced ? '' : 'animate-kynthai-gradient',
        className
      )}
      style={{
        backgroundImage: reduced
          ? `linear-gradient(110deg, ${from}, ${to})`
          : `linear-gradient(110deg, ${from}, ${via}, ${to}, ${via}, ${from})`,
        backgroundSize: reduced ? '100%' : '220% 100%',
      }}
    >
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* FadeIn helper for tab/page transitions                              */
/* ------------------------------------------------------------------ */
export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? {} : { opacity: 0, y: -8 }}
      transition={{ duration: reduced ? 0 : 0.4, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export { AnimatePresence, motion }

/* ------------------------------------------------------------------ */
/* Floating — subtle infinite float for hero elements                  */
/* Smoother sine-wave easing, with willChange for GPU promotion        */
/* ------------------------------------------------------------------ */
export function Floating({
  children,
  className,
  amplitude = 8,
  duration = 4,
}: {
  children: React.ReactNode
  className?: string
  amplitude?: number
  duration?: number
}) {
  const reduced = useReducedMotion()

  if (reduced) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      animate={{
        y: [0, -amplitude, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
        repeatType: 'mirror',
      }}
      className={className}
      style={{ willChange: 'transform' }}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* FloatBadge — badge that floats continuously with its own rhythm    */
/* ------------------------------------------------------------------ */
export function FloatBadge({
  children,
  className,
  delay = 0,
  amplitude = 5,
  duration = 3.5,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  amplitude?: number
  duration?: number
}) {
  const reduced = useReducedMotion()

  if (reduced) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -amplitude, 0],
      }}
      transition={{
        opacity: { delay, duration: 0.4, ease: 'easeOut' },
        scale: { delay, duration: 0.4, ease: 'easeOut' },
        y: { delay: delay + 0.5, duration, repeat: Infinity, ease: 'easeInOut', repeatType: 'mirror' },
      }}
      className={className}
      style={{ willChange: 'transform' }}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* PulseBadge — subtle pulse to draw attention                         */
/* ------------------------------------------------------------------ */
export function PulseBadge({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const reduced = useReducedMotion()

  if (reduced) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      animate={{
        scale: [1, 1.04, 1],
        opacity: [0.9, 1, 0.9],
      }}
      transition={{
        duration: 2.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
