# Supabase Setup Guide for Kyntha

## Quick Start

1. Create a Supabase project at https://supabase.com
2. Get your API keys from Project Settings → API
3. Run the migration file in SQL Editor

## Environment Variables

Add these to your `.env` or `.env.production`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

## Migration

Run `supabase/migrations/20260101_initial_schema.sql` in Supabase SQL Editor.

This creates:
- All tables with RLS enabled
- Storage buckets for medical documents
- Enum types for strict validation

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

## Testing Locally

```bash
# Install Supabase CLI
brew install supabase

# Link your project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Run local development
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
