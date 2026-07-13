let cachedCsrf: string | null = null

export function clearCsrfCache() {
  cachedCsrf = null
}

export async function getCsrfToken(): Promise<string | null> {
  if (typeof document === 'undefined') return null
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
