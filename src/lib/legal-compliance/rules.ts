/**
 * Legal Compliance Rules — US Healthcare
 *
 * Defines all active compliance rules monitored by the Master Legal Agent.
 * Rules are used by validator.ts to scan code, pages, and configuration
 * for compliance gaps.
 */

export type RuleSeverity = 'critical' | 'high' | 'medium' | 'low'

export interface ComplianceRule {
  id: string
  category: 'HIPAA' | 'STATE_PRIVACY' | 'FDA_SAMD' | 'PATIENT_RIGHTS' | 'LEGAL_DOCS' | 'SECURITY'
  title: string
  description: string
  severity: RuleSeverity
  automated: boolean
  check: string
  remediation?: string
}

export const COMPLIANCE_RULES: ComplianceRule[] = [
  // ── HIPAA ──────────────────────────────────────────────────────────
  {
    id: 'HIPAA-001',
    category: 'HIPAA',
    title: 'Privacy Officer email consistency',
    description: 'All HIPAA NPP, complaint, and grievance contacts must route to the designated Privacy Officer (privacy@kyntha.app).',
    severity: 'critical',
    automated: true,
    check: 'Grep for Privacy Officer / HIPAA complaint contacts; must match privacy@kyntha.app.',
    remediation: 'Update contact references in legal pages to privacy@kyntha.app.',
  },
  {
    id: 'HIPAA-002',
    category: 'HIPAA',
    title: 'NPP navigable route',
    description: 'HIPAA Notice of Privacy Practices must be available at a public route (/privacy-practices).',
    severity: 'critical',
    automated: true,
    check: 'Route /privacy-practices returns 200 and contains HIPAANPP content.',
    remediation: 'Create page component for /privacy-practices.',
  },
  {
    id: 'HIPAA-003',
    category: 'HIPAA',
    title: 'Patient rights route completeness',
    description: 'Patient Rights Statement must cover 8+ rights and be at /patient-rights.',
    severity: 'critical',
    automated: true,
    check: 'Route /patient-rights returns 200 and contains at least 8 enumerated rights.',
    remediation: 'Expand PATIENT-RIGHTS.md and /patient-rights page.',
  },
  {
    id: 'HIPAA-004',
    category: 'HIPAA',
    title: 'PHI field-level encryption',
    description: 'All PHI fields must have AES-256-GCM encrypted counterparts in Prisma.',
    severity: 'critical',
    automated: true,
    check: 'Schema audit: every PHI field in HIPAA-COMPLIANCE.md table has an _enc column.',
    remediation: 'Run prisma-encryption-middleware.ts and backfill encrypted columns.',
  },
  {
    id: 'HIPAA-005',
    category: 'HIPAA',
    title: 'Database SSL enforcement',
    description: 'DATABASE_URL must include sslmode=require (or stronger) in production.',
    severity: 'critical',
    automated: true,
    check: 'validateEnv() enforces sslmode=require when NODE_ENV=production.',
    remediation: 'Update DATABASE_URL to include sslmode=require.',
  },
  {
    id: 'HIPAA-006',
    category: 'HIPAA',
    title: 'Encryption key format',
    description: 'ENCRYPTION_KEY must be exactly 64 hex characters (256-bit AES).',
    severity: 'critical',
    automated: true,
    check: 'validateEnv() checks ENCRYPTION_KEY length === 64 in production.',
    remediation: 'Generate key: openssl rand -hex 32',
  },
  {
    id: 'HIPAA-007',
    category: 'HIPAA',
    title: 'Breach notification timeline',
    description: 'HIPAA breach notifications must occur within 60 days per HITECH 45 CFR §§ 164.400-414.',
    severity: 'high',
    automated: false,
    check: 'Incident response plan documents 60-day notification obligation.',
    remediation: 'Update incident response runbook to include 60-day OCR notification.',
  },

  // ── STATE PRIVACY LAWS ────────────────────────────────────────────
  {
    id: 'STATE-001',
    category: 'STATE_PRIVACY',
    title: 'California — CCPA/CPRA opt-out',
    description: 'CCPA requires a clear "Do Not Sell or Share My Personal Information" link.',
    severity: 'critical',
    automated: true,
    check: 'Footer contains link to /ccpa (or /ccpa-optout).',
    remediation: 'Add CCPA opt-out link to portal and landing footer.',
  },
  {
    id: 'STATE-002',
    category: 'STATE_PRIVACY',
    title: 'Virginia — VCDPA rights notice',
    description: 'VCDPA (Va. Code § 59.1-571 et seq.) grants consumers rights to access, correct, delete, and opt out.',
    severity: 'high',
    automated: false,
    check: 'Privacy Policy mentions VCDPA consumer rights.',
    remediation: 'Add VCDPA section to Privacy Policy body.',
  },
  {
    id: 'STATE-003',
    category: 'STATE_PRIVACY',
    title: 'Colorado — CPA rights notice',
    description: 'CPA (C.R.S. § 6-1-1301 et seq.) grants consumers rights to know, correct, delete, and opt out.',
    severity: 'high',
    automated: false,
    check: 'Privacy Policy mentions Colorado Privacy Act (CPA).',
    remediation: 'Add CPA section to Privacy Policy body.',
  },
  {
    id: 'STATE-004',
    category: 'STATE_PRIVACY',
    title: 'Utah — UCPA rights notice',
    description: 'UCPA (Utah Code § 13-61-101 et seq.) grants consumers rights to access, correct, delete, and opt out.',
    severity: 'high',
    automated: false,
    check: 'Privacy Policy mentions Utah Consumer Privacy Act (UCPA).',
    remediation: 'Add UCPA section to Privacy Policy body.',
  },
  {
    id: 'STATE-005',
    category: 'STATE_PRIVACY',
    title: 'Connecticut — CTDPA rights notice',
    description: 'CTDPA (C.G.S.A. § 42-515 et seq.) grants consumers rights to confirm, access, correct, delete, and opt out.',
    severity: 'high',
    automated: false,
    check: 'Privacy Policy mentions Connecticut Data Privacy Act (CTDPA).',
    remediation: 'Add CTDPA section to Privacy Policy body.',
  },
  {
    id: 'STATE-006',
    category: 'STATE_PRIVACY',
    title: 'Nondiscrimination for exercising privacy rights',
    description: 'CCPA/CPRA and most state laws prohibit retaliation or discrimination for exercising privacy rights.',
    severity: 'medium',
    automated: false,
    check: 'Privacy Policy or CCPA page contains nondiscrimination clause.',
    remediation: 'Add nondiscrimination statement to CCPA page or Privacy Policy.',
  },

  // ── FDA / SaMD ─────────────────────────────────────────────────────
  {
    id: 'FDA-001',
    category: 'FDA_SAMD',
    title: 'FDA SaMD status disclosure',
    description: 'Platform must clarify whether AI features are regulated as medical devices.',
    severity: 'high',
    automated: false,
    check: 'Medical disclaimer or Privacy Policy states Kyntha features are not FDA-cleared medical devices.',
    remediation: 'Add FDA/SaMD section to Privacy Policy and Medical Disclaimer.',
  },

  // ── PATIENT RIGHTS ─────────────────────────────────────────────────
  {
    id: 'PATR-001',
    category: 'PATIENT_RIGHTS',
    title: 'Nondiscrimination',
    description: 'Patients must not face discrimination based on protected characteristics.',
    severity: 'high',
    automated: false,
    check: 'Patient Rights Statement includes nondiscrimination clause.',
    remediation: 'Add nondiscrimination right to Patient Rights.',
  },
  {
    id: 'PATR-002',
    category: 'PATIENT_RIGHTS',
    title: 'Emergency care disclaimer (EMTALA)',
    description: 'Platform must disclaim emergency care responsibilities under EMTALA.',
    severity: 'medium',
    automated: false,
    check: 'Medical disclaimer states Kyntha is not an emergency medical service.',
    remediation: 'Add EMTALA disclaimer to Medical Disclaimer and Terms.',
  },
  {
    id: 'PATR-003',
    category: 'PATIENT_RIGHTS',
    title: 'COBRA / ACA clarification',
    description: 'Platform must clarify it is not a group health plan subject to COBRA or ACA essential benefits.',
    severity: 'medium',
    automated: false,
    check: 'Terms or Privacy Policy clarifies Kyntha is not a health insurer or group health plan.',
    remediation: 'Add COBRA/ACA non-applicability statement to Terms.',
  },

  // ── LEGAL DOCUMENTS ────────────────────────────────────────────────
  {
    id: 'DOC-001',
    category: 'LEGAL_DOCS',
    title: 'No placeholder addresses',
    description: 'No "100 Disorderly Dr" or other placeholder addresses in user-facing files.',
    severity: 'critical',
    automated: true,
    check: 'Grep for placeholder addresses; must be empty.',
    remediation: 'Replace placeholder addresses with registered office.',
  },
  {
    id: 'DOC-002',
    category: 'LEGAL_DOCS',
    title: 'Current-dated legal documents',
    description: 'All legal docs must have current or past effective dates.',
    severity: 'high',
    automated: true,
    check: 'Scan legal documents for future dates relative to build date.',
    remediation: 'Update effective dates to current or past.',
  },
  {
    id: 'DOC-003',
    category: 'LEGAL_DOCS',
    title: 'Cookie consent banner present',
    description: 'Cookie consent banner must be present on first visit for CCPA/GDPR alignment.',
    severity: 'high',
    automated: true,
    check: 'CookieConsent component is imported and rendered in app shell.',
    remediation: 'Ensure CookieConsent is rendered in root layout.',
  },
  {
    id: 'DOC-004',
    category: 'LEGAL_DOCS',
    title: 'Medical disclaimer visible on AI features',
    description: 'Medical disclaimer must appear before first AI interaction.',
    severity: 'high',
    automated: false,
    check: 'AI chat and feature pages include MedicalDisclaimer component.',
    remediation: 'Add MedicalDisclaimer to all AI feature pages.',
  },

  // ── SECURITY ───────────────────────────────────────────────────────
  {
    id: 'SEC-001',
    category: 'SECURITY',
    title: 'API URL default not localhost',
    description: 'NEXT_PUBLIC_API_URL must default to a real domain, not localhost, to prevent origin leakage.',
    severity: 'critical',
    automated: true,
    check: 'src/lib/env.ts NEXT_PUBLIC_API_URL default is not localhost.',
    remediation: 'Update default to production domain.',
  },
  {
    id: 'SEC-002',
    category: 'SECURITY',
    title: 'Account deletion UI path',
    description: 'Account deletion must be accessible via primary UI, not hidden behind a prompt.',
    severity: 'high',
    automated: false,
    check: 'Profile settings include visible Delete Account button or modal.',
    remediation: 'Replace window.prompt with modal confirmation.',
  },
]

export const RULES_BY_CATEGORY = {
  HIPAA: COMPLIANCE_RULES.filter((r) => r.category === 'HIPAA'),
  STATE_PRIVACY: COMPLIANCE_RULES.filter((r) => r.category === 'STATE_PRIVACY'),
  FDA_SAMD: COMPLIANCE_RULES.filter((r) => r.category === 'FDA_SAMD'),
  PATIENT_RIGHTS: COMPLIANCE_RULES.filter((r) => r.category === 'PATIENT_RIGHTS'),
  LEGAL_DOCS: COMPLIANCE_RULES.filter((r) => r.category === 'LEGAL_DOCS'),
  SECURITY: COMPLIANCE_RULES.filter((r) => r.category === 'SECURITY'),
}
