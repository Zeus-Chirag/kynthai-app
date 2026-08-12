import OpenAI from 'openai'
import { withOpenAICircuitBreaker } from './circuit-breaker'
import { logger } from './logger'

// Per-model cost per 1K tokens (USD)
// Source: https://openai.com/pricing (as of 2026-07-30)
// NVIDIA NIM-hosted models not listed here fall back to the DEFAULT rates below;
// the estimator is best-effort observability only, not billing.
const MODEL_COST_TABLE: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4o-mini-2024-07-18': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
}

const DEFAULT_INPUT_COST = 0.001
const DEFAULT_OUTPUT_COST = 0.002

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const rates = MODEL_COST_TABLE[model]
  if (!rates) {
    // Fallback: use averages for unknown models
    const inputCost = (promptTokens / 1000) * DEFAULT_INPUT_COST
    const outputCost = (completionTokens / 1000) * DEFAULT_OUTPUT_COST
    return Math.round((inputCost + outputCost) * 100000) / 100000
  }
  const inputCost = (promptTokens / 1000) * rates.input
  const outputCost = (completionTokens / 1000) * rates.output
  return Math.round((inputCost + outputCost) * 100000) / 100000
}

// ──────────────────────────────────────────────────────────────────────────────
// sensitive health data / AI PROCESSOR BOUNDARY
// ──────────────────────────────────────────────────────────────────────────────
// This module is the gateway to NVIDIA NIM (OpenAI-compatible endpoint at
// https://integrate.api.nvidia.com/v1). All outbound chat requests may include
// patient health context and leave our infrastructure. Audit boundaries and
// sensitive health data-minimization checks are enforced in the caller (chat
// route). Do not import or call from client-side code.

// Verified live against the NVIDIA catalog (2026-07-31): model id `meta/llama-3.2-11b-vision-instruct`
// (multimodal — text + image input; un-breaks medicine-ID and prescription-scan).
//
// Provider-aware model resolution: getNvidia() points the OpenAI-compatible
// client at api.openai.com when ONLY OPENAI_API_KEY is configured. Sending the
// NVIDIA NIM model id in that case makes OpenAI 404 ("model does not exist"),
// which surfaced as chat POST -> 500 "Failed to get AI response" in production.
// Resolve the model to match the provider that is actually configured.
function resolveModel(): string {
  if (process.env.CLINE_API_KEY) {
    return process.env.CLINE_MODEL || 'google/gemini-2.5-flash'
  }
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_MODEL || 'gpt-4o-mini'
  }
  if (process.env.NVIDIA_API_KEY) {
    return process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct'
  }
  return process.env.CLINE_MODEL || 'google/gemini-2.5-flash'
}
export const NVIDIA_MODEL: string = resolveModel()

const CLINE_BASE_URL = 'https://api.cline.bot/api/v1'
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1'

function isRealProviderKey(value: string | undefined): boolean {
  if (!value) return false
  if (value.length < 16) return false
  return !/PLACE|placeholder|your[-_ ]api|xxxx|changeme|sample/i.test(value)
}

/**
 * Normalize a chat.completions response across providers.
 * CLINE wraps the payload as `{"data":{"choices":[...]},"success":true}` while
 * OpenAI/NVIDIA return `{"choices":[...]}` at the top level. Return the choices
 * array either way; an empty array lets callers degrade gracefully.
 */
export function choicesOf(completion: any): Array<any> {
  if (Array.isArray(completion?.choices)) return completion.choices
  if (Array.isArray(completion?.data?.choices)) return completion.data.choices
  return []
}

export function isAiAvailable(): boolean {
  return (
    isRealProviderKey(process.env.CLINE_API_KEY) ||
    isRealProviderKey(process.env.OPENAI_API_KEY) ||
    isRealProviderKey(process.env.NVIDIA_API_KEY)
  )
}

/**
 * Get the AI client instance.
 * Provider priority: CLINE_API_KEY → OPENAI_API_KEY → NVIDIA_API_KEY.
 * All use the OpenAI-compatible chat completions API.
 */
