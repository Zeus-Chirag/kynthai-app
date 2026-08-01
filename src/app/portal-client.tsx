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
import { useAppStore, selectors } from '@/lib/store';
import { Suspense, useEffect } from 'react';
import { loadPortal } from './portal-loaders';
import { LandingPage } from '@/components/kynthai/landing-page';
import { LoginPage } from '@/components/kynthai/login-page';
import { PricingPage } from '@/components/kynthai/pricing-page';
import { CheckoutPage } from '@/components/kynthai/checkout-page';
import { Onboarding } from '@/components/kynthai/onboarding';
import {
  PrivacyPolicy,
  TermsOfService,
  CookiePolicy,
  AccessibilityStatement,
  MedicalDisclaimer,
} from '@/components/kynthai/legal/privacy-policy';
import { ErrorBoundary } from '@/components/kynthai/error-boundary';
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

  // Path constants used for hydration guard and routing logic
  const PUBLIC_PATHS = new Set([
    '/login',
    '/register',
    '/pricing',
    '/checkout',
    '/privacy',
    '/terms',
    '/cookies',
    '/accessibility',
    '/medical-disclaimer',
    '/refund-cancellation',
  ]);
  // Real server-rendered pages that must NEVER be swallowed by the client
  // router's screen resolution (which would otherwise show the landing page).
  const PASSTHROUGH_PATHS = new Set([
    '/forgot-password',
    '/reset-password',
    '/ccpa',
    '/grievance',
    '/patient-rights',
    '/privacy-practices',
    '/feedback',
    '/admin-login',
  ]);
  // Auth-protected real pages — need a signed-in user before rendering.
  const PROTECTED_PATHS = new Set(['/settings', '/dashboard']);
  const PORTAL_PATHS = new Set(['/patient', '/doctor', '/lab', '/caretaker', '/family', '/admin']);

  // Use selectors to subscribe only to needed state — avoids re-renders on _hydrated changes
  const user = useAppStore(selectors.user);
  const screen = useAppStore(selectors.screen);
  const onboardingComplete = useAppStore(selectors.onboardingComplete);
  const loginPortal = useAppStore(selectors.loginPortal);
  const checkoutTier = useAppStore(selectors.checkoutTier);
  const checkoutFounder = useAppStore(selectors.checkoutFounder);
  const currency = useAppStore(selectors.currency);
  const hydrated = useAppStore(selectors._hydrated);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const setLoginPortal = useAppStore((s) => s.setLoginPortal);
  const store = useAppStore(); // for login()

  // ─── iOS Safari tab-restore / page-visibility recovery ──────────────
  // When Safari brings a background tab back to foreground after hours,
  // the JS heap is entirely fresh, but localStorage may have a stale user
  // session. If the store looks corrupted or empty, force a hard reload.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Track visibility changes — if the page was backgrounded (suspended)
    // and is now visible, check if chunks are stale by verifying a known
    // window property that survives only if React rehydrated properly.
    let wasHidden = false;
    const handleVisibility = () => {
      if (document.hidden) {
        wasHidden = true;
        // Save current timestamp when page goes to background
        try { sessionStorage.setItem('kynthai-bg-timestamp', String(Date.now())); }
        catch { /* noop */ }
      } else if (wasHidden) {
        // Page came back to foreground — check if the store survived
        wasHidden = false;
        try {
          const bgTime = parseInt(sessionStorage.getItem('kynthai-bg-timestamp') || '0', 10);
          const elapsed = Date.now() - bgTime;
          // If backgrounded > 1 minute, verify hydration state
          if (elapsed > 60000) {
            // Check if React state survived by looking for a DOM marker
            const mainContent = document.getElementById('main-content');
            const appStillWorks = mainContent && mainContent.children.length > 0;
            if (!appStillWorks) {
              // Store is corrupted — clear localStorage and reload
              try {
                localStorage.removeItem('kynthai-store-v2');
                sessionStorage.removeItem('kynthai-chunk-retry');
              } catch { /* noop */ }
              window.location.reload();
              return;
            }
            // Update activity timestamp so store hydration knows it's not stale
            try { sessionStorage.setItem('kynthai-last-activity', String(Date.now())); }
            catch { /* noop */ }
          }
        } catch { /* noop */ }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Also track activity on user interaction (click, scroll, keypress)
    const updateActivity = () => {
      try { sessionStorage.setItem('kynthai-last-activity', String(Date.now())); }
      catch { /* noop */ }
    };
    document.addEventListener('click', updateActivity, { passive: true });
    document.addEventListener('scroll', updateActivity, { passive: true });
    document.addEventListener('keydown', updateActivity, { passive: true });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('click', updateActivity);
      document.removeEventListener('scroll', updateActivity);
      document.removeEventListener('keydown', updateActivity);
    };
  }, []);

  // Mirror devtools — suppress noisy message in console
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const w = window as unknown as Record<string, unknown>;
      if (w.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        (w as any).__REACT_DEVTOOLS_BYPASS_NOTIFICATION = true;
      }
    }
  }, []);

  // Demo mode: auto-login caretaker user and complete onboarding.
  // SECURITY: never auto-consent in production — NODE_ENV='production' hard-blocks.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (process.env.NODE_ENV === 'production') return;
    // Force-clear stuck store via URL param
    if (window.location.search.includes('reset=1')) {
      localStorage.removeItem('kynthai-store-v2');
      window.location.replace('/');
      return;
    }
    if (process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true' && !user && !onboardingComplete) {
      // Auto-set demo user in store (client-side only, no backend session required)
      store.login({
        id: 'demo-caretaker',
        email: 'caretaker@kynthai.app',
        name: 'Demo Family',
        role: 'caretaker',
        consentAccepted: true,
        dataProcessingConsent: true,
        aiTrainingConsent: true,
        isDemo: true,
      });
      completeOnboarding('caretaker');
      // Redirect to family portal after auto-login
      if (pathname === '/') {
        router.replace('/family');
      }
    }
  }, [user, onboardingComplete, completeOnboarding, pathname, router]);

  // ─── Hydration guard & route resolution ─────────────────────────────────
  // Public, passthrough, and portal routes render `children` immediately
  // (they don't read store state that changes during server-side hydration).
  // For other routes (dynamic portal logic), wait for store hydration to
  // avoid "Rendered more hooks than during the previous render" errors.
  // Special case: landing page (/) renders via screen resolution logic below,
  // not via children, so don't block it on hydration.
  const isPublicPath = PUBLIC_PATHS.has(pathname) || PASSTHROUGH_PATHS.has(pathname);
  const isPortalPath = PORTAL_PATHS.has(pathname);
  const isProtectedPath =
    PROTECTED_PATHS.has(pathname) || pathname.startsWith('/family/members/');
  const isLandingPage = pathname === '/';
  const isDemoMode =
    process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true' && process.env.NODE_ENV !== 'production';

  // Public pages (marketing, legal, auth helpers) always render their real page.
  if (isPublicPath) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
  }
  // Wait for hydration before auth-aware decisions (portals, onboarding, redirects).
  if (!isLandingPage && !hydrated) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
  }

  // ─── Onboarding gate — first sign-in ─────────────────────────────────────
  // Authenticated users who haven't completed onboarding see the
  // Welcome → role → consent flow before their portal, on any app route
  // (including `/` and portal paths, which used to skip it entirely).
  if (user && hydrated && !onboardingComplete && !isDemoMode) {
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

  // Portal routes: server pages with their own auth guards (requireSessionUser).
  if (isPortalPath) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
  }

  // Protected real pages (settings / dashboard / family member detail):
  // require a signed-in user before rendering.
  if (isProtectedPath) {
    if (!user) {
      router.replace('/login');
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      );
    }
    // /dashboard is a legacy empty stub — send signed-in users to their portal.
    if (pathname === '/dashboard') {
      const portalFromRole: Record<string, string> = {
        caretaker: 'family',
        family: 'caretaker',
        patient: 'patient',
        doctor: 'doctor',
        lab: 'lab',
        admin: 'admin',
      };
      router.replace('/' + (portalFromRole[user.role] ?? 'family'));
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      );
    }
    return <ErrorBoundary>{children}</ErrorBoundary>;
  }

  // Unknown paths: render the server page (404), not the landing page.
  if (!isLandingPage) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
  }

  // ─── Screen resolution logic ──────────────────────────────────────────────
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

  // ── Landing (default) ────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <LandingPage
        onGetStarted={(portal?: string) => {
          const safePortal = (portal ?? 'caretaker') as LoginPortal;
          // Do NOT pre-complete onboarding here — the Welcome flow must show
          // after the user registers and signs in for the first time.
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
