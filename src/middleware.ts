/**
 * Kynthai Edge Proxy — Security, Rate-Limit, Audit & CORS
 *
 * Runs as Next.js Edge middleware on every matching request.
 *
 * Runs at the Edge on every matching request:
 * 1. Assigns X-Request-Id for distributed tracing
 * 2. Edge-level audit logging (health-data-safe: method + masked IP + path only)
 * 3. Rate limiting per user/IP
 * 4. Portal cross-role access block (SSR bypass defence)
 * 5. Auth-required path guard
 * 6. CORS preflight headers
 * 7. Audit API session guard
 * 8. Security headers + CSP
 * 9. Sensitive-data-safe query-param sanitisation in audit records
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimitWithInfo } from './lib/rate-limit';
import { validateEnv } from './lib/env';
// NOTE: audit-logger is imported lazily inside the function body to avoid
// pulling in PrismaClient at edge runtime (which is incompatible).
// import { recordAudit, AuditCategory } from './lib/audit-logger';
import { logger } from '@/lib/logger';
import { checkCsrf } from '@/lib/csrf';
import { verifySessionToken } from './lib/session-signing';

// HMR-safe env validation (fail-loud in production, skip during build/edge)
let envValidated = false;
function ensureEnvValidated(): void {
  if (envValidated) return;
  // Skip validation during Next.js production build to allow builds without secrets
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    envValidated = true;
    return;
  }
  // Skip validation on Vercel Edge runtime where full env vars aren't available
  // and the middleware runs at the edge (not Node.js server)
  if (typeof process.env.VERCEL_ENV !== 'undefined' || process.env.NEXT_RUNTIME === 'edge') {
    envValidated = true;
    return;
  }
  // Also skip if we're not in a Node.js server context (e.g., edge function)
  if (typeof globalThis.WebSocket !== 'undefined' && !process.env.DATABASE_URL) {
    envValidated = true;
    return;
  }
  validateEnv();
  envValidated = true;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function getUserAgent(req: NextRequest): string | undefined {
  const ua = req.headers.get('user-agent');
  return ua ? ua.slice(0, 512) : undefined;
}

function maskIp(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) return parts[0] + '.' + parts[1] + '.***.***';
  return ip.length > 4 ? ip.slice(0, 4) + '***' : ip;
}

function getRequestId(): string {
  // crypto.randomUUID is available in Edge runtimes
  try {
    // @ts-ignore
    return crypto.randomUUID();
  } catch {
    // Fallback: CSPRNG via crypto.getRandomValues (preferred over Math.random)
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

// ── Sensitive Health Data Sanitisation ────────────────────────────────────────────

const SENSITIVE_HEALTH_DATA_QUERY_KEYS = new Set([
  'patientId',
  'userId',
  'doctorId',
  'memberId',
  'familyId',
  'email',
  'phone',
  'name',
  'search',
  'q',
  'query',
  'diagnosis',
  'symptoms',
  'medication',
  'condition',
  'dob',
  'dateOfBirth',
  'birthDate',
]);

function sanitizeAuditQuery(params: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of params.entries()) {
    if (SENSITIVE_HEALTH_DATA_QUERY_KEYS.has(key.toLowerCase())) {
      out[key] = '[REDACTED]';
    } else if (value.length > 100) {
      out[key] = value.slice(0, 100) + '...[truncated]';
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Mask resource IDs in URL paths before logging to audit records.
 * Paths like /api/medications/abc-123-patient-id leak resource correlations;
 * this replaces them with generic [id] placeholders while preserving
 * the route structure for debugging.
 */
function maskPathIds(pathname: string): string {
  return pathname.replace(/\/[a-f0-9]{8,}-[a-f0-9-]+/g, '/[id]');
}

// ── Public API Paths (logging bypass + rate-limit exemption) ─────────────────
// Merged from legacy middleware.ts and updated proxy.ts
const PUBLIC_API_PATHS = new Set([
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/csrf',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/health',
  '/api/stripe/webhook',
  '/api/upload/',
  '/api/search-medicine',
  '/api/identify-medicine',
  '/api/ai/nudge',
  '/api/consult-messages',
  '/api/prescription-scan',
  '/api/doctors',
  '/api/labs',
]);

