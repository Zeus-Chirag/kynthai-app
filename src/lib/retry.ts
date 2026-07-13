/**
 * Retry utilities with exponential backoff and jitter.
 */

export interface RetryOptions {
  retries?: number
  delayMs?: number
  backoff?: number
  jitterMs?: number
  shouldRetry?: (error: unknown) => boolean
}

export const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  retries: 2,
  delayMs: 500,
  backoff: 2,
  jitterMs: 300,
  shouldRetry: (err: unknown) => {
    if (typeof err === 'object' && err && 'status' in err) {
      const status = (err as { status?: number }).status
      if (typeof status === 'number') {
        return status >= 500 || status === 429 || status === 0
      }
    }
    const message = err instanceof Error ? err.message : String(err)
    return /(Network|timeout|429|5\d{2})\b/i.test(message)
  },
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts: Required<RetryOptions> = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const canRetry = attempt < opts.retries && (opts.shouldRetry?.(err) ?? true)
      if (!canRetry) break

      const jitter = Math.random() * opts.jitterMs
      const delay = opts.delayMs * Math.pow(opts.backoff, attempt) + jitter
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}
