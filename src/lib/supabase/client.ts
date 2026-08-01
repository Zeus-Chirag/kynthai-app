import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/supabase/types';

// Accept both the legacy NEXT_PUBLIC_* names and Supabase's newer
// non-public naming (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY) so either
// env var convention works in server contexts.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
