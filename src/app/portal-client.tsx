'use client';

/**
 * portal-client.tsx
 *
 * Client-side routing entry point mounted in the root layout.
 * Reads the initial pathname on mount, then renders PortalClient.
 *
 * PortalShell and PortalClient live together in adjacent files — they
 * form the complete client-side bundle entry for the root route, keeping
 * portal chunks completely isolated from the initial client entry.
 */

import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Suspense, useEffect, useState } from 'react';
import { loadPortal } from './portal-loaders';
import { LandingPage } from '@/components/kyntha/landing-page';
import { LoginPage } from '@/components/kyntha/login-page';
import { PricingPage } from '@/components/kyntha/pricing-page';
import { CheckoutPage } from '@/components/kyntha/checkout-page';
import { Onboarding } from '@/components/kyntha/onboarding';
import {
  PrivacyPolicy,
  TermsOfService,
  CookiePolicy,
  AccessibilityStatement,
  MedicalDisclaimer,
} from '@/components/kyntha/legal/privacy-policy';
import { ErrorBoundary } from '@/components/kyntha/error-boundary';
import type { AppScreen, LoginPortal } from '@/lib/store';

// ── Route → screen mapping ─────────────────────────────────────────────────
const ROUTE_SCREEN: Record<string, AppScreen> = {
  '/': 'landing',
  '/pricing': 'pricing',
  '/login': 'login',
  '/register': 'login',
  '/checkout': 'checkout',
  '/privacy': 'privacy',
  '/terms': 'terms',
  '/cookies': 'cookies',
  '/accessibility': 'accessibility',
  '/medical-disclaimer': 'medical-disclaimer',
  '/refund-cancellation': 'refund-cancellation',
};

const PORTAL_SCREENS = ['patient', 'doctor', 'lab', 'caretaker', 'family', 'admin'] as const;
const PUBLIC_SCREENS = [
  'landing',
  'login',
  'pricing',
  'checkout',
  'privacy',
  'terms',
  'cookies',
  'accessibility',
  'medical-disclaimer',
  'refund-cancellation',
] as const;

