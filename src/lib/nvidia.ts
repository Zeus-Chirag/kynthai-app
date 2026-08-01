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
  if (process.env.NVIDIA_API_KEY) {
    return process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct'
  }
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_MODEL || 'gpt-4o-mini'
  }
  return process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct'
}
export const NVIDIA_MODEL: string = resolveModel()

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1'

// A real provider key is required for AI features. Treat obvious placeholder
// values (e.g. the literal "sk-PLACE..._KEY" placeholder shipped in some env
// setups) as NOT available so chat degrades gracefully to the medicine-DB /
// config-needed path instead of calling the provider and 401/500ing.
function isRealProviderKey(value: string | undefined): boolean {
  if (!value) return false
  if (value.length < 16) return false
  // Placeholder / sample patterns: PLACE..., placeholder, your-api-key, xxx, changeme
  return !/PLACE|placeholder|your[-_ ]api|xxxx|changeme|sample/i.test(value)
}

export function isAiAvailable(): boolean {
  return isRealProviderKey(process.env.NVIDIA_API_KEY) || isRealProviderKey(process.env.OPENAI_API_KEY)
}

/**
 * Get the AI client instance.
 * Uses the NVIDIA NIM hosted endpoint when NVIDIA_API_KEY is configured
 * (OpenAI-compatible), otherwise falls back to OpenAI directly.
 */
export function getNvidia(): OpenAI {
  const nvidiaKey = process.env.NVIDIA_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (!nvidiaKey && !openaiKey) {
    throw new Error('NVIDIA_API_KEY (or OPENAI_API_KEY) must be set for AI features')
  }

  const apiKey = nvidiaKey || openaiKey as string
  const baseURL = nvidiaKey
    ? process.env.NVIDIA_BASE_URL || NVIDIA_BASE_URL
    : 'https://api.openai.com/v1'

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

      const choice = response.choices?.[0]
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
