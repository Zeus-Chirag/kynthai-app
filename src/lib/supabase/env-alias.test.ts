import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

// Mock the SDKs so no real client is constructed and we can assert on the
// (url, key, options) arguments the modules pass.
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ __mockClient: true })),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ __mockServerClient: true })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: () => {},
    setAll: () => {},
  })),
}));

const SUPABASE_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
] as const;

afterEach(() => {
  vi.unstubAllEnvs();
  // Deterministic clean state for the next test regardless of stubs/deletes.
  for (const key of SUPABASE_ENV_KEYS) delete process.env[key];
});

describe('client.ts env alias resolution (browser client)', () => {
  // client.ts resolves env at MODULE LOAD time, so each case re-imports the
  // module with a fresh registry after stubbing the env vars.

  it('prefers the legacy NEXT_PUBLIC_* names when both naming schemes are set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://legacy.example.supabase.co');
    vi.stubEnv('SUPABASE_URL', 'https://new.example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'legacy-anon-key');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'new-publishable-key');

    vi.resetModules();
    await import('./client');
    const { createClient } = await import('@supabase/supabase-js');

    expect(vi.mocked(createClient)).toHaveBeenCalledWith(
      'https://legacy.example.supabase.co',
      'legacy-anon-key',
      expect.objectContaining({
        auth: { persistSession: true, autoRefreshToken: true },
      })
    );
  });

  it('falls back to SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY when only the new names are set', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://new.example.supabase.co');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'new-publishable-key');

    vi.resetModules();
    await import('./client');
    const { createClient } = await import('@supabase/supabase-js');

    expect(vi.mocked(createClient)).toHaveBeenCalledWith(
      'https://new.example.supabase.co',
      'new-publishable-key',
      expect.anything()
    );
  });

  it('defaults to localhost URL and an empty key when nothing is configured', async () => {
    vi.resetModules();
    await import('./client');
    const { createClient } = await import('@supabase/supabase-js');

    expect(vi.mocked(createClient)).toHaveBeenCalledWith(
      'http://localhost:54321',
      '',
      expect.anything()
    );
  });
});

describe('server.ts env alias resolution (server client)', () => {
  let getSupabaseServer: (typeof import('./server'))['getSupabaseServer'];

  // server.ts reads env at CALL time, but re-importing per suite keeps the
  // mocked module instances consistent.
  beforeEach(async () => {
    vi.resetModules();
    getSupabaseServer = (await import('./server')).getSupabaseServer;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('prefers SUPABASE_SERVICE_ROLE_KEY over secret/anon/publishable aliases', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://url.example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role');
    vi.stubEnv('SUPABASE_SECRET_KEY', 'secret');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'publishable');

    await getSupabaseServer();
    const { createServerClient } = await import('@supabase/ssr');

    expect(vi.mocked(createServerClient)).toHaveBeenCalledWith(
      'https://url.example.supabase.co',
      'service-role',
      expect.objectContaining({ cookies: expect.any(Object) })
    );
  });

  it('uses SUPABASE_SECRET_KEY (new naming) when the service role key is absent', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://new.example.supabase.co');
    vi.stubEnv('SUPABASE_SECRET_KEY', 'secret-key');

    await getSupabaseServer();
    const { createServerClient } = await import('@supabase/ssr');

    expect(vi.mocked(createServerClient)).toHaveBeenCalledWith(
      'https://new.example.supabase.co',
      'secret-key',
      expect.anything()
    );
  });

  it('falls back through NEXT_PUBLIC_SUPABASE_ANON_KEY then SUPABASE_PUBLISHABLE_KEY', async () => {
    const { createServerClient } = await import('@supabase/ssr');

    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    await getSupabaseServer();
    expect(vi.mocked(createServerClient)).toHaveBeenCalledWith('', 'anon-key', expect.anything());

    vi.mocked(createServerClient).mockClear();
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
    await getSupabaseServer();
    expect(vi.mocked(createServerClient)).toHaveBeenCalledWith(
      '',
      'publishable-key',
      expect.anything()
    );
  });

  it('passes an empty URL and key when nothing is configured', async () => {
    await getSupabaseServer();
    const { createServerClient } = await import('@supabase/ssr');

    expect(vi.mocked(createServerClient)).toHaveBeenCalledWith('', '', expect.anything());
  });

  it('wires cookie get/set handlers into the server client config', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://cookies.example.supabase.co');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'cookie-key');

    await getSupabaseServer();
    const { createServerClient } = await import('@supabase/ssr');

    const [, , config] = vi.mocked(createServerClient).mock.calls[0]!;
    expect(config).toHaveProperty('cookies');
    expect(config.cookies.getAll).toBeTypeOf('function');
    expect(config.cookies.setAll).toBeTypeOf('function');
  });
});
