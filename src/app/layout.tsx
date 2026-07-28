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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-foreground`}
      >
        {/* Chunk load error auto-retry — prevents black screens */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var retryKey='kynthai-chunk-retry';
            window.addEventListener('error',function(e){
              if(e.message && (e.message.indexOf('ChunkLoadError')!==-1 || e.message.indexOf('Loading chunk')!==-1)){
                var n=parseInt(sessionStorage.getItem(retryKey)||'0',10);
                if(n<3){
                  sessionStorage.setItem(retryKey,String(n+1));
                  // Clear service worker cache on retry
                  if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(s){s.unregister()})})}
                  window.location.reload(true);
                }else{
                  sessionStorage.removeItem(retryKey);
                  // Final fallback: clear all storage and reload
                  try{localStorage.clear();sessionStorage.clear()}catch(x){}
                  window.location.reload(true);
                }
              }
            },true);
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
