/**
 * Kynthai Delivery Fee System
 * ---------------------------
 * Distance-based delivery fees for home collection lab bookings.
 * Uses a curated list of US zip codes → lat/lng for distance calculation.
 * Tiers: 0-5mi free, 5-15mi $8, 15-30mi $15, 30+mi "Contact lab"
 */

// ── Distance tiers ──────────────────────────────────────────────────────────
export interface DeliveryTier {
  minMi: number
  maxMi: number | null // null = no upper limit
  feeCents: number     // 0 = free
  label: string        // "Free", "$8", "$15", "Contact lab"
  contactLab: boolean  // true = cannot book, must contact lab
}

export const DELIVERY_TIERS: DeliveryTier[] = [
  { minMi: 0,  maxMi: 5,   feeCents: 0,    label: 'Free',         contactLab: false },
  { minMi: 5,  maxMi: 15,  feeCents: 800,  label: '$8.00',        contactLab: false },
  { minMi: 15, maxMi: 30,  feeCents: 1500, label: '$15.00',       contactLab: false },
  { minMi: 30, maxMi: null, feeCents: 0,   label: 'Contact lab',  contactLab: true },
]

// 18% platform fee on delivery fees
export const DELIVERY_PLATFORM_FEE_PCT = 18

// ── Haversine distance ──────────────────────────────────────────────────────
function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Great-circle distance in miles between two lat/lng points. */
export function haversineMiles(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 3958.8 // Earth radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Zip code lookup ─────────────────────────────────────────────────────────
// Curated list of ~50 major US zip codes for distance estimation.
// Patients can also enter a city; we approximate with the city center zip.
// In production, replace with a full zip code database or geocoding API.
const ZIP_COORDS: Record<string, [number, number]> = {
  // Texas
  '78701': [30.2672, -97.7431], // Austin
  '78702': [30.2500, -97.7200],
  '78745': [30.2200, -97.7900],
  '75201': [32.7872, -96.7985], // Dallas
  '75202': [32.7850, -96.8000],
  '77001': [29.7604, -95.3698], // Houston
  '77002': [29.7545, -95.3550],
  '78201': [29.4684, -98.5255], // San Antonio
  '79901': [31.7619, -106.4850], // El Paso
  // California
  '90001': [33.9425, -118.2551], // Los Angeles
  '90210': [34.0901, -118.4065], // Beverly Hills
  '94102': [37.7749, -122.4194], // San Francisco
  '94105': [37.7890, -122.3940],
  '92101': [32.7157, -117.1611], // San Diego
  '95101': [37.3382, -121.8863], // San Jose
  // New York
  '10001': [40.7484, -73.9967], // Manhattan
  '10013': [40.7201, -74.0048],
  '11201': [40.6932, -73.9903], // Brooklyn
  '10451': [40.8203, -73.9235], // Bronx
  '10301': [40.6433, -74.0764], // Staten Island
  // Florida
  '33101': [25.7617, -80.1918], // Miami
  '32801': [28.5383, -81.3792], // Orlando
  '33601': [27.9506, -82.4572], // Tampa
  '32301': [30.4383, -84.2807], // Tallahassee
  // Illinois
  '60601': [41.8819, -87.6278], // Chicago
  '60602': [41.8805, -87.6305],
  // Pennsylvania
  '19101': [39.9526, -75.1652], // Philadelphia
  '15201': [40.4406, -79.9959], // Pittsburgh
  // Ohio
  '43215': [39.9612, -82.9988], // Columbus
  '44101': [41.4993, -81.6944], // Cleveland
  '45202': [39.1031, -84.5120], // Cincinnati
  // Georgia
  '30301': [33.7490, -84.3880], // Atlanta
  // North Carolina
  '28201': [35.2271, -80.8431], // Charlotte
  '27601': [35.7796, -78.6382], // Raleigh
  // Washington
  '98101': [47.6062, -122.3321], // Seattle
  '98052': [47.6696, -122.1273], // Redmond
  // Massachusetts
  '02101': [42.3601, -71.0589], // Boston
  // Colorado
  '80201': [39.7392, -104.9903], // Denver
  // Arizona
  '85001': [33.4484, -112.0740], // Phoenix
  // Tennessee
  '37201': [36.1627, -86.7816], // Nashville
  // Missouri
  '63101': [38.6270, -90.1994], // St. Louis
  // Maryland
  '21201': [39.2904, -76.6122], // Baltimore
  // Wisconsin
  '53201': [43.0389, -87.9065], // Milwaukee
  // Minnesota
  '55401': [44.9778, -93.2650], // Minneapolis
  // Oregon
  '97201': [45.5155, -122.6789], // Portland
  // Nevada
  '89101': [36.1699, -115.1398], // Las Vegas
  // Michigan
  '48201': [42.3314, -83.0458], // Detroit
  // Indiana
  '46201': [39.7684, -86.1581], // Indianapolis
  // Utah
  '84101': [40.7608, -111.8910], // Salt Lake City
  // Virginia
  '23219': [37.5407, -77.4360], // Richmond
  // Kansas
  '66101': [39.1067, -94.6773], // Kansas City
  // New Mexico
  '87101': [35.0844, -106.6504], // Albuquerque
  // Oklahoma
  '73101': [35.4676, -97.5164], // Oklahoma City
  // Kentucky
  '40202': [38.2527, -85.7585], // Louisville
  // Louisiana
  '70112': [29.9511, -90.0715], // New Orleans
  // Alabama
  '35203': [33.5207, -86.8025], // Birmingham
  // South Carolina
  '29401': [32.7765, -79.9311], // Charleston
  // Connecticut
  '06103': [41.7658, -72.6734], // Hartford
}

/** Look up coordinates for a US zip code. Returns null if unknown. */
export function zipCoords(zip: string): [number, number] | null {
  const cleaned = zip.trim().slice(0, 5)
  return ZIP_COORDS[cleaned] ?? null
}

// ── Fee calculation ─────────────────────────────────────────────────────────
export interface DeliveryFeeResult {
  /** Distance in miles, or null if we can't calculate. */
  distanceMi: number | null
  /** Matched delivery tier. */
  tier: DeliveryTier
  /** Delivery fee in cents (0 for free or "contact lab"). */
  deliveryFeeCents: number
  /** 18% platform fee on delivery fee, in cents. */
  platformFeeCents: number
  /** Whether patient needs to contact the lab (30+ mi). */
  contactLab: boolean
  /** Human-readable distance string. */
  distanceLabel: string
}

/**
 * Select the delivery tier for a distance in miles.
 * Tiers are [minMi, maxMi); the last tier (30+ mi) is unbounded and means
 * "contact the lab" — it is returned for any distance at or above its minMi.
 */
export function deliveryTierForDistance(distanceMi: number): DeliveryTier {
  for (const t of DELIVERY_TIERS) {
    if (t.maxMi !== null ? (distanceMi >= t.minMi && distanceMi < t.maxMi) : distanceMi >= t.minMi) {
      return t
    }
  }
  return DELIVERY_TIERS[DELIVERY_TIERS.length - 1]! // "Contact lab" fallback
}

/**
 * Calculate delivery fee for a home collection booking.
 * @param patientZip - Patient's zip code
 * @param labZip - Lab's zip code (from lab profile address)
 */
export function calculateDeliveryFee(
  patientZip: string,
  labZip: string,
): DeliveryFeeResult {
  const pCoords = zipCoords(patientZip)
  const lCoords = zipCoords(labZip)

  // If we can't calculate distance, default to "Contact lab" for safety
  if (!pCoords || !lCoords) {
    const tier = DELIVERY_TIERS[DELIVERY_TIERS.length - 1]! // "Contact lab"
    return {
      distanceMi: null,
      tier,
      deliveryFeeCents: 0,
      platformFeeCents: 0,
      contactLab: true,
      distanceLabel: 'Distance unavailable — please contact the lab',
    }
  }

  const distanceMi = Math.round(haversineMiles(pCoords[0], pCoords[1], lCoords[0], lCoords[1]) * 10) / 10

  // Find matching tier
  const tier = deliveryTierForDistance(distanceMi)

  const deliveryFeeCents = tier.contactLab ? 0 : tier.feeCents
  const platformFeeCents = Math.round(deliveryFeeCents * (DELIVERY_PLATFORM_FEE_PCT / 100))

  const distanceLabel = tier.contactLab
    ? `${distanceMi} mi — outside delivery area`
    : distanceMi === 0
      ? 'Same area — free delivery'
      : `${distanceMi} mi`

  return {
    distanceMi,
    tier,
    deliveryFeeCents,
    platformFeeCents,
    contactLab: tier.contactLab,
    distanceLabel,
  }
}

/** Extract zip code from a full address string. Returns first 5-digit match. */
export function extractZip(address: string): string | null {
  const match = address.match(/\b(\d{5})\b/)
  return match?.[1] ?? null
}
