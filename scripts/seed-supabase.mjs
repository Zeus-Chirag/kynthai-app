import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(url, serviceKey);

const demos = [
  { email: 'patient@demo.kynthai.app', name: 'Demo Patient', role: 'patient' },
  { email: 'caretaker@demo.kynthai.app', name: 'Demo Family', role: 'caretaker' },
  { email: 'priya@demo.kynthai.app', name: 'Demo Doctor', role: 'doctor' },
  { email: 'pathlabs@demo.kynthai.app', name: 'Demo Lab', role: 'lab' },
  { email: 'admin@demo.kynthai.app', name: 'Demo Admin', role: 'admin' },
];

async function seed() {
  let created = 0;

  // Step 1: Ensure auth.users exist
  for (const d of demos) {
    const { data, error } = await sb.auth.admin.createUser({
      email: d.email,
      email_confirm: true,
      password: 'Demo@2024',
    });
    if (error && !error.message.includes('already registered')) {
      console.log(`❌ auth ${d.email} — ${error.message}`);
    } else {
      console.log(`✅ auth user: ${d.email}`);
    }
  }

  // Step 2: Fetch all auth users and create public.users profiles
  const { data: authUsers } = await sb.auth.admin.listUsers();
  const userIdMap = {};
  for (const u of authUsers?.users || []) {
    userIdMap[u.email] = u.id;
  }

  // Step 3: Upsert profiles
  const emailToRole = {};
  for (const d of demos) emailToRole[d.email] = d;

  for (const d of demos) {
    const userId = userIdMap[d.email];
    if (!userId) {
      console.log(`⚠️ ${d.email} — no auth user found, skipping profile`);
      continue;
    }

    const { error } = await sb.from('users').upsert({
      id: userId,
      email: d.email,
      name: d.name,
      role: d.role,
      verified: true,
      is_demo: true,
      data_processing_consent: true,
      terms_of_service_consent: true,
      ai_training_consent: true,
    }, { onConflict: 'email' });

    if (error) {
      console.log(`❌ profile ${d.email} — ${error.message}`);
    } else {
      console.log(`✅ profile: ${d.email}`);
      created++;
    }
  }

  console.log(`\nSeeded ${created} demo profiles into Supabase`);
}

seed().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
