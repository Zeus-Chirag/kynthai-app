import { describe, it, expect } from 'vitest'
import {
  DELIVERY_TIERS,
  DELIVERY_PLATFORM_FEE_PCT,
  haversineMiles,
  zipCoords,
  deliveryTierForDistance,
  calculateDeliveryFee,
  extractZip,
} from '../delivery-fee'

describe('DELIVERY_TIERS', () => {
  it('defines the documented tiers in ascending order', () => {
    expect(DELIVERY_TIERS.map((t) => t.label)).toEqual(['Free', '$8.00', '$15.00', 'Contact lab'])
    expect(DELIVERY_TIERS.map((t) => t.feeCents)).toEqual([0, 800, 1500, 0])
  })

  it('covers the full distance range with [min, max) boundaries', () => {
    expect(DELIVERY_TIERS[0]).toMatchObject({ minMi: 0, maxMi: 5 })
    expect(DELIVERY_TIERS[1]).toMatchObject({ minMi: 5, maxMi: 15 })
    expect(DELIVERY_TIERS[2]).toMatchObject({ minMi: 15, maxMi: 30 })
    expect(DELIVERY_TIERS[3]).toMatchObject({ minMi: 30, maxMi: null, contactLab: true })
  })

  it('uses an 18% platform fee', () => {
    expect(DELIVERY_PLATFORM_FEE_PCT).toBe(18)
  })
})

describe('deliveryTierForDistance', () => {
  it('is free within 5 miles, including exactly 0', () => {
    expect(deliveryTierForDistance(0).label).toBe('Free')
    expect(deliveryTierForDistance(4.99).label).toBe('Free')
  })

  it('charges $8 from 5 mi up to (but not including) 15 mi', () => {
    expect(deliveryTierForDistance(5).label).toBe('$8.00')
    expect(deliveryTierForDistance(5.01).label).toBe('$8.00')
    expect(deliveryTierForDistance(14.99).label).toBe('$8.00')
  })

  it('charges $15 from 15 mi up to (but not including) 30 mi', () => {
    expect(deliveryTierForDistance(15).label).toBe('$15.00')
    expect(deliveryTierForDistance(15.01).label).toBe('$15.00')
    expect(deliveryTierForDistance(29.99).label).toBe('$15.00')
  })

  it('requires contacting the lab at 30 mi and beyond', () => {
    expect(deliveryTierForDistance(30).contactLab).toBe(true)
    expect(deliveryTierForDistance(30.01).contactLab).toBe(true)
    expect(deliveryTierForDistance(500).contactLab).toBe(true)
  })

  it('never returns a non-travelable tier for in-range distances', () => {
    for (let mi = 0; mi <= 35; mi += 0.5) {
      const tier = deliveryTierForDistance(mi)
      expect(tier).toBeDefined()
    }
  })
})

describe('haversineMiles', () => {
  it('is 0 for identical coordinates', () => {
    expect(haversineMiles(30.2672, -97.7431, 30.2672, -97.7431)).toBe(0)
  })

  it('is ~183 mi between Austin and Dallas (known reference distance)', () => {
    const d = haversineMiles(30.2672, -97.7431, 32.7872, -96.7985)
    expect(d).toBeGreaterThan(182)
    expect(d).toBeLessThan(184)
  })

  it('is ~3-4 mi between Manhattan and Brooklyn', () => {
    const d = haversineMiles(40.7484, -73.9967, 40.6932, -73.9903)
    expect(d).toBeGreaterThan(3)
    expect(d).toBeLessThan(5)
  })

  it('is symmetric', () => {
    const d1 = haversineMiles(30.2672, -97.7431, 32.7872, -96.7985)
    const d2 = haversineMiles(32.7872, -96.7985, 30.2672, -97.7431)
    expect(d1).toBeCloseTo(d2, 10)
  })
})

