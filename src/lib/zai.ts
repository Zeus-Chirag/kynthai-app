import OpenAI from 'openai'
import { withOpenAICircuitBreaker } from './circuit-breaker'
import { logger } from './logger'

// ──────────────────────────────────────────────────────────────────────────────
// sensitive health data / AI PROCESSOR BOUNDARY
// ──────────────────────────────────────────────────────────────────────────────
// This module is the gateway to OpenAI / ZenMux. All outbound chat requests
// may include patient health context and leave our infrastructure. Audit
// boundaries and sensitive health data-minimization checks are enforced in
// the caller (chat route). Do not import or call from client-side code.

export const ZAI_MODEL: string = process.env.ZAI_MODEL || 'gpt-4o-mini'

export function isAiAvailable(): boolean {
  return !!(process.env.ZAI_API_KEY || process.env.OPENAI_API_KEY)
}

/**
 * Get the AI client instance.
 * Uses ZenMux base URL if configured, otherwise defaults to OpenAI.
 */
export function getZai(): OpenAI {
  const apiKey = process.env.ZAI_API_KEY || process.env.OPENAI_API_KEY
  const baseURL = process.env.ZAI_BASE_URL || undefined

  if (!apiKey) {
    throw new Error('ZAI_API_KEY or OPENAI_API_KEY must be set for AI features')
  }

  return new OpenAI({
    apiKey,
    baseURL,
    timeout: 30000,
    maxRetries: 1,
  })
}

type AIChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
  name?: string
}

interface AIChatOptions {
  temperature?: number
  maxTokens?: number
  stream?: boolean
  model?: string
  signal?: AbortSignal
}

interface AIChatResult {
  content: string | null
  finishReason: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * Send a chat completion to the configured AI provider.
 * Uses the OpenAI-compatible API (OpenAI or ZenMux/stepfun).
 */
export async function aiChat(
  messages: AIChatMessage[],
  options: AIChatOptions = {},
): Promise<AIChatResult> {
  const zai = getZai()
  const model = options.model || ZAI_MODEL

  return withOpenAICircuitBreaker(async () => {
    try {
      const response = await zai.chat.completions.create(
        {
          model,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            ...(m.name ? { name: m.name } : {}),
          })),
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 1024,
          ...(options.signal ? { signal: options.signal } : {}),
        },
        { signal: options.signal },
      )

      const choice = response.choices?.[0]
      return {
        content: choice?.message?.content || null,
        finishReason: choice?.finish_reason || 'stop',
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
      }
    } catch (err: any) {
      if (err.name === 'CircuitBreakerOpenError') throw err
      logger.phiSafeError(err, 'ai.chat')
      throw err
    }
  })
}

/**
 * Simple text completion (non-streaming)
 */
export async function aiComplete(
  prompt: string,
  options: AIChatOptions = {},
): Promise<string> {
  const result = await aiChat(
    [{ role: 'user', content: prompt }],
    { ...options, temperature: options.temperature ?? 0.3 },
  )
  return result.content || ''
}
