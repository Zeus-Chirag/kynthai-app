'use client';

import { useEffect } from 'react';

/**
 * ReticleDev — dev-only runtime verification agent (reticle.sh).
 * Connects the app to the localhost Reticle bridge so the coding agent can
 * verify flows against the REAL running app (network, store, console, React
 * commits) and get file:line evidence. Tree-shaken out of production builds.
 */
export function ReticleDev() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    void import('@reticlehq/react').then(({ reticle, SESSION_AUTO, registerStore }) =>
      Promise.all([
        import('@/lib/store').then(m => m.useAppStore).catch(() => null),
      ]).then(([useAppStore]) => {
        if (useAppStore) {
          // Expose the zustand app store so the agent can read real state
          // (duck-types on { getState, subscribe } — zustand works with no adapter).
          registerStore('useAppStore', useAppStore);
        }
        reticle.connect({
          session: SESSION_AUTO,
          token: process.env.NEXT_PUBLIC_RETICLE_TOKEN,
        });
      }),
    );
  }, []);
  return null;
}