// ── Main routing component ─────────────────────────────────────────────────
export function PortalClient({ children }: { children: React.ReactNode }) {
  const rawPathname = usePathname(); // updates reactively on every nav
  const pathname =
    rawPathname.endsWith('/') && rawPathname.length > 1 ? rawPathname.slice(0, -1) : rawPathname;
  const isKnownPath =
    pathname === '/' ||
    pathname in ROUTE_SCREEN ||
    /^\/(patient|doctor|lab|caretaker|admin)$/.test(pathname);
  const router = useRouter();
  const store = useAppStore();
  const {
    user,
    screen,
    onboardingComplete,
    loginPortal,
    checkoutTier,
    checkoutFounder,
    currency,
    completeOnboarding,
    setLoginPortal,
    login,
  } = store;

  // Mirror devtools — suppress noisy message in console
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const w = window as unknown as Record<string, unknown>;
      if (w.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        (w as any).__REACT_DEVTOOLS_BYPASS_NOTIFICATION = true;
      }
    }
  }, []);

  // Demo mode: auto-complete onboarding and auto-login so the app is immediately usable.
  // SECURITY: never auto-consent in production — NODE_ENV='production' hard-blocks.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (process.env.NODE_ENV === 'production') return;
    // Force-clear stuck store via URL param
    if (window.location.search.includes('reset=1')) {
      localStorage.removeItem('kyntha-store-v2');
      window.location.replace('/');
      return;
    }
    if (process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true') {
      // Auto-complete onboarding if not done
      if (!onboardingComplete) {
        completeOnboarding('patient');
      }
      // Auto-login if no user session
      if (!user) {
        (async () => {
          try {
            // Check if already authenticated via Supabase session
            const meRes = await fetch('/api/auth/me', { cache: 'no-store' });
            const meData = await meRes.json();
            if (meData.authenticated && meData.user) {
              login(meData.user);
              return;
            }
            // Auto-login with demo credentials
            let csrfToken = document.cookie.match(/kyntha-csrf=([^;]+)/)?.[1];
            if (!csrfToken) {
              await fetch('/api/auth/csrf', { credentials: 'include' });
              csrfToken = document.cookie.match(/kyntha-csrf=([^;]+)/)?.[1];
            }
            if (csrfToken) {
              const loginRes = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
                credentials: 'include',
                body: JSON.stringify({ email: 'demo@kyntha.app', password: 'Demo1234!' }),
              });
              if (loginRes.ok) {
                const loginData = await loginRes.json();
                login({
                  id: loginData.id,
                  email: loginData.email,
                  name: loginData.name,
                  role: loginData.role,
                  phone: loginData.phone,
                  subscriptionTier: loginData.subscriptionTier,
                  isDemo: loginData.isDemo,
                });
              }
            }
          } catch {
            // Ignore — user can login manually
          }
        })();
      }
    }
  }, [onboardingComplete, completeOnboarding, user, login]);

  // URL wins if it corresponds to a known public page
  const routeScreen = ROUTE_SCREEN[pathname] ?? screen;
  const resolvedScreen = [...PORTAL_SCREENS, ...PUBLIC_SCREENS].includes(routeScreen as any)
    ? routeScreen
    : 'landing';

  // Auth-aware screen resolution
  let effectiveScreen: AppScreen = resolvedScreen;
  if (user) {
    if (routeScreen === 'landing' || routeScreen === 'login') {
      effectiveScreen = (user.role as AppScreen) ?? routeScreen;
    }
  } else {
    if (PORTAL_SCREENS.includes(routeScreen as any)) effectiveScreen = 'landing';
  }

  // Public routes render their own page segments through `children`.
  // Portal routes should also render `children` so their auth guards and
  // redirects can run; PortalClient must not suppress them here.
  const PUBLIC_PATHS = new Set([
    '/login',
    '/pricing',
    '/checkout',
    '/privacy',
    '/terms',
    '/cookies',
    '/accessibility',
    '/medical-disclaimer',
    '/refund-cancellation',
  ]);
  const PORTAL_PATHS = new Set(['/patient', '/doctor', '/lab', '/caretaker', '/family', '/admin']);
  if (PUBLIC_PATHS.has(pathname) || PORTAL_PATHS.has(pathname)) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
  }

  // ── Portal apps — loaded via portal-loaders.tsx ───────────────────────────
  const { key, node } = loadPortal(effectiveScreen, user);
  if (node) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          </div>
        }
      >
        <div key={key}>{node}</div>
      </Suspense>
    );
  }

  // SECURITY: User is authenticated but attempting to access a portal
  // they don't have the correct role for. Redirect to their own portal or login.
  if (user && PORTAL_PATHS.has(pathname)) {
    const userPortal = user.role as string;
    // Map 'caretaker' (DB role) to the 'family' client portal path, and
    // 'family' to 'caretaker' (the actual DB role). All other roles map 1:1.
    const portalFromRole: Record<string, string> = {
      caretaker: 'family',
      family: 'caretaker',
      patient: 'patient',
      doctor: 'doctor',
      lab: 'lab',
      admin: 'admin',
    };
    const expectedPath = '/' + (portalFromRole[userPortal] ?? userPortal);
    if (
      pathname !== expectedPath &&
      ['patient', 'doctor', 'lab', 'caretaker', 'family', 'admin'].includes(userPortal)
    ) {
      router.replace(expectedPath);
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-sm text-muted-foreground">Redirecting to your portal...</div>
        </div>
      );
    }
  }

  // ── Onboarding ─────────────────────────────────────────────────────────
  // In demo mode, skip onboarding entirely — auto-complete immediately
  const isDemoMode = process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true' && process.env.NODE_ENV !== 'production';
  if (!onboardingComplete && !isDemoMode) {
    return (
      <ErrorBoundary>
        <Onboarding
          onComplete={role => {
            completeOnboarding(role);
            setLoginPortal(role);
            router.push('/');
          }}
        />
      </ErrorBoundary>
    );
  }

  // ── Landing (default) ────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <LandingPage
        onGetStarted={(portal?: string) => {
          const safePortal = (portal ?? 'caretaker') as LoginPortal;
          completeOnboarding(safePortal);
          setLoginPortal(safePortal);
          // ROUTE: Direct to registration for new users, not login
          router.push('/register/');
        }}
        onPickPortal={(role?: string) => {
          const safePortal = (role ?? 'caretaker') as LoginPortal;
          setLoginPortal(safePortal);
          router.push('/login/');
        }}
        currency={currency}
      />
    </ErrorBoundary>
  );
}
