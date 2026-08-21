'use client';

/**
 * installFetchTimeout — patches the global fetch to always include
 * a timeout (8s default) and credentials. This prevents stuck spinners
 * across the entire app without changing any component code.
 *
 * Called once from the portal-loaders module.
 */
const DEFAULT_TIMEOUT = 8000;

export function installFetchTimeout(timeoutMs: number = DEFAULT_TIMEOUT) {
  if (typeof window === 'undefined') return;
  if ((window as any).__fetchPatched) return;
  (window as any).__fetchPatched = true;

  const originalFetch = window.fetch;
  window.fetch = function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    // Don't patch streaming/SSE requests
    if (init?.signal) {
      return originalFetch.call(this, input, {
        ...init,
        credentials: init.credentials ?? 'include',
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    return originalFetch
      .call(this, input, {
        ...init,
        signal: controller.signal,
        credentials: init?.credentials ?? 'include',
      })
      .finally(() => clearTimeout(timeoutId));
  };
}
