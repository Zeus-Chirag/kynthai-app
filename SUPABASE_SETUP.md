# Supabase Setup Guide for Kynthai

## Production project

- **Project ref:** `szqzeemimmafkopwqqfp`
- **Project URL:** https://szqzeemimmafkopwqqfp.supabase.co
- **Region:** us-east-1 (verify in Dashboard → Settings → General)
- **Supabase CLI link:** `supabase link --project-ref szqzeemimmafkopwqqfp`

The CLI project ref is also stored in `supabase/config.json` so `supabase` commands
can resolve the project automatically.

## Quick Start

1. Create / open your Supabase project at https://supabase.com
2. Get your API keys from Project Settings → API
3. Run the migration file in SQL Editor (see [Migration](#migration) below)

## Environment Variables

Copy `.env.example` to `.env.production` (gitignored) and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://szqzeemimmafkopwqqfp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx        # server-only — never expose to client
SUPABASE_JWT_SECRET=                            # Dashboard → Settings → API
SUPABASE_JWKS_URL=https://szqzeemimmafkopwqqfp.supabase.co/auth/v1/.well-known/jwks.json
```

> The anon / publishable key is safe to ship to the browser. The service_role
> / secret key bypasses RLS and MUST stay server-side.

## Migration

Run `supabase/migrations/20260101_initial_schema.sql` in Supabase SQL Editor
(https://supabase.com/dashboard/project/szqzeemimmafkopwqqfp/sql/new).

This creates:
- All tables with RLS enabled
- Storage buckets for medical documents
- Enum types for strict validation

Or, after linking the CLI:

```bash
supabase db push
```

## Storage Buckets

Create via Dashboard → Storage or via SQL:

| Bucket | Size Limit | Allowed Types |
|--------|------------|---------------|
| medical-documents | 5MB | pdf, jpeg, png, webp |
| prescriptions | 5MB | jpeg, png, webp, pdf |
| lab-results | 10MB | pdf, jpeg, png |

## Auth Providers (Recommended)

Enable in Dashboard → Auth → Providers:
- Email (with custom SMTP via SendGrid)
- Google (for easy signup)
- Magic Links (passwordless option)

## Connection strings

Two connection strings from Supabase Dashboard → Settings → Database:

| Use case | Where to find it |
|----------|-----------------|
| `DATABASE_URL` (Direct) | Settings → Database → Connection string → **Direct connection** |
| `DIRECT_URL` (Pooler)   | Settings → Database → Connection string → **Transaction pooler** (port 6543) |

Append `?sslmode=require` to both. URL-encode any special characters in the
password (e.g. `@` → `%40`).

## Testing Locally

```bash
# Install Supabase CLI
brew install supabase       # macOS
# or: npm install -g supabase

# Link your project
supabase login
supabase link --project-ref szqzeemimmafkopwqqfp

# Run local development (uses .env.local)
npm run dev
```

## Migration Sync

To sync Prisma schema with Supabase:

```bash
# Generate migration
npx prisma migrate dev --name sync-supabase

# Apply to Supabase (requires additional tooling)
```

The app uses **dual database** pattern:
- Supabase Auth for authentication
- Prisma (PostgreSQL) for core app data
- Supabase Storage for file uploads

