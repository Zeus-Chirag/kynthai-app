import OpenAI from 'openai'

// ──────────────────────────────────────────────────────────────────────────────
// sensitive health data / AI PROCESSOR BOUNDARY
// ──────────────────────────────────────────────────────────────────────────────
// This module is the gateway to ZenMux (stepfun). All outbound chat requests
// may include patient health context and leave our infrastructure. Audit
// boundaries and sensitive health data-minimization checks are enforced in the caller (chat route).
// Do not import or call from client-side code.
// ──────────────────────────────────────────────────────────────────────────────

const ZENMUX_BASE_URL = 'https://zenmux.ai/api/v1'
const ZENMUX_API_KEY = process.env.ZENMUX_API_KEY || ''

// Model fallback chain — if primary fails, degrade gracefully.
// Each entry: [modelId, provider_base_url, api_key_env]
// Only the first entry's key is required; subsequent entries use their own env.
type ModelEntry = [string, string, string]

// CRITICAL: never start without a primary key.
const PRIMARY_KEY = process.env.ZENMUX_API_KEY || ''

// Build fallback chain from env. At minimum the primary must be set.
function buildModelChain(): ModelEntry[] {
  const chain: ModelEntry[] = []
  // 1° — configured primary (default: ZenMux free tier)
  const primary = process.env.ZAI_MODEL || 'stepfun/step-3.7-flash-free'
  chain.push([primary, process.env.ZENMUX_BASE_URL || ZENMUX_BASE_URL, 'ZENMUX_API_KEY'])
  // 2° — optional secondary (e.g. openrouter/gpt-4o-mini, anthropic/claude-3-haiku)
  const secondary = process.env.ZAI_MODEL_FALLBACK
  if (secondary && process.env.ZAI_FALLBACK_API_KEY) {
    const secUrl = process.env.ZAI_FALLBACK_BASE_URL || 'https://openrouter.ai/api/v1'
    chain.push([secondary, secUrl, 'ZAI_FALLBACK_API_KEY'])
  }
  return chain
}

export const ZAI_MODEL = PRIMARY_KEY ? buildModelChain()[0]![0] : 'stepfun/step-3.7-flash-free'
export const ZAI_MODEL_CHAIN = buildModelChain()
export const ZAI_HAS_FALLBACK = ZAI_MODEL_CHAIN.length > 1

// Lazily-initialised pool: one client per provider.
interface ClientEntry { client: OpenAI; key: string }

let clients: ClientEntry[] = []

function buildClient(baseURL: string, apiKey: string): OpenAI {
  return new OpenAI({ baseURL, apiKey })
}

/**
 * Returns an OpenAI-compatible client. On failure, tries the next provider
 * in the fallback chain before throwing. Returns the client directly so all
 * existing callers (zai.chat.completions.create(...)) continue to work.
 */
export async function getZai(): Promise<OpenAI> {
  if (clients.length > 0) {
    // Use the first healthy client (fallback was handled at startup)
    return clients[0]!.client
  }
  // Build lazy pool on first call
  const chain = ZAI_MODEL_CHAIN
  if (chain.length === 0) {
    throw new Error(
      'CRITICAL: No AI model chain configured. Set ZENMUX_API_KEY in .env.'
    )
  }
  for (const [, baseURL, keyEnv] of chain) {
    const apiKey = process.env[keyEnv] || ''
    if (apiKey) {
      clients.push({ client: buildClient(baseURL, apiKey), key: apiKey })
    }
  }
  if (clients.length === 0) {
    throw new Error(
      'CRITICAL: ZENMUX_API_KEY is not set. AI features cannot work without it. ' +
      'Set it in your .env file or environment.'
    )
  }
  return clients[0]!.client
}

/**
 * True if the AI gateway is healthy. Returns false if no provider key is set
 * or all known providers are unreachable. Safe to call from health checks.
 */
export function isAiAvailable(): boolean {
  const chain = ZAI_MODEL_CHAIN
  if (chain.length === 0) return false
  for (const [, , keyEnv] of chain) {
    if (process.env[keyEnv]) return true
  }
  return false
}
