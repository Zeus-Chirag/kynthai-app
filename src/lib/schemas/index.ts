// ── Schemas Barrel Export ──────────────────────────────────────────────────
// Import from this single entry-point in every route handler:
//   import { loginSchema, createMedicationSchema } from '@/lib/schemas'
//
// Both import styles work:
//   import { medicationsQuerySchema }          from '@/lib/schemas'   ← flat
//   import { medications as M }                from '@/lib/schemas';   M.medicationsQuerySchema ← namespaced

export * as auth        from './auth'
export * as medications  from './medications'
export * as appointments from './appointments'
export * as payments     from './payments'
export * as family       from './family'
export * as chat         from './chat'
export * as labs         from './labs'
export * as health       from './health'

// Flat re-exports so `import { X } from '@/lib/schemas'` works without namespace prefix.
export * from './auth'
export * from './medications'
export * from './appointments'
export * from './payments'
export * from './family'
export * from './chat'
export * from './labs'
export * from './health'
// Security-critical schemas (auth, admin, labs, consult-messages, AI, etc.)
export * from './security'
