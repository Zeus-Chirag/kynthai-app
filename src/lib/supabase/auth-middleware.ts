import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/supabase/types';
import { NextResponse } from 'next/server';

/**
 * Supabase Auth middleware — refreshes sessions on every request.
 * Place before any route handlers that need auth.
 */
export async function SupabaseAuthMiddleware() {
  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, { ...options, path: '/' });
          });
        },
      },
    }
  );

  await supabase.auth.getSession();

  return supabase;
}
