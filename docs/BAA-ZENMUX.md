# Business Associate Agreement (BAA) — NOT APPLICABLE

> **Kynthai is not a HIPAA-covered entity or business associate and does not
> claim HIPAA compliance.** As a consumer health-management platform, Kynthai
> is not required to sign Business Associate Agreements, and doing so would
> incorrectly imply covered-entity status. **Do not sign, circulate, or rely on
> a BAA with any vendor (including AI processors such as ZenMux).**

## What replaces the BAA checklist item

- Vendor contracts instead include **data-processing terms** (GDPR-style DPA or
  vendor's standard data-processing addendum) covering confidentiality,
  data-minimization, and deletion on request.
- AI providers receive **de-identified context only** — see
  `src/lib/ai/context-builder.ts` (`buildDeidentifiedContext()` strips names,
  exact dates, and free-text notes; age is bucketed).
- The FTC Health Breach Notification Rule and state consumer health privacy
  laws govern breach obligations (60-day notification where required), not
  HIPAA's 60-day BAA-driven rules.

## If the product ever becomes a covered entity

1. Execute vendor BAAs (Supabase, AI processor, email/SMS providers).
2. Re-enable the field-level encryption rollout described in
   `HIPAA-COMPLIANCE.md` (backfill `*_enc` columns → install middleware →
   `ENCRYPTION_TRANSITIONAL=false`).
3. Complete the full §164 gap analysis in `docs/INFRASTRUCTURE_SECURITY.md`.
