/**
 * Kynthai Currency System
 * -----------------------------
 * All prices shown to users are USD.
 * No country-specific tax is included in displayed prices.
 * US sales tax, if applicable, is collected at checkout per state regulations.
 */

export type Currency = 'USD' | 'EUR' | 'GBP'

export const CURRENCIES: Record<
  Currency,
  { symbol: string; locale: string; label: string; flag: string }
> = {
  USD: { symbol: '$', locale: 'en-US', label: 'USD', flag: '🇺🇸' },
  EUR: { symbol: '€', locale: 'en-IE', label: 'EUR', flag: '🇪🇺' },
  GBP: { symbol: '£', locale: 'en-GB', label: 'GBP', flag: '🇬🇧' },
}

export const CURRENCY_ORDER: Currency[] = ['USD', 'EUR', 'GBP']

/** Patient subscription prices — in USD per month (no tax) */
export const PRICING: Record<
  Currency,
  {
    plus: { monthly: number; yearly: number }
    family_pro: { monthly: number; yearly: number }
  }
> = {
  USD: {
    plus: { monthly: 9.99, yearly: 99.99 },
    family_pro: { monthly: 19.99, yearly: 199.99 },
  },
  EUR: {
    plus: { monthly: 9.99, yearly: 99.99 },
    family_pro: { monthly: 19.99, yearly: 199.99 },
  },
  GBP: {
    plus: { monthly: 7.99, yearly: 79.99 },
    family_pro: { monthly: 15.99, yearly: 159.99 },
  },
}

/** Early Adopter prices — in USD per month (no tax) */
export const EARLY_ADOPTER_PRICING = {
  USD: {
    individual: { monthly: 9.99, yearly: 99.99 },
    family: { monthly: 19.99, yearly: 199.99 },
  },
}

/** Format a price amount with the currency symbol. */
export function formatPrice(amount: number, currency: Currency): string {
  const c = CURRENCIES[currency]
  return `${c.symbol}${amount}`
}

/** Yearly savings percentage for display. */
export function yearlySavingsPct(currency: Currency, tier: 'plus' | 'family_pro'): number {
  const p = PRICING[currency][tier]
  const monthlyAnnual = p.monthly * 12
  if (monthlyAnnual === 0) return 0
  return Math.round((1 - p.yearly / monthlyAnnual) * 100)
}

/** Auto-detect currency from browser locale + timezone. Falls back to USD. */
export function detectCurrency(): Currency {
  if (typeof navigator === 'undefined') return 'USD'
  // US-first deployment — always return USD regardless of locale
  return 'USD'
}