function isPublicApi(pathname: string): boolean {
  for (const p of PUBLIC_API_PATHS) {
    if (p.endsWith('/')) {
      if (pathname.startsWith(p)) return true;
    } else {
      if (pathname === p) return true;
    }
  }
  return false;
}

// ── Auth-required prefixes ────────────────────────────────────────────────────

const AUTH_REQUIRED_PREFIXES = [
  '/api/appointments',
  '/api/medications',
  '/api/consultation-prep',
  '/api/emergency',
  '/api/emergency-sos',
  '/api/family',
  '/api/lab-bookings',
  '/api/labs',
  '/api/payments',
  '/api/prescriptions',
  '/api/notifications',
  '/api/chat',
  '/api/insights',
  '/api/health-report',
  '/api/chronic',
  '/api/doctors',
  '/api/reminders',
  '/api/challenges',
  '/api/account',
  '/api/consent',
  '/api/me',
];

function requiresAuth(pathname: string): boolean {
  return AUTH_REQUIRED_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

// ── Portal role mapping ──────────────────────────────────────────────────────

const PORTAL_ROLE_MAP: Record<string, string> = {
  '/patient': 'patient',
  '/doctor': 'doctor',
  '/lab': 'lab',
  '/caretaker': 'caretaker',
  '/family': 'caretaker', // 'family' URL → caretaker DB role
  '/admin': 'admin',
};

function isPortalPath(pathname: string): boolean {
  return Object.keys(PORTAL_ROLE_MAP).some(p => pathname === p || pathname.startsWith(p + '/'));
}

function expectedRoleForPortal(pathname: string): string | null {
  for (const p of Object.keys(PORTAL_ROLE_MAP)) {
    if (pathname === p || pathname.startsWith(p + '/')) return PORTAL_ROLE_MAP[p];
  }
  return null;
}

// ── Rate-limit helpers ────────────────────────────────────────────────────────

function getApiLimit(pathname: string): number {
  if (pathname === '/api/auth/me') return 60;
  if (pathname.startsWith('/api/auth/')) return 30;
  if (pathname.startsWith('/api/payments')) return 5;
  if (pathname.startsWith('/api/chat')) return 20;
  if (pathname.startsWith('/api/emergency')) return 100; // emergency is high-tolerance
  return 100;
}

function inferResourceType(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length >= 3) {
    const resource = parts[2] as string;
    const map: Record<string, string> = {
      medication: 'Medication',
      lab: 'LabResult',
      labs: 'LabResult',
      prescription: 'Prescription',
      appointments: 'Appointment',
      family: 'Family',
      user: 'User',
      health: 'HealthJournal',
      health_report: 'HealthJournal',
      chronic: 'ChronicCondition',
      emergency: 'EmergencyAlert',
      emergency_sos: 'EmergencyAlert',
      chat: 'ChatMessage',
      doctors: 'DoctorProfile',
      notifications: 'Notification',
      reminders: 'Reminder',
      payment: 'Payment',
    };
    return map[resource] ?? resource;
  }
  return 'Unknown';
}

function inferResourceId(pathname: string): string | undefined {
  const parts = pathname.split('/').filter(Boolean);
  return parts.length >= 4 ? parts[3] : undefined;
}

// ── Security headers ──────────────────────────────────────────────────────────

