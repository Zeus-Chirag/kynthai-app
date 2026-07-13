"use client";
import { useEffect } from "react";
import { logger } from "@/lib/logger";

export type MetricName = "LCP" | "INP" | "CLS" | "FCP" | "TTFB" | "TTI";

export interface WebVitalMetric {
  name: MetricName;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
  timestamp: number;
  connection?: string;
  navType?: string;
}

const THRESHOLDS: Record<MetricName, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 }, INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 }, FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 600, poor: 1500 }, TTI: { good: 3800, poor: 7300 },
};

const rating = (n: MetricName, v: number): WebVitalMetric["rating"] => {
  const t = THRESHOLDS[n];
  if (v <= t.good) return "good";
  if (v <= t.poor) return "needs-improvement";
  return "poor";
};

const getConnection = (): string | undefined => {
  try { return typeof navigator !== "undefined" ? (navigator as any).connection?.effectiveType : undefined; }
  catch { return undefined; }
};

const getNavType = (): string | undefined => {
  try {
    if (typeof performance !== "undefined" && "getEntriesByType" in performance) {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      return nav?.type;
    }
  } catch { /* not available */ }
  return undefined;
};

type Handler = (m: WebVitalMetric) => void;

function buildMetric(name: MetricName, value: number, delta: number, id: string): WebVitalMetric {
  return { name, value, delta, id, timestamp: Date.now(), rating: rating(name, value), connection: getConnection(), navType: getNavType() };
}

function makeHandler(name: MetricName, onReport?: Handler): Handler {
  const seen = new Map<string, number>();
  return (raw) => {
    const m = buildMetric(name, raw.value, raw.delta, raw.id);
    const last = seen.get(m.id);
    if (last && m.timestamp - last < 500) return;
    seen.set(m.id, m.timestamp);
    const sym = m.rating === "good" ? "🟢" : m.rating === "needs-improvement" ? "🟡" : "🔴";
    logger.debug('WebVitals', { name, value: m.value.toFixed(2) });
    try {
      // @ts-ignore
      if (typeof window !== "undefined" && (window as any)?.Sentry) {
        // @ts-ignore
        (window as any).Sentry.captureMessage(`[WebVitals] ${name}: ${m.value.toFixed(2)}ms`, "info");
      }
    } catch { /* Sentry absent */ }
    onReport?.(m);
  };
}

function observeLCP(h: Handler) {
  if (!("PerformanceObserver" in window)) return;
  try {
    const po = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
      if (last) h({ name: "LCP", value: last.startTime, delta: last.startTime, id: `lcp-${last.startTime}`, rating: rating("LCP", last.startTime), timestamp: Date.now() });
    });
    po.observe({ type: "largest-contentful-paint", buffered: true });
  } catch { /* unsupported */ }
}

function observeCLS(h: Handler) {
  if (!("PerformanceObserver" in window)) return;
  try {
    let clsValue = 0;
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!shift.hadRecentInput) {
          const val = shift.value ?? 0;
          clsValue += val;
          h({ name: "CLS", value: clsValue, delta: val, id: `cls-${Date.now()}`, rating: rating("CLS", clsValue), timestamp: Date.now() });
        }
      }
    });
    po.observe({ type: "layout-shift", buffered: true });
  } catch { /* unsupported */ }
}

function observeINP(h: Handler) {
  if (!("PerformanceObserver" in window)) return;
  try {
    const po = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceEventTiming[];
      if (!entries.length) return;
      // entries.length >= 1 is guarded above
      const last = entries[entries.length - 1]!
      const dur = last.duration;
      h({ name: "INP", value: dur, delta: dur, id: `inp-${Date.now()}`, rating: rating("INP", dur), timestamp: Date.now() });
    });
    po.observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
  } catch { /* unsupported */ }
}

function observeNavTiming() {
  try {
    if (typeof performance !== "undefined" && "getEntriesByType" in performance) {
      const nav = (performance.getEntriesByType("navigation") as PerformanceNavigationTiming[])[0];
      if (!nav) return;
      if (nav.responseStart > 0 && nav.fetchStart > 0) {
        const val = nav.responseStart - nav.fetchStart;
        makeHandler("TTFB")({ name: "TTFB", value: val, delta: val, id: `ttfb-${Date.now()}`, rating: rating("TTFB", val), timestamp: Date.now() });
      }
      const fcp = (performance.getEntriesByType("paint") as PerformanceEntry[]).find((p) => p.name === "first-contentful-paint");
      if (fcp) {
        const fcpTime = fcp.startTime;
        makeHandler("FCP")({ name: "FCP", value: fcpTime, delta: fcpTime, id: `fcp-${Date.now()}`, rating: rating("FCP", fcpTime), timestamp: Date.now() });
      }
      const tti = nav.loadEventEnd || nav.domInteractive;
      if (tti > 0) makeHandler("TTI")({ name: "TTI", value: tti, delta: tti, id: `tti-${Date.now()}`, rating: rating("TTI", tti), timestamp: Date.now() });
    }
  } catch { /* not available */ }
}

export interface WebVitalsOptions {
  onReport?: (metric: WebVitalMetric) => void;
}

export function useWebVitals(options: WebVitalsOptions = {}) {
  const { onReport } = options;
  useEffect(() => {
    observeLCP(makeHandler("LCP", onReport));
    observeCLS(makeHandler("CLS", onReport));
    observeINP(makeHandler("INP", onReport));
    if (document.readyState === "complete") {
      setTimeout(observeNavTiming, 0);
    } else {
      window.addEventListener("load", () => setTimeout(observeNavTiming, 0), { once: true });
    }
    document.addEventListener("visibilitychange", () => {}, { passive: true });
     
  }, []);
}

export default useWebVitals;
