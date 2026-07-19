/**
 * kyntha-init-db.mjs
 *
 * Creates all Supabase tables, enums, RLS policies, and triggers for Kyntha.
 *
 * Usage:
 *   node kyntha-init-db.mjs
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 */

import { readFileSync } from 'fs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  || 'https://szqzeemimmafkopwqqfp.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not set')
  process.exit(1)
}

// Read schema
const schema = readFileSync('/Users/c.k/Downloads/kyntha-restored-7000-us/supabase-schema.sql', 'utf8')

// Split on semicolons (keeping statements together)
const rawChunks = schema.split(';')
const statements = []

for (const chunk of rawChunks) {
  const cleaned = chunk
    .replace(/--[^\n]*/g, '')       // strip single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // strip block comments
    .trim()

  if (cleaned.length < 5) continue

  // Skip DO blocks for now (we'll handle them separately)
  if (cleaned.startsWith('DO $$')) {
    // Wrap the whole DO block as one statement
    statements.push(cleaned)
    continue
  }

  statements.push(cleaned)
}

console.log(`Schema loaded: ${statements.length} statements from supabase-schema.sql`)

// Try Management API first, fall back to PostgREST exec_sql RPC
async function tryManagementAPI(sql) {
  const res = await fetch(
    'https://api.supabase.com/v1/projects/szqzeemimmafkopwqqfp/database/query',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  )

  if (res.ok) return true

  const errText = await res.text()
  // 404 = no Management API access, 401 = bad token
  if (res.status === 404 || res.status === 401) return false

  // Other errors might indicate SQL issues, not auth
  console.error(`  Management API error ${res.status}:`, errText.slice(0, 200))
  return false
}

async function tryPostgRESTExec(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ query: sql }),
  })

  if (res.ok || res.status === 204) return true

  const errText = await res.text()
  const isAlreadyExists = errText.includes('already exists') ||
                          errText.includes('duplicate')

  if (!isAlreadyExists) {
    console.error(`  PostgREST error ${res.status}:`, errText.slice(0, 200))
  }

  return isAlreadyExists ? true : false
}

async function execSQL(sql) {
  // Try Management API first (more reliable for DDL)
  const mgmtOk = await tryManagementAPI(sql)
  if (mgmtOk !== false) return mgmtOk

  // Fall back to PostgREST exec_sql
  return await tryPostgRESTExec(sql)
}

async function main() {
  console.log('\n=== Kyntha DB Initialization ===\n')

  let applied = 0, skipped = 0, errors = 0

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    const preview = stmt.slice(0, 60).replace(/\n/g, ' ')
    process.stdout.write(`  [${i + 1}/${statements.length}] ${preview}... `)

    const ok = await execSQL(stmt)
    if (ok) {
      console.log('OK')
      applied++
    } else {
      console.log('SKIP')
      skipped++
    }
  }

  console.log(`\nDone: ${applied} applied, ${skipped} skipped, ${errors} errors`)

  // Verify by checking table existence
  console.log('\n=== Verification ===')
  const verifyRes = await fetch(`${SUPABASE_URL}/rest/v1/users?select=count`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  })

  if (verifyRes.status === 200) {
    console.log('  ✓ users table exists and is accessible')
  } else {
    const errText = await verifyRes.text()
    console.log('  ✗ Verification failed:', verifyRes.status, errText.slice(0, 150))
    if (errText.includes('schema cache')) {
      console.log('\n  ⚠ Tables were created but may need a moment to propagate.')
      console.log('  Wait 30 seconds and run this script again to verify.')
    }
  }

  // Now insert seed data
  console.log('\n=== Seeding Users ===')
  await seedData()

  console.log('\n=== Initialization Complete ===\n')
}

async function seedData() {
  // Use Supabase Admin API to create users
  const adminUrl = `${SUPABASE_URL}/auth/v1/admin/users`

  const demoAccounts = [
    { email: 'patient@demo.kyntha.app', password: 'Demo@2024', name: 'Jane Cooper', role: 'patient' },
    { email: 'caretaker@demo.kyntha.app', password: 'Demo@2024', name: 'Priya Patel', role: 'caretaker' },
    { email: 'priya@demo.kyntha.app', password: 'Demo@2024', name: 'Dr. Priya Sharma', role: 'doctor' },
    { email: 'pathlabs@demo.kyntha.app', password: 'Demo@2024', name: 'PathLabs Diagnostic', role: 'lab' },
    { email: 'admin@demo.kyntha.app', password: 'Demo@2024', name: 'Admin User', role: 'admin' },
  ]

  const createdUsers = []

  for (const account of demoAccounts) {
    const res = await fetch(adminUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: { name: account.name },
      }),
    })

    if (res.ok) {
      const data = await res.json()
      createdUsers.push({ ...account, id: data.id })
      console.log(`  ✓ ${account.email} → ${data.id.slice(0, 8)}...`)
    } else {
      const errText = await res.text()
      if (errText.includes('already registered')) {
        console.log(`  ~ ${account.email} already exists (will be found on login)`)
        // Try to find existing user
        const findRes = await fetch(`${adminUrl}?email=eq.${encodeURIComponent(account.email)}`, {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        })
        if (findRes.ok) {
          const found = await findRes.json()
          if (found.length > 0) {
            createdUsers.push({ ...account, id: found[0].id })
          }
        }
      } else {
        console.log(`  ✗ ${account.email}: ${res.status} ${errText.slice(0, 100)}`)
      }
    }
  }

  // Now insert public.users records and profiles
  console.log('\n  Inserting public.users records...')
  for (const u of createdUsers) {
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        subscription_tier: 'plus',
        email_verified: true,
        consent_accepted: true,
        data_processing_consent: true,
        terms_of_service_consent: true,
        hipaa_consent: true,
        ai_training_consent: false,
        onboarding_complete: true,
        language: 'en',
        alarm_enabled: true,
        alarm_mode: 'professional',
      }),
    })

    if (insertRes.ok) {
      console.log(`  ✓ public.users for ${u.email}`)
    } else {
      const errText = await insertRes.text()
      // Duplicate key on retry is fine
      if (errText.includes('duplicate') || errText.includes('already exists')) {
        console.log(`  ~ public.users for ${u.email} already exists`)
      } else {
        console.log(`  ✗ Failed for ${u.email}: ${insertRes.status} ${errText.slice(0, 100)}`)
      }
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
