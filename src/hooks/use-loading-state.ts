'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useLoadingState — a loading state that automatically resolves after
 * a max time, so spinners can NEVER get stuck.
 *
 * Usage:
 *   const [loading, setLoading] = useLoadingState(5000);
 *   // loading starts as true, guaranteed to become false within 5s
 *   setLoading(false); // manual clear when data arrives
 */
export function useLoadingState(maxMs: number = 5000) {
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualClear = useRef(false);

  const clearLoading = useCallback(() => {
    manualClear.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Auto-clear after maxMs — prevents stuck spinners forever
    timerRef.current = setTimeout(() => {
      if (!manualClear.current) {
        setLoading(false);
      }
    }, maxMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [maxMs]);

  // Allow manual clearing and re-setting
  const setSafe = useCallback((value: boolean) => {
    if (!value) {
      clearLoading();
    } else {
      manualClear.current = false;
      setLoading(true);
      // Re-arm the timeout
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (!manualClear.current) {
          setLoading(false);
        }
      }, maxMs);
    }
  }, [clearLoading, maxMs]);

  return [loading, setSafe] as const;
}
