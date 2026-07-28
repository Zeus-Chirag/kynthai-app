"use client"

import { useEffect, useRef, useMemo, useState, type ReactNode } from "react"

export type Priority = "critical" | "high" | "normal" | "low"

export interface LazyComponentConfig {
  module: string
  label: string
  priority: Priority
  viewportThreshold?: number
}

export interface PerformanceOptions {
  lazyComponents?: LazyComponentConfig[]
  preconnectHosts?: string[]
  onIdleCallbacks?: Array<() => void>
}

const isBrowser = () => typeof window !== "undefined"

/** Runs cb in requestIdleCallback or setTimeout fallback; returns cancel fn */
export const runWhenIdle = (
  cb: () => void,
  timeoutMs = 2000,
): (() => void) | undefined => {
  if (!isBrowser()) { cb(); return undefined }
  const w = window as any
  if ("requestIdleCallback" in w) {
    const id = w.requestIdleCallback(() => cb(), { timeout: timeoutMs })
    return () => w.cancelIdleCallback?.(id)
  }
  const id = setTimeout(cb, 50)
  return () => clearTimeout(id)
}

const injectPreconnect = (hosts: string[]): void => {
  if (!isBrowser()) return
  const existing = new Set(
    Array.from(document.querySelectorAll("link[rel=preconnect], link[rel=dns-prefetch]"))
      .map((el: any) => el.href),
  )
  hosts.forEach((host) => {
    if (!host || existing.has(host)) return
    const dns = document.createElement("link")
    dns.rel = "dns-prefetch"
    dns.href = host
    document.head.appendChild(dns)
    if (host.startsWith("https://")) {
      const pc = document.createElement("link")
      pc.rel = "preconnect"
      pc.href = host
      pc.crossOrigin = "anonymous"
      document.head.appendChild(pc)
    }
  })
}

const lazyImport = (config: LazyComponentConfig): void => {
  runWhenIdle(
    async () => {
      // webpackChunkName ensures stable cache key
      // @ts-ignore webpack magic comment
      await import(/* webpackChunkName: "[request]" */ `@/components/kynthai/${config.module}`)
    },
    config.priority === "low" ? 4000 : config.priority === "normal" ? 2000 : 0,
  )
}

const loadLazyComponents = (configs: LazyComponentConfig[]): void => {
  const order: Record<Priority, number> = { critical: 0, high: 1, normal: 2, low: 3 }
  configs.slice().sort((a, b) => order[a.priority] - order[b.priority]).forEach(lazyImport)
}

/**
 * usePerformanceOptimisations — call once at the app root.
 *
 * All side-effects (preconnect, lazy imports, idle callbacks) are scheduled
 * with requestIdleCallback so they never contribute to TBT.
 *
 * Refs are used instead of effect deps to avoid re-triggering the effect
 * whenever host/config arrays are recreated by parent renders.
 */
export function usePerformanceOptimisations(options: PerformanceOptions = {}) {
  const preconnectHostsRef = useRef(options.preconnectHosts ?? [])
  const lazyComponentsRef  = useRef(options.lazyComponents  ?? [])
  const onIdleRef          = useRef(options.onIdleCallbacks ?? [])

  useEffect(() => {
    preconnectHostsRef.current = options.preconnectHosts ?? []
    lazyComponentsRef.current  = options.lazyComponents  ?? []
    onIdleRef.current          = options.onIdleCallbacks ?? []
  }, [options.preconnectHosts, options.lazyComponents, options.onIdleCallbacks])

  useEffect(() => {
    const cancelPreconnect = runWhenIdle(() =>
      injectPreconnect(preconnectHostsRef.current),
    )
    const cancelLazy = runWhenIdle(
      () => loadLazyComponents(lazyComponentsRef.current),
      800,
    )
    return () => {
      cancelPreconnect?.()
      cancelLazy?.()
    }
     
  }, [])
}

export function PreconnectProvider({ children, hosts }: { children: ReactNode; hosts: string[] }) {
  const uniqueHosts = useMemo(() => [...new Set(hosts)], [hosts])
  return (
    <>
      {uniqueHosts.map((host) => (
        <link key={host} rel="dns-prefetch" href={host} />
      ))}
      {uniqueHosts.filter((h) => h.startsWith("https://")).map((host) => (
        <link key={`pc-${host}`} rel="preconnect" href={host} crossOrigin="anonymous" />
      ))}
      {children}
    </>
  )
}

/**
 * LazyLoader — dynamically imports a module and renders it once loaded.
 *
 * Uses requestIdleCallback so the chunk fetch never blocks TBT.
 * Properly awaits the dynamic import (no broken setTimeout placeholder).
 * Shows fallback while loading and a minimal error on failure.
 */
export function LazyLoader({
  module: _mod,
  render,
  fallback = null,
  priority = "normal",
}: {
  module: string
  render: (mod: Record<string, any>) => ReactNode
  fallback?: ReactNode
  priority?: Priority
}) {
  const [mod, setMod] = useState<Record<string, any> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const delayMs = priority === "low" ? 4000 : priority === "normal" ? 2000 : 0

    const cancel = runWhenIdle(
      async () => {
        try {
          // @ts-ignore webpack magic comment
          const loaded = await import(
            /* webpackChunkName: "[request]" */ `@/components/kynthai/${_mod}`
          )
          if (!cancelled) setMod(loaded)
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e.message : String(e))
        }
      },
      delayMs,
    )
    return () => { cancelled = true; cancel?.() }
  }, [_mod, priority])

  if (error) {
    return <div className="text-xs text-red-500">[LazyLoader: {_mod}] {error}</div>
  }
  if (!mod) return <>{fallback}</>
  return <>{render(mod)}</>
}

export default usePerformanceOptimisations
