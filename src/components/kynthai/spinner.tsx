'use client';

import { useEffect, useRef } from 'react';

/**
 * Spinner — a JavaScript-animated spinner that works on ALL browsers
 * including mobile Safari (where CSS animations sometimes fail).
 *
 * Uses requestAnimationFrame instead of CSS animation to guarantee
 * the spinner always spins.
 */
export function Spinner({ size = 40, color = '#10b981' }: { size?: number; color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    let angle = 0;
    let raf: number;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);

      // Background circle (lighter)
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, (size - 6) / 2, 0, Math.PI * 2);
      ctx.strokeStyle = color + '20';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Foreground arc (spinning)
      ctx.beginPath();
      const startAngle = angle;
      const endAngle = angle + Math.PI * 1.5; // 270 degrees
      ctx.arc(size / 2, size / 2, (size - 6) / 2, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();

      angle += 0.08;
      if (angle > Math.PI * 2) angle = 0;

      raf = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [size, color]);

  return <canvas ref={ref} aria-hidden="true" />;
}

/**
 * FullPageSpinner — a full-page loading state with the JS spinner.
 */
export function FullPageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4" role="status" aria-label={label}>
        <Spinner size={40} color="#10b981" />
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}
