/**
 * fetchWithTimeout — fetch with automatic timeout and fallback.
 *
 * Prevents stuck spinners by aborting fetches after a timeout.
 * Returns null on failure so callers can fall back to demo data.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000,
): Promise<Response | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      credentials: 'include',
    });
    clearTimeout(timeoutId);
    return res;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * fetchJsonWithFallback — fetch + parse JSON with timeout + fallback data.
 *
 * If the fetch fails or times out, returns the fallback instead of hanging.
 */
export async function fetchJsonWithFallback<T>(
  url: string,
  fallback: T,
  options: RequestInit = {},
  timeoutMs = 8000,
): Promise<{ data: T; ok: boolean; offline: boolean }> {
  const res = await fetchWithTimeout(url, options, timeoutMs);

  if (!res || !res.ok) {
    return { data: fallback, ok: false, offline: true };
  }

  try {
    const data = (await res.json()) as T;
    return { data, ok: true, offline: false };
  } catch {
    return { data: fallback, ok: false, offline: true };
  }
}
