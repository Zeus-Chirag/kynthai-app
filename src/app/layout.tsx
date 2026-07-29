import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { PortalShell } from './portal-shell';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kynthai.app';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Kynthai — America's AI Health Companion for Families",
    template: '%s | Kynthai US',
  },
  description:
    'AI-powered medicine reminders, doctor consults, lab tests & family health management — built for the US. Free to start, Privacy-first, secure and compliant.',
  keywords: [
    'Kynthai',
    'AI health US',
    'medicine reminder USA',
    'family health app US',
    'doctor consultation US',
    'lab tests US',
    'health reminders US',
    'Privacy-first health app',
    'AI healthcare US',
    'medicine reminder app',
    'health management US',
    'telemedicine US',
    'online pharmacy US',
    'health tech US',
    'family medication management',
  ],
  authors: [{ name: 'Kynthai Health Technologies LLC' }],
  manifest: '/manifest.json',
  openGraph: {
    title: 'Kynthai — AI Health & Medication Manager for American Families',
    description:
      'Manage medications, track adherence, check drug interactions, and connect with doctors. Built for families in the US.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    type: 'website',
    locale: 'en_US',
    siteName: 'Kynthai',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Kynthai — America's AI Health Companion",
    description:
      'AI-powered medicine reminders, doctor consults, lab tests & family health management for US families.',
    images: ['/og-image.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kynthai',
  },
  other: {
    'geo.region': 'US',
    'geo.placename': 'United States',
    'geo.position': '37.0902,-95.7129',
    ICBM: '37.0902, -95.7129',
    // Verification codes: add after Google Search Console & Bing Webmaster Tools setup
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  alternates: {
    canonical: 'https://kynthai.app',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#10b981',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#10b981" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#022c22" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Stripe publishable key for frontend payment components */}
        {process.env.NEXT_PUBLIC_STRIPE_PK && (
          <meta name="stripe-pk" content={process.env.NEXT_PUBLIC_STRIPE_PK} />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-foreground`}
      >
        {/* ═══════════════════════════════════════════════════════════════
            iOS Safari Tab-Restore Recovery Script
            ═══════════════════════════════════════════════════════════════
            Runs BEFORE React hydrates. Detects if this is a tab restore
            from iOS Safari by checking for the "bg-timestamp" marker.
            If the page was backgrounded > 5 minutes, the JS heap was
            evicted and we need a clean reload bypassing the SW cache.
        */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var bgTime = sessionStorage.getItem('kynthai-bg-timestamp');
              if (bgTime) {
                var elapsed = Date.now() - parseInt(bgTime, 10);
                if (elapsed > 300000) {
                  // Was backgrounded >5 min — likely iOS Safari evicted our heap.
                  // Clear stale localStorage session to force clean login
                  localStorage.removeItem('kynthai-store-v2');
                  sessionStorage.removeItem('kynthai-bg-timestamp');
                  sessionStorage.removeItem('kynthai-last-activity');
                  // Force a fresh load bypassing service worker cache
                  window.location.reload();
                  return; // stop executing further
                }
              }
            } catch(e) { /* ignore */ }

            // ─── Chunk-load error recovery ───────────────────────────────
            // If the SW served stale HTML with mismatched chunk hashes,
            // catch ChunkLoadError, retry 3 times, then show a refresh button.
            var retried = parseInt(sessionStorage.getItem('kynthai-chunk-retry') || '0', 10);
            if (retried > 0) {
              // We already retried — clear counter for next round
              sessionStorage.removeItem('kynthai-chunk-retry');
            }

            // Register a one-time DOMContentLoaded check: if page loaded from
            // SW cache, the Next.js __NEXT_DATA__ script might be stale
            document.addEventListener('DOMContentLoaded', function() {
              var nextData = document.getElementById('__NEXT_DATA__');
              if (nextData) {
                try {
                  var data = JSON.parse(nextData.textContent || '{}');
                  // If buildId is present, it validates this is the right bundle.
                  // On chunk failure we don't check buildId here — the error handler below does.
                } catch(e) { /* ignore */ }
              }
            });

            // ChunkLoadError handler — with 3 retries, then refresh button
            window.addEventListener('error', function(e) {
              if (e.message && (
                e.message.indexOf('ChunkLoadError') !== -1 ||
                e.message.indexOf('Loading chunk') !== -1 ||
                (e.target && e.target.tagName === 'SCRIPT' && e.target.src && !e.target.src.includes(location.host))
              )) {
                var n = parseInt(sessionStorage.getItem('kynthai-chunk-retry') || '0', 10);
                if (n < 3) {
                  sessionStorage.setItem('kynthai-chunk-retry', String(n + 1));
                  // Hard reload bypassing cache
                  window.location.reload();
                } else {
                  // After 3 failures, show a friendly recovery UI
                  document.body.innerHTML =
                    '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem;text-align:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif">' +
                    '<div>' +
                    '<h2 style="font-size:1.25rem;font-weight:700;color:#1e293b;margin-bottom:0.5rem">App Update Available</h2>' +
                    '<p style="color:#64748b;margin-bottom:1.5rem;max-width:360px;line-height:1.5">A new version was deployed while you were away. Please refresh to get the latest.</p>' +
                    '<button onclick=\'localStorage.clear();sessionStorage.clear();location.reload()\' ' +
                    'style="background:#059669;color:white;border:none;padding:0.75rem 2rem;border-radius:9999px;font-size:1rem;cursor:pointer;font-weight:600;box-shadow:0 4px 6px -1px rgba(5,150,105,0.3)">' +
                    'Refresh Now</button>' +
                    '</div></div>';
                }
              }
            }, true);
          })();
        `}} />
        {/* ACCESSIBILITY: Skip link for keyboard/screen-reader users — FIXED */}
        <a
          href="#main-content"
          className="absolute -top-10 -left-10 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-[100] focus:top-4 focus:left-4 focus:outline-none"
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
          }}
        >
          Skip to main content
        </a>
        <Providers>
          <PortalShell>{children}</PortalShell>
        </Providers>
      </body>
    </html>
  );
}
