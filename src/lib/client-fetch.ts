let cachedCsrf: string | null = null

export function clearCsrfCache() {
  cachedCsrf = null
}

export async function getCsrfToken(): Promise<string | null> {
  if (typeof document === 'undefined') return null
  // The kynthai-csrf double-submit cookie persists 30 days (set on the first
  // /api/auth/csrf call, e.g. during login) — read it directly so we can
  // answer without a network round-trip. The server never rotates it, so the
  // cookie value is always the authoritative token.
  const match = document.cookie.match(/(?:^|; )kynthai-csrf=([^;]*)/)
  if (match?.[1]) return decodeURIComponent(match[1])
  if (cachedCsrf) return cachedCsrf
  try {
    const res = await fetch('/api/auth/csrf', { credentials: 'include', cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    cachedCsrf = data.token ?? null
    return cachedCsrf
  } catch { return null }
}

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? 'GET').toUpperCase()
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = await getCsrfToken()
    const headers = new Headers(init?.headers)
    if (token) headers.set('x-csrf-token', token)
    return fetch(input, { ...init, headers, credentials: 'include' })
  }
  return fetch(input, { ...init, credentials: 'include' })
}

let interceptorInstalled = false

/**
 * installGlobalCsrf — auto-attach X-CSRF-Token to same-origin mutating
 * /api/ requests. The codebase repeatedly forgot the header on CSRF-protected
 * routes (consent toggles, referral, notifications, chat, appointments, …) and
 * each 403 silently reverted/ignored the action. One guard here covers every
 * caller — current and future — instead of a per-call-site diff.
 *
 * ponytail: relies on window.fetch being the app's fetch (true today — every
 * caller uses the global); if a bundler ever captures fetch at module scope,
 * this silently stops firing and the 403s come back. Ceiling/upgrade path:
 * migrate mutating callers to apiFetch() (same token logic, no interception).
 *
 * Install once from portal-loaders.tsx (all six portals) and the standalone
 * pages that mutate /api endpoints (checkout, invite).
 */
export function installGlobalCsrf(): void {
  if (interceptorInstalled || typeof window === 'undefined') return
  interceptorInstalled = true
  const nativeFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const method = (
      init?.method ?? (typeof input === 'string' ? undefined : (input as Request).method) ?? 'GET'
    ).toUpperCase()
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return nativeFetch(input, init)

    let url: URL
    try {
      url = new URL(typeof input === 'string' ? input : (input as Request).url, window.location.origin)
    } catch {
      return nativeFetch(input, init)
    }
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) {
      return nativeFetch(input, init)
    }

    const token = await getCsrfToken()
    if (!token) return nativeFetch(input, init)
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    // Respect a caller that already sent the token (identical value anyway).
    if (!headers.has('x-csrf-token')) headers.set('x-csrf-token', token)
    return nativeFetch(input, { ...init, headers })
  }
}