export function getNvidia(): OpenAI {
  const clineKey = process.env.CLINE_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  const nvidiaKey = process.env.NVIDIA_API_KEY

  if (!clineKey && !openaiKey && !nvidiaKey) {
    throw new Error('CLINE_API_KEY (or OPENAI_API_KEY/NVIDIA_API_KEY) must be set for AI features')
  }

  const apiKey = clineKey || openaiKey || nvidiaKey as string
  const baseURL = clineKey
    ? CLINE_BASE_URL
    : nvidiaKey && !openaiKey
      ? (process.env.NVIDIA_BASE_URL || NVIDIA_BASE_URL)
      : 'https://api.openai.com/v1'

  return new OpenAI({
    apiKey,
    baseURL,
    timeout: 30000,
    maxRetries: 1,
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// Provider chain with auth-failure fallback
// ──────────────────────────────────────────────────────────────────────────────
// The configured priority provider's key can be revoked/expired (or the model
// id can be wrong for that endpoint) while other providers are still
// configured. Without a fallback every AI feature 500s — a single dead key is
// a total AI outage. This helper retries the next provider only on
// auth/config-class failures (401 bad key, 403 forbidden, 404 model not
// found); rate limits and upstream 5xx propagate immediately (switching
// providers on those would mask real load problems).
// ponytail: chain order is fixed CLINE → OPENAI → NVIDIA, resolved per call
// from env. If you ever need runtime priority control, lift into config.

type ProviderEntry = { label: string; apiKey: string; baseURL: string; model: string }

function providerChain(): ProviderEntry[] {
  const chain: ProviderEntry[] = []
  if (isRealProviderKey(process.env.CLINE_API_KEY))
    chain.push({
      label: 'cline',
      apiKey: process.env.CLINE_API_KEY as string,
      baseURL: CLINE_BASE_URL,
      model: process.env.CLINE_MODEL || 'google/gemini-2.5-flash',
    })
  if (isRealProviderKey(process.env.OPENAI_API_KEY))
    chain.push({
      label: 'openai',
      apiKey: process.env.OPENAI_API_KEY as string,
      baseURL: 'https://api.openai.com/v1',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    })
  if (isRealProviderKey(process.env.NVIDIA_API_KEY))
    chain.push({
      label: 'nvidia',
      apiKey: process.env.NVIDIA_API_KEY as string,
      baseURL: process.env.NVIDIA_BASE_URL || NVIDIA_BASE_URL,
      model: process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct',
    })
  return chain
}

/**
 * One shared chat-completions call across all AI routes, with provider
 * fallback. `model` is provider-resolved here — call sites must NOT pass it.
 * Returns the raw OpenAI SDK completion (stream when `stream: true`).
 */
export async function createChatCompletion(
  body: Record<string, unknown>,
  requestOpts?: { signal?: AbortSignal },
): Promise<unknown> {
  const chain = providerChain()
  if (chain.length === 0) {
    throw new Error('CLINE_API_KEY (or OPENAI_API_KEY/NVIDIA_API_KEY) must be set for AI features')
  }
  const { model: _dropped, ...params } = body
  let lastErr: unknown = null
  for (const provider of chain) {
    const client = new OpenAI({
      apiKey: provider.apiKey,
      baseURL: provider.baseURL,
      timeout: 30000,
      maxRetries: 1,
    })
    try {
      return await client.chat.completions.create(
        { ...params, model: provider.model } as never,
        requestOpts as never,
      )
    } catch (err: any) {
      lastErr = err
      const status = err?.status
      if (status !== 401 && status !== 403 && status !== 404) throw err
      logger.warn('ai.provider_fallback', {
        from: provider.label,
        status,
        reason: err?.message?.slice(0, 160),
      })
    }
  }
  throw lastErr
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
 * Uses the OpenAI-compatible API (NVIDIA NIM / OpenAI).
 */
export async function aiChat(
  messages: AIChatMessage[],
  options: AIChatOptions = {},
): Promise<AIChatResult> {
  const nvidia = getNvidia()
  const model = options.model || NVIDIA_MODEL

  return withOpenAICircuitBreaker(async () => {
    try {
      const response = await nvidia.chat.completions.create(
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

      const choice = choicesOf(response)[0]
      const usage = response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined

      // Log token usage for cost tracking and observability
      if (usage) {
        const costEstimate = estimateCost(model, usage.promptTokens, usage.completionTokens)
        logger.info('ai.token_usage', {
          model,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          estimatedCostUsd: costEstimate,
        })
      }

      return {
        content: choice?.message?.content || null,
        finishReason: choice?.finish_reason || 'stop',
        usage,
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
