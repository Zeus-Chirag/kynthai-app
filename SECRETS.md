# Secrets Management — Kyntha

## Current Status

| Item | Status |
|------|--------|
| `.env` in git history | **No** — not tracked, not committed |
| `.env.local` in git history | **No** — not tracked, not committed |
| `.env.production` in git history | **No** — not tracked, not committed |
| Secrets rotated | **Pending** — see checklist below |
| Git history scrubbed | **Not needed** — no secrets were ever committed |

## Generate New Secrets

```bash
# Session encryption (64 hex chars)
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# NextAuth (64 hex chars)
node -e "console.log('NEXTAUTH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# AES-256 encryption key (32 hex chars)
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# Cron / system tokens (any random string)
node -e "console.log('CRON_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('VIDEO_TOKEN_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

## Secrets Inventory

Rotate all of these before production deployment:

| Secret | Used For | Command |
|--------|----------|---------|
| SESSION_SECRET | Cookie/session signing | `randomBytes(64)` hex |
| NEXTAUTH_SECRET | NextAuth JWT signing | `randomBytes(64)` hex |
| ENCRYPTION_KEY | AES-256-GCM PHI encryption | `randomBytes(32)` hex |
| CRON_SECRET | Cron endpoint auth | `randomBytes(32)` hex |
| VIDEO_TOKEN_SECRET | Video call JWT auth | `randomBytes(32)` hex |
| STRIPE_SECRET_KEY | Stripe API (get from dashboard) | Stripe Dashboard |
| STRIPE_WEBHOOK_SECRET | Stripe webhook verification | Stripe Dashboard |
| ZENMUX_API_KEY | AI chat provider | ZenMux dashboard |
| OPENAI_API_KEY | OpenAI AI fallback | OpenAI dashboard |
| ANTHROPIC_API_KEY | Anthropic AI fallback | Anthropic console |
| DATABASE_URL | PostgreSQL connection | Your DB provider |
| RESEND_API_KEY | Email delivery | Resend dashboard |
| SENDGRID_API_KEY | Email delivery fallback | SendGrid dashboard |
| UPSTASH_REDIS_REST_URL | Redis cache | Upstash dashboard |
| UPSTASH_REDIS_REST_TOKEN | Redis auth | Upstash dashboard |
| SENTRY_DSN | Error tracking | Sentry dashboard |

## Environment Files

| File | Purpose | Git? |
|------|---------|------|
| `.env` | Development secrets | No (gitignored) |
| `.env.local` | Local overrides (Supabase keys) | No (gitignored) |
| `.env.production` | Production template (empty values) | No (gitignored) |
| `.env.example` | Safe template for developers | **Yes** (committed) |

## Pre-Production Checklist

- [ ] Generate all new secrets using the commands above
- [ ] Paste into `.env.production` (never `.env` or `.env.local` in production)
- [ ] Set environment variables in your hosting platform (Vercel, Railway, etc.)
- [ ] Verify `.env.production` has no placeholder values before deploying
- [ ] Confirm `git ls-files .env*` shows NO tracked env files
- [ ] Run `npm audit` to check for vulnerable outdated packages

## Security Rules

1. **Never** commit `.env`, `.env.local`, `.env.production` to git
2. **Never** share secrets via Slack, email, or screenshots
3. **Rotate** all secrets immediately if any is suspected leaked
4. **Use different secrets** for dev, staging, and production
5. **Store production secrets** in your hosting platform's env vars (Vercel, etc.), not in files
