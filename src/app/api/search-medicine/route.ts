import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { requireAuth } from '@/lib/api-helpers'
import { logAudit } from '@/lib/auth'
import { sanitizeText } from '@/lib/security'
import { logger } from '@/lib/logger'
import { searchDrugs, type Drug } from '@/lib/drug-database'
import { getMedicineFromDb } from '@/lib/medicine-db-cache'
import { EXTENDED_MEDICINE_DB } from '@/lib/medicine-db-extended'
export const dynamic = 'force-dynamic'

// SECURITY: cap query length to prevent prompt-inflation / abuse.
const MAX_QUERY_LEN = 200

interface SearchResult {
  name: string
  url: string
  snippet: string
  host_name: string
  date?: string
  favicon?: string
}

// Result contract the UI (search-medicine.tsx) renders: name, url, snippet,
// host_name (optional date/favicon). Local DB entries link out to a web
// search so users can dig deeper; `source` in the response tells us where
// results came from ('database' | 'web').

function buildSnippet(
  drug?: Drug,
  info?: {
    commonUses?: string[]
    dosage?: string
    sideEffects?: string[]
    foodInteractions?: string[]
  } | null
): string {
  const parts: string[] = []
  if (drug) {
    parts.push(`${drug.category}${drug.strengths.length ? ' — strengths: ' + drug.strengths.join(', ') : ''}`)
  }
  if (info) {
    if (info.commonUses?.length) parts.push(`Common uses: ${info.commonUses.slice(0, 3).join(', ')}`)
    if (info.dosage) parts.push(`Typical dosage: ${info.dosage.split('.').slice(0, 2).join('.')}`)
    if (info.sideEffects?.length) parts.push(`Common side effects: ${info.sideEffects.slice(0, 3).join(', ')}`)
    if (info.foodInteractions?.length) parts.push(`Interactions: ${info.foodInteractions.slice(0, 2).join('; ')}`)
  }
  return parts.join('. ').slice(0, 400)
}

// Stop words stripped before token matching so queries like
// "paracetamol side effects" still hit the Paracetamol entry.
const STOP_WORDS = new Set([
  'side', 'effects', 'uses', 'use', 'dosage', 'dose', 'interactions',
  'interaction', 'what', 'is', 'are', 'the', 'and', 'for', 'with', 'without',
  'of', 'in', 'on', 'how', 'to', 'take', 'taken', 'when', 'why', 'should',
  'does', 'do', 'can', 'any', 'all', 'per', 'day', 'daily', 'vs', 'or',
])

function tokenizeQuery(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t))
}

function matchesDrug(drug: Drug, norm: string, tokens: string[]): boolean {
  const haystack = [
    drug.name,
    drug.genericName,
    drug.category,
    ...drug.commonBrands,
    ...drug.strengths,
  ]
    .join(' ')
    .toLowerCase()
  if (haystack.includes(norm)) return true
  return tokens.some((t) => haystack.includes(t))
}

/**
 * Tier 1 — curated local drug databases (free, $0, works with no API key).
 * Searches the 19-drug quick list (drug-database.ts) first, then the
 * 30+ drug detailed DB (medicine-db-cache.ts) and extended DB.
 */
function searchLocalDb(q: string, num: number): SearchResult[] {
  const results: SearchResult[] = []
  const seen = new Set<string>()
  const norm = q.toLowerCase().trim()
  const tokens = tokenizeQuery(norm)

  // 1) Quick list (name / generic / category / brand / strength matching)
  for (const drug of searchDrugs(norm).concat(searchDrugs(''))) {
    if (results.length >= num) break
    if (!matchesDrug(drug, norm, tokens)) continue
    const key = drug.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const info = getMedicineFromDb(drug.name)
    results.push({
      name: drug.name,
      url: `https://www.google.com/search?q=${encodeURIComponent(`${drug.name} ${drug.genericName}`)}`,
      snippet: buildSnippet(drug, info),
      host_name: 'Kynthai Drug Database',
    })
  }

  // 2) Detailed DB — partial match on the raw query (e.g. "metformin 500mg")
  if (results.length < num) {
    const info = getMedicineFromDb(norm)
    if (info && !seen.has(info.name.toLowerCase())) {
      seen.add(info.name.toLowerCase())
      results.push({
        name: info.name,
        url: `https://www.google.com/search?q=${encodeURIComponent(info.name)}`,
        snippet: buildSnippet(undefined, info),
        host_name: 'Kynthai Drug Database',
      })
    }
  }

  // 3) Extended DB (additional meds not in the quick list)
  if (results.length < num) {
    for (const [key, ext] of Object.entries(EXTENDED_MEDICINE_DB)) {
      if (results.length >= num) break
      if (!key.includes(norm) && !norm.includes(key) && !tokens.some((t) => key.includes(t))) continue
      if (seen.has(ext.name.toLowerCase())) continue
      seen.add(ext.name.toLowerCase())
      results.push({
        name: ext.name,
        url: `https://www.google.com/search?q=${encodeURIComponent(ext.name)}`,
        snippet: buildSnippet(undefined, ext),
        host_name: 'Kynthai Drug Database',
      })
    }
  }

  return results.slice(0, num)
}

function getOpenAiClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  return new OpenAI({ apiKey: key, timeout: 30000, maxRetries: 1 })
}

/**
 * Tier 2 — live web search via OpenAI Responses API (`web_search_preview`).
 * Activates automatically once OPENAI_API_KEY is set (no code change needed).
 * Returns null on any failure so the route gracefully falls back to Tier 1.
 */
async function openaiWebSearch(client: OpenAI, q: string, num: number): Promise<SearchResult[] | null> {
  try {
    const response = (await client.responses.create({
      model: 'gpt-4o-mini',
      // web_search_preview is a built-in OpenAI server-side web search tool
      tools: [{ type: 'web_search_preview' }] as any,
      input: q,
      max_output_tokens: 1024,
    })) as any

    const text = typeof response?.output_text === 'string' ? response.output_text : ''
    const items = Array.isArray(response?.output) ? response.output : []
    const results: SearchResult[] = []

    for (const item of items) {
      const searchResults = item?.result?.search_results
      if (!Array.isArray(searchResults)) continue
      for (const r of searchResults) {
        if (results.length >= num) break
        const url = typeof r?.url === 'string' ? r.url : ''
        if (!url) continue
        const host = (() => {
          try {
            return new URL(url).hostname.replace(/^www\./, '')
          } catch {
            return 'web'
          }
        })()
        results.push({
          name: typeof r?.title === 'string' ? r.title : 'Search result',
          url,
          snippet: typeof r?.snippet === 'string' ? r.snippet : (typeof r?.content === 'string' ? r.content : ''),
          host_name: host,
          date: typeof r?.published_date === 'string' ? r.published_date : undefined,
          favicon: `https://www.google.com/s2/favicons?domain=${host}&sz=32`,
        })
      }
    }

    // Fallback: web search returned text but no structured citations — surface it.
    if (results.length === 0 && text.trim()) {
      results.push({
        name: q,
        url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
        snippet: text.slice(0, 300),
        host_name: 'AI web search',
      })
    }

    return results.length > 0 ? results : null
  } catch (error) {
    logger.phiSafeError(error, 'medicine.search.openai')
    return null
  }
}

// GET /api/search-medicine?q=<query>&num=8
export async function GET(req: NextRequest) {
  const { response, user } = await requireAuth(req)
  if (response || !user) return response!
  const u = user!

  await logAudit(user.id, 'medicine.search', { resourceType: 'Medication' })

  try {
    const qRaw = req.nextUrl.searchParams.get('q') || ''
    const q = sanitizeText(qRaw, MAX_QUERY_LEN)
    const num = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get('num') || '8', 10) || 8, 1), 10)

    if (!q) {
      return NextResponse.json(
        { error: 'q (query) is required' },
        { status: 400 }
      )
    }

    // Tier 1 — curated local drug DB (always available, $0)
    const local = searchLocalDb(q, num)

    // Tier 2 — live web search when OPENAI_API_KEY is configured
    const client = getOpenAiClient()
    let results: SearchResult[] = []
    let source = 'database'
    if (client) {
      const web = await openaiWebSearch(client, q, num)
      if (web && web.length > 0) {
        results = web
        source = 'web'
        // Append curated local matches (dedup by name) — best of both worlds.
        for (const l of local) {
          if (results.length >= num) break
          if (!results.some((r) => r.name.toLowerCase() === l.name.toLowerCase())) {
            results.push(l)
          }
        }
      }
    }
    if (results.length === 0) results = local

    return NextResponse.json({
      results,
      query: q,
      source,
      ...(source === 'database' && !process.env.OPENAI_API_KEY
        ? { warning: 'Live web search requires OPENAI_API_KEY — showing curated drug database results instead.' }
        : {}),
    })
  } catch (error) {
    logger.phiSafeError(error)
    return NextResponse.json(
      { error: 'Failed to search' },
      { status: 500 }
    )
  }
}