describe('zipCoords', () => {
  it('looks up a known zip', () => {
    expect(zipCoords('78701')).toEqual([30.2672, -97.7431])
  })

  it('normalizes zip+4 to the 5-digit prefix', () => {
    expect(zipCoords('78701-1234')).toEqual([30.2672, -97.7431])
  })

  it('trims surrounding whitespace', () => {
    expect(zipCoords('  78701  ')).toEqual([30.2672, -97.7431])
  })

  it('returns null for unknown, empty, or malformed zips', () => {
    expect(zipCoords('00000')).toBeNull()
    expect(zipCoords('')).toBeNull()
    expect(zipCoords('787')).toBeNull()
    expect(zipCoords('not-a-zip')).toBeNull()
  })
})

describe('calculateDeliveryFee', () => {
  it('is free for same-area deliveries (< 5 mi)', () => {
    // Austin 78701 -> Austin 78702 (~1.8 mi)
    const r = calculateDeliveryFee('78701', '78702')
    expect(r.contactLab).toBe(false)
    expect(r.deliveryFeeCents).toBe(0)
    expect(r.platformFeeCents).toBe(0)
    expect(r.tier.label).toBe('Free')
  })

  it('charges $8 for 5-15 mi deliveries (Los Angeles 90210 -> 90001 ~13.4 mi)', () => {
    const r = calculateDeliveryFee('90210', '90001')
    expect(r.contactLab).toBe(false)
    expect(r.deliveryFeeCents).toBe(800)
    expect(r.platformFeeCents).toBe(144) // 18% of $8.00
    expect(r.tier.label).toBe('$8.00')
  })

  it('charges $8 for 5-15 mi deliveries (Seattle 98101 -> Redmond 98052 ~10.5 mi)', () => {
    const r = calculateDeliveryFee('98101', '98052')
    expect(r.deliveryFeeCents).toBe(800)
    expect(r.platformFeeCents).toBe(144)
  })

  it('requires contacting the lab for 30+ mi (Austin -> Dallas ~183 mi)', () => {
    const r = calculateDeliveryFee('78701', '75201')
    expect(r.contactLab).toBe(true)
    expect(r.deliveryFeeCents).toBe(0)
    expect(r.platformFeeCents).toBe(0)
    expect(r.distanceLabel).toMatch(/outside delivery area/)
  })

  it('defaults to contact-lab when either zip is unknown', () => {
    const r = calculateDeliveryFee('00000', '78701')
    expect(r.contactLab).toBe(true)
    expect(r.deliveryFeeCents).toBe(0)
    expect(r.distanceMi).toBeNull()
    expect(r.distanceLabel).toBe('Distance unavailable — please contact the lab')
  })

  it('applies the 18% platform fee to the delivery fee only', () => {
    const r = calculateDeliveryFee('90210', '90001')
    expect(DELIVERY_PLATFORM_FEE_PCT).toBe(18)
    expect(r.platformFeeCents).toBe(Math.round(r.deliveryFeeCents * (DELIVERY_PLATFORM_FEE_PCT / 100)))
  })

  it('rounds distance to one decimal place before tier selection', () => {
    const r = calculateDeliveryFee('98101', '98052') // ~10.5 mi
    expect(r.distanceMi).toBe(10.5)
    // A distance that rounds to 10.5 must still be in the $8 tier
    expect(r.deliveryFeeCents).toBe(800)
  })

  it('produces human-readable distance labels for bookable deliveries', () => {
    const r = calculateDeliveryFee('90210', '90001')
    expect(r.distanceLabel).toBe('13.4 mi')
  })
})

describe('extractZip', () => {
  it('extracts a zip from a full address', () => {
    expect(extractZip('123 Main St, Austin TX 78701')).toBe('78701')
    expect(extractZip('PO Box 90210, Beverly Hills CA 90210')).toBe('90210')
  })

  it('extracts zip+4 as the 5-digit base', () => {
    expect(extractZip('400 Broad St, Seattle WA 98101-1234')).toBe('98101')
  })

  it('returns null when no zip is present', () => {
    expect(extractZip('No zip here')).toBeNull()
    expect(extractZip('')).toBeNull()
  })
})
