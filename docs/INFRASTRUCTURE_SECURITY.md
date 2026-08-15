# Infrastructure Security — Kynthai US

**Owner:** Platform Engineering
**Last Updated:** 2026-07-30
**Review Cadence:** Quarterly

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   WAF/CSP   │  │  Rate Limit  │  │  DDoS Protection │  │
│  │ (Vercel FW) │  │  (Upstash)   │  │  (Vercel Edge)  │  │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │
│         └─────────────────┼──────────────────┘           │
└───────────────────────────┼───────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    │   Vercel App  │
                    │  (Next.js)    │
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
  ┌─────┴─────┐     ┌──────┴──────┐     ┌──────┴──────┐
  │  Supabase  │     │   Upstash   │     │    Stripe   │
  │ (Postgres) │     │   (Redis)   │     │  (Payments) │
  │  TLS 1.3   │     │   TLS 1.3   │     │   TLS 1.3   │
  └───────────┘     └─────────────┘     └─────────────┘
```

---

## 1. Edge Security (Vercel)

Vercel's edge network provides the first line of defense:

| Control | Status | Detail |
|---------|--------|--------|
| **DDoS Protection** | ✅ Enabled (Vercel Edge) | Automatic L3/L4 mitigation, rate-based L7 |
| **WAF** | ✅ Enabled (Vercel) | OWASP Core Rule Set, custom rules |
| **TLS Termination** | ✅ TLS 1.3 | Automatic cert management via Vercel |
| **HSTS** | ✅ `max-age=63072000; includeSubDomains; preload` | Enforced in `next.config.mjs` |
| **CSP Headers** | ✅ | Set via `src/middleware.ts` |
| **CORS** | ✅ Restricted to `https://kynthai.app` | Configured in env + middleware |

### Vercel WAF Rules (current)

```
# Block requests without valid Host header
Host: kynthai.app OR Host: www.kynthai.app

# Block requests with suspicious User-Agent
User-Agent NOT IN [known crawlers] → challenge

# Rate limit per IP per route
/api/auth/* → 10 req/min
/api/chat/* → 20 req/min
/api/* → 100 req/min

# Block SQL injection patterns
Body/Query contains ' OR 1=1 OR DROP OR UNION SELECT → block
```

---

## 2. Application Security

| Control | Location | Status |
|---------|----------|--------|
| **CSRF Protection** | `src/lib/csrf.ts` | ✅ Double-submit cookie pattern |
| **Rate Limiting** | `src/middleware.ts` | ✅ Per-endpoint via Upstash |
| **Session Signing** | `src/lib/session-signing.ts` | ✅ HMAC-signed sessions |
| **PHI Encryption** | `src/lib/prisma-encryption-middleware.ts` | 🔄 Schema prepared (`*_enc` columns + middleware); not yet enabled — requires backfill migration before activation (see note below) |
| **Audit Logging** | `src/lib/audit-logger.ts` | ✅ All user actions logged |
| **Input Validation** | Zod schemas (`src/lib/schemas/`) | ✅ All API route inputs validated |
| **Auth Middleware** | `src/middleware.ts` | ✅ Route protection + redirect |
| **Error Handling** | `src/lib/error-handler.ts` | ✅ Structured error responses, no stack leaks |

---

## 3. Database Security (Supabase PostgreSQL)

| Control | Status | Detail |
|---------|--------|--------|
| **TLS** | ✅ Required | `sslmode=require` in connection string |
| **Network isolation** | ✅ VPC | Supabase Pro: dedicated IPv4, no public internet exposure |
| **Connection pooling** | ✅ PgBouncer | Via Supabase pooler (port 6543) |
| **Encryption at rest** | ✅ AES-256 | Disk-level (managed by Supabase) + AES-256-GCM for uploaded documents and prescription images; field-level encryption prepared but not yet enabled |
| **Backups** | ✅ PITR | 7-day retention, daily snapshots |
| **Row Level Security** | 🔄 Migration | Schema supports RLS, migrating policies |

### Connection Security

```env
# Runtime (pooled, PgBouncer compatible)
DATABASE_URL=postgresql://user:pass@host:6543/postgres?pgbouncer=true&sslmode=require

# Migrations (direct connection, bypasses pooler)
DIRECT_URL=postgresql://user:pass@host:5432/postgres?sslmode=require
```

---

