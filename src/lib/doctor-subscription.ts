/**
 * Doctor subscription tiers and feature gates.
 *
 * Tiers: free | pro | enterprise
 * Features: unlimited patients, priority placement, advanced analytics, lower commission
 */

export type DoctorTier = 'free' | 'pro' | 'enterprise'

export interface DoctorTierConfig {
  patientSlotCap: number // -1 = unlimited
  priorityPlacement: boolean
  advancedAnalytics: boolean
  commissionDiscountPct: number // additional discount on top of loyalty tier
  features: string[]
}

export const DOCTOR_TIERS: Record<DoctorTier, DoctorTierConfig> = {
  free: {
    patientSlotCap: 5,
    priorityPlacement: false,
    advancedAnalytics: false,
    commissionDiscountPct: 0,
    features: [
      '5 patient slots',
      'Basic dashboard',
      'Standard placement',
      'Video consultations',
      'Prescription management',
    ],
  },
  pro: {
    patientSlotCap: -1, // unlimited
    priorityPlacement: true,
    advancedAnalytics: true,
    commissionDiscountPct: 2, // additional 2% off
    features: [
      'Unlimited patient slots',
      'Priority placement in search',
      'Advanced analytics & insights',
      '2% lower commission',
      'Revenue dashboard',
      'Patient outcome tracking',
      'Prescription analytics',
      'Priority support',
    ],
  },
  enterprise: {
    patientSlotCap: -1,
    priorityPlacement: true,
    advancedAnalytics: true,
    commissionDiscountPct: 5, // additional 5% off
    features: [
      'Everything in Pro',
      '5% lower commission',
      'Dedicated account manager',
      'Custom branding',
      'API access',
      'White-label options',
    ],
  },
}

/** Get the tier config for a doctor's subscription tier. */
export function getDoctorTierConfig(tier: string): DoctorTierConfig {
  return DOCTOR_TIERS[tier as DoctorTier] ?? DOCTOR_TIERS.free
}

/** Check if a doctor can add more patients. */
export function canAddPatient(
  currentPatientCount: number,
  tier: string,
  manualCap?: number | null,
): { allowed: boolean; cap: number; remaining: number } {
  const config = getDoctorTierConfig(tier)
  const cap = manualCap ?? config.patientSlotCap
  
  // Unlimited
  if (cap === -1) {
    return { allowed: true, cap: -1, remaining: -1 }
  }
  
  const remaining = Math.max(0, cap - currentPatientCount)
  return { allowed: remaining > 0, cap, remaining }
}

/** Get the effective commission discount for a doctor (loyalty + subscription). */
export function getEffectiveCommissionDiscount(
  loyaltyDiscountPct: number,
  subscriptionTier: string,
): number {
  const tierConfig = getDoctorTierConfig(subscriptionTier)
  return loyaltyDiscountPct + tierConfig.commissionDiscountPct
}

/** Priority score for search ranking (higher = shown first). */
export function getPriorityScore(
  tier: string,
  rating: number,
  reviewCount: number,
  lastActiveAt: Date | null,
): number {
  const config = getDoctorTierConfig(tier)
  let score = 0
  
  // Base: rating × review weight
  score += rating * Math.min(reviewCount, 100)
  
  // Subscription boost
  if (config.priorityPlacement) {
    score += 500 // Pro doctors get +500 priority
  }
  
  // Recency boost: active in last 24h
  if (lastActiveAt) {
    const hoursSinceActive = (Date.now() - lastActiveAt.getTime()) / (1000 * 60 * 60)
    if (hoursSinceActive < 24) {
      score += 100
    } else if (hoursSinceActive < 72) {
      score += 50
    }
  }
  
  return score
}