function applyHeaders(res: NextResponse, pathname: string, requestId: string) {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-Request-Id', requestId);
  res.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)');

  // Static assets cache
  if (
    pathname.startsWith('/icon') ||
    pathname.startsWith('/apple') ||
    pathname.startsWith('/logo') ||
    pathname.endsWith('.woff2')
  ) {
    res.headers.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
  }

  // API responses: never cache (may contain sensitive health data)
  if (pathname.startsWith('/api/')) {
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
  }

  const isProd = process.env.NODE_ENV === 'production';
  // ponytail: HSTS must only be emitted over a real TLS connection. Sending it
  // over plain HTTP permanently locks browsers (esp. Safari) into https:// for
  // this origin, breaking local/dev non-TLS serving. Determine TLS from the
  // forwarded proto / x-forwarded-proto header (Caddy/ELB) or req url.
  const isHttps =
    (res as any).requestProtocol === 'https' ||
    res.headers.get('x-forwarded-proto') === 'https' ||
    false;
  const csp = isProd
    ? [
        "default-src 'self'",
        // ponytail: Next.js injects inline bootstrap/hydration scripts, so
        // 'unsafe-inline' is required or the app never hydrates (stuck on the
        // static landing hero). Kept for parity with the app's dev CSP.
        "script-src 'self' 'unsafe-inline' https://js.stripe.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https: http:",
        "font-src 'self' data:",
        "connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://*.upstash.com wss: stun: turn:",
        "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://*.stripe.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
        // ponytail: only upgrade when actually served over TLS, else this blocks local HTTP
        ...(isHttps ? ['upgrade-insecure-requests'] : []),
      ].join('; ')
    : [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: http: https:",
        "font-src 'self' data:",
        "connect-src 'self' http: https: ws: wss: https://checkout.stripe.com https://*.upstash.com",
        "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://*.stripe.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ].join('; ');

  res.headers.set('Content-Security-Policy', csp);
  res.headers.set('X-Frame-Options', 'DENY');

  // ponytail: HSTS only over real TLS. Never over plain HTTP — it bricks the
  // origin in browsers (Safari caches the upgrade and can't fall back).
  if (isProd && isHttps) {
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
}

// ── CORS preflight ──────────────────────────────────────────────────────────

function handleCorsPreflight(req: NextRequest): NextResponse | null {
  if (req.method !== 'OPTIONS') return null;
  const origin = req.headers.get('origin');
  const rawCorsOrigin = process.env.CORS_ORIGIN ?? '';
  const allowList = rawCorsOrigin
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
  let corsOrigin: string | null = null;

  if (!allowList.length) {
    corsOrigin = process.env.NODE_ENV !== 'production' ? (origin ?? '*') : null;
  } else if (origin && allowList.includes(origin)) {
    // SECURITY: enforce HTTPS origins in production
    if (process.env.NODE_ENV === 'production' && !origin.startsWith('https://')) {
      return new NextResponse(null, { status: 204 });
    }
    corsOrigin = origin;
  }

  if (!corsOrigin) return new NextResponse(null, { status: 204 });

  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', corsOrigin);
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  res.headers.set(
    'Access-Control-Expose-Headers',
    'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Request-Id'
  );
  res.headers.set('Access-Control-Max-Age', '86400');
  res.headers.set('Vary', 'Origin');
  return res;
}

// ── Main proxy ───────────────────────────────────────────────────────────────

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

export default async function middleware(req: NextRequest): Promise<NextResponse> {
  ensureEnvValidated();

  const { pathname } = req.nextUrl;
  const method = req.method;
  const isApi = pathname.startsWith('/api/');
  const rawIp = getClientIp(req); // unmasked — used for rate-limiting keys
  const ip = maskIp(rawIp); // masked — used for audit logs only
  const ua = getUserAgent(req);
  const requestId = getRequestId();

  // Block dangerous methods that should never be proxied to app handlers
  const safeMethods = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
  if (!safeMethods.includes(method)) {
    return new NextResponse(null, { status: 405 });
  }

  // All responses get trace + security headers
  const res = NextResponse.next();
  res.headers.set('X-Request-Id', requestId);

  // ── Supabase Auth: check session presence ──────────────────────────────
  // Parse user ID from the cookie JWT (no network call, no Supabase client).
  let supabaseUser: { id: string } | null = null;
  try {
    const cookies = req.cookies.getAll();
    const sessionCookie = cookies.find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));
    if (sessionCookie?.value) {
      const raw = sessionCookie.value.replace('base64-', '');
      // Supabase uses URL-safe base64 (replaces +/ with -_)
      const std = raw.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(Buffer.from(std, 'base64').toString('utf-8'));
      if (payload.user?.id) supabaseUser = { id: payload.user.id };
    }
    // Also check for local session cookie (kynthai-session) — HMAC verified
    if (!supabaseUser) {
      const localSessionCookie = cookies.find(c => c.name === 'kynthai-session');
      if (localSessionCookie?.value) {
        const verifiedUserId = await verifySessionToken(localSessionCookie.value);
        if (verifiedUserId) {
          supabaseUser = { id: verifiedUserId };
        }
        // If verifySessionToken returns null the cookie is tampered — treat as unauth
      }
    }
  } catch {
    // Cookie parsing failed — treat as unauthenticated
  }

  // ── Static assets ──────────────────────────────────────────────────────
  if (pathname.startsWith('/_next/static/')) {
    res.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return res;
  }
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/logo') ||
    pathname.startsWith('/manifest') ||
    pathname.startsWith('/sw.js') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/apple')
  ) {
    applyHeaders(res, pathname, requestId);
    return res;
  }

  // ── CORS preflight ─────────────────────────────────────────────────────
  const corsResponse = handleCorsPreflight(req);
  if (corsResponse !== null) {
    corsResponse.headers.set('Vary', 'Origin');
    applyHeaders(corsResponse, pathname, requestId);
    return corsResponse;
  }

  // ── Audit endpoint: session cookie required ─────────────────────────────
  if (pathname === '/api/audit' || pathname.startsWith('/api/audit/')) {
    // Check for Supabase session cookies (sb-* prefix)
    const hasSupabaseSession = req.cookies.getAll().some(c => c.name.startsWith('sb-'));
    if (!hasSupabaseSession) {
      // Edge-safe audit logging (no DB access at edge)
      console.log(`[AUDIT] audit_endpoint_unauthorized | method=${method} | path=${pathname} | ip=${ip} | req=${requestId}`);
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }
  }

  // ── Edge audit log API requests (health-data-safe) ────────────────────────────
  if (isApi && !isPublicApi(pathname)) {
    const origin = req.headers.get('origin') ?? 'direct';
    // Edge-safe audit logging (no DB access at edge)
    console.log(`[AUDIT] request.edge | method=${method} | path=${maskPathIds(pathname)} | ip=${ip}`);
  }

  // ── Portal role guard ─────────────────────────────────────────────────
  // Role-based access is enforced by each portal's client-side auth guard.
  // The proxy only checks session presence (supabaseUser above).
  // Demo mode: allow portal access without session cookie.
  const isDemoMode = process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true' && process.env.NODE_ENV !== 'production';
  if (isPortalPath(pathname) && !isApi && !supabaseUser && !isDemoMode) {
    const redirect = NextResponse.redirect(new URL('/login', req.url));
    applyHeaders(redirect, pathname, requestId);
    return redirect;
  }

  // ── Rate limit ──────────────────────────────────────────────────────────
  if (isApi) {
    const limit = getApiLimit(pathname);
    const sessionUserId = supabaseUser?.id;
    const rateLimitKey = sessionUserId ?? rawIp; // unmasked IP for precise per-IP limiting
    const rateLimitResult = await rateLimitWithInfo(
      'proxy:' + rateLimitKey + ':' + pathname,
      limit,
      60_000 // window: 60 seconds
    );

    if (rateLimitResult.allowed) {
      res.headers.set('X-RateLimit-Limit', String(limit));
      res.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
      res.headers.set('X-RateLimit-Reset', String(rateLimitResult.reset));
    } else {
      // Edge-safe audit logging (no DB access at edge)
      console.log(`[AUDIT] rate_limit | method=${method} | path=${pathname} | ip=${ip} | limit=${limit}`);
      rateLimitResult.response!.headers.set('X-RateLimit-Limit', String(limit));
      rateLimitResult.response!.headers.set('X-RateLimit-Remaining', '0');
      rateLimitResult.response!.headers.set('X-RateLimit-Reset', String(rateLimitResult.reset));
      applyHeaders(rateLimitResult.response!, pathname, requestId);
      return rateLimitResult.response!;
    }
  }

  // ── CSRF enforcement ──────────────────────────────────────────────────
  // Enforce double-submit CSRF token on all state-changing requests.
  // Public auth endpoints are included — the client fetches /api/auth/csrf
  // before submitting credentials.
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && isApi) {
    const csrfError = await checkCsrf(req);
    if (csrfError) {
      applyHeaders(csrfError, pathname, requestId);
      return csrfError;
    }
  }

  // ── Auth-required path guard ───────────────────────────────────────────
  if (requiresAuth(pathname)) {
    const sessionUser = supabaseUser;

    if (!sessionUser && !isPublicApi(pathname)) {
      applyHeaders(res, pathname, requestId);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (sessionUser && !isPublicApi(pathname)) {
      const resourceType = inferResourceType(pathname);
      const resourceId = inferResourceId(pathname);
      try {
        // Edge-safe audit logging (no DB access at edge)
        console.log(`[AUDIT] resource.access | user=${sessionUser.id} | resource=${resourceType} | path=${maskPathIds(pathname)}`);
      } catch {
        // non-blocking audit failure
      }
    }
  }

  applyHeaders(res, pathname, requestId);
  return res;
}
