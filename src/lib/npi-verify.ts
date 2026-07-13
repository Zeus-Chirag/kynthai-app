/**
 * NPI Verification — queries the free, public CMS NPPES registry.
 * https://npiregistry.cms.hhs.gov/
 * No API key required. Rate limit: ~100 req/min.
 */

export interface NpiResult {
  valid: boolean
  name?: string
  taxonomy?: string
  state?: string
  error?: string
}

export async function verifyNpi(npi: string): Promise<NpiResult> {
  const cleaned = npi.replace(/\D/g, '')
  if (cleaned.length !== 10) {
    return { valid: false, error: 'NPI must be exactly 10 digits' }
  }

  try {
    const res = await fetch(
      `https://npiregistry.cms.hhs.gov/api/?number=${cleaned}&version=2.1`,
      { headers: { Accept: 'application/json' }, next: { revalidate: 3600 } }
    )
    if (!res.ok) {
      return { valid: false, error: 'NPI registry unavailable' }
    }

    const data = await res.json()
    if (!data.results || data.results.length === 0) {
      return { valid: false, error: 'NPI not found in CMS registry' }
    }

    const r = data.results[0]!
    const basic = r.basic || {}
    const taxonomies = r.taxonomies || []
    const primaryTax = taxonomies.find((t: any) => t.primary) || taxonomies[0]

    return {
      valid: true,
      name: [basic.first_name, basic.last_name].filter(Boolean).join(' ') || undefined,
      taxonomy: primaryTax?.desc || undefined,
      state: basic.recipient_state || undefined,
    }
  } catch {
    return { valid: false, error: 'Failed to verify NPI — please try again' }
  }
}
