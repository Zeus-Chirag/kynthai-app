'use client'

/**
 * portal-shell.tsx
 *
 * Client entry point mounted inside Providers in layout.tsx.
 * Reads the initial pathname on mount, then renders PortalClient.
 *
 * PortalShell and PortalClient live together in adjacent files — they
 * form the complete client-side bundle entry for the root route, keeping
 * portal chunks completely isolated from the initial client entry.
 */

import { PortalClient } from './portal-client'

export function PortalShell({ children }: { children?: React.ReactNode } = {}) {
  // PortalClient's `usePathname` subscription handles routing immediately
  // after hydration; no stale local state slot is needed here.
  return <PortalClient>{children}</PortalClient>
}
