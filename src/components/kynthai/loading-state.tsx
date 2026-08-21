'use client';

import { Spinner } from '@/components/kynthai/spinner';

/**
 * LoadingState — the ONLY loading component for the entire app.
 *
 * Rules:
 * 1. Always centered (never top, never bottom — always center)
 * 2. Always uses JS canvas spinner (guaranteed to spin on ALL browsers)
 * 3. Always same size, same color, same layout
 * 4. No layout shift — takes min-h-screen so it never jumps
 *
 * Usage:
 *   if (loading) return <LoadingState label="Loading…" />
 *   if (loading) return <LoadingState /> // no label
 */

export function LoadingState({ label = 'Loading…', fullPage = true }: { label?: string; fullPage?: boolean }) {
  const content = (
    <div className="flex flex-col items-center gap-3" role="status" aria-label={label}>
      <Spinner size={36} color="#10b981" />
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
      <span className="sr-only">{label}</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        {content}
      </div>
    );
  }

  return (
    <div className="flex min-h-[200px] items-center justify-center">
      {content}
    </div>
  );
}

/**
 * InlineSpinner — small inline spinner for buttons and action areas.
 * Does NOT take full page — just a small spinner in place.
 */
export function InlineSpinner({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return <Spinner size={size} color={color} />;
}
