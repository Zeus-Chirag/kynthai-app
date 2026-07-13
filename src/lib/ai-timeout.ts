/**
 * AI Timeout Module
 *
 * Enforces timeouts on all AI operations to prevent server hangs and memory exhaustion.
 */

export class AiTimeoutError extends Error {
  constructor(ms?: number) {
    super(`AI request timed out after ${ms}ms`)
    this.name = 'AiTimeoutError'
  }
}

export const AI_TIMEOUTS = {
  DEFAULT: 30000,   // 30s for simple queries
  COMPLEX: 60000,   // 60s for complex multi-step reasoning
  MEDIA: 120000,    // 120s for media processing (prescription scan, etc.)
  SEARCH: 45000,    // 45s for web search operations
}

export function getAdaptiveTimeout(contextSize: number, baseTimeout: number): number {
  // Scale timeout based on context size (characters)
  // Every 10k chars adds ~5s, capped at 2x base
  const scale = Math.min(2, 1 + contextSize / 20000)
  return Math.min(baseTimeout * scale, 180000) // hard cap at 180s
}

/**
 * Wraps a promise with a timeout ceiling.
 * Throws AiTimeoutError if the operation exceeds the timeout.
 */
export async function withAiTimeout<T = unknown>(
  promise: Promise<T>,
  ms: number = AI_TIMEOUTS.DEFAULT
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new AiTimeoutError(ms))
    }, ms)
  })

  return Promise.race([promise, timeoutPromise])
}