## 4. Third-Party Service Security

| Service | Auth Method | Data Sensitivity | Notes |
|---------|------------|-----------------|-------|
| **Supabase** | API key + JWT | Health data | Database host; data-processing terms, no BAA (not a covered entity) |
| **Stripe** | Secret key (sk_live_) | Payment data | PCI DSS Level 1, Stripe handles scope |
| **NVIDIA / ZenMux (AI)** | API key | De-identified health context | No PHI sent; `buildDeidentifiedContext()` minimizes to de-identified context |
| **Twilio** | Account SID + Auth Token | Phone numbers | SMS delivery only |
| **Sentry** | DSN | Error context (no PII) | PII filtering configured |
| **Upstash** | REST Token | Rate limit counters | Ephemeral data only |
| **Resend** | API Key | Email addresses | Transactional email only |

### API Key Rotation Policy

- **Cryptographic keys** (SESSION_SECRET, ENCRYPTION_KEY): Rotate quarterly
- **Service API keys** (Stripe, OpenAI, etc.): Rotate on engineer departure or suspected leak
- **Rotation script**: `scripts/rotate-encryption-key.ts` (for ENCRYPTION_KEY)

---

## 5. Network Security (Self-Hosted Stack)

For the Docker-based deployment (Caddy + PostgreSQL):

| Control | Status | Detail |
|---------|--------|--------|
| **Firewall** | ✅ UFW | Ports 22 (SSH), 80/443 (Caddy), 5432 (PostgreSQL) limited to app IP |
| **SSH** | ✅ Key-based only | Password auth disabled, ed25519 keys |
| **Docker** | ✅ Non-root | Container runs as non-root user |
| **Caddy** | ✅ TLS 1.3 | Automatic Let's Encrypt |
| **Fail2Ban** | ✅ | 5 failed SSH attempts → 30min ban |

---

## 6. Secrets Management

| Secret | Storage | Access Control |
|--------|---------|---------------|
| `ENCRYPTION_KEY` | Vercel Env Var (encrypted) | Deploy only |
| `SESSION_SECRET` | Vercel Env Var (encrypted) | Deploy only |
| `DATABASE_URL` | Vercel Env Var (encrypted) | Deploy only |
| Service API keys | Vercel Env Var (encrypted) | Deploy only |
| `.env.local` | Local development | `.gitignore`d — never committed |

**⚠️ WARNING:** The file `generate_production_secrets.js` creates a `.env.production` template with **clearly marked placeholder values** (prefixed `placeholder_`). Never use this file's values as real credentials.

---

## 7. Incident Response Security

See [Incident Response Playbook](./INCIDENT_RESPONSE.md) for:

- Security incident classification (P0-P4)
- Data breach notification procedure
- Evidence preservation
- Postmortem template
- Escalation contacts

### Security Incident Contact

- **Security Lead:** security@kynthai.app
- **Privacy Officer:** privacy@kynthai.app
- **Emergency:** +1 (555) 000-0000 (SMS-only for production outages)

---

## 8. Compliance Mapping

> Note: Kynthai is not a HIPAA-covered entity or business associate. The HIPAA
> rows below map our security controls to HIPAA's technical safeguards for
> internal gap analysis only; they are not a claim of HIPAA compliance.

| Requirement | Control | Status |
|-------------|---------|--------|
| HIPAA §164.312(a)(1) | Access control (auth) | ✅ |
| HIPAA §164.312(c)(1) | Encryption at rest | 🔄 Disk-level + uploads encrypted; field-level prepared, pending migration |
| HIPAA §164.312(e)(1) | Encryption in transit | ✅ TLS 1.3 |
| HIPAA §164.312(b) | Audit controls | ✅ Audit logging |
| HIPAA §164.308(a)(1) | Security management | ✅ Incident response |
| CCPA | Data deletion | ✅ Account deletion API |
| GDPR Art. 17 | Right to erasure | ✅ Data export + delete |

---

## Related Documents

- [Incident Response Playbook](./INCIDENT_RESPONSE.md)
- [Backup & Restore Runbook](./BACKUP_RESTORE_RUNBOOK.md)
- [SLOs & Error Budgets](./SLOS.md)
- [Production Readiness Report](./PRODUCTION-READINESS-REPORT.md)
- [HIPAA Compliance](./HIPAA-COMPLIANCE.md)
