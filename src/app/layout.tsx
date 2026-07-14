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

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kyntha.app';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Kyntha — America's AI Health Companion for Families",
    template: '%s | Kyntha US',
  },
  description:
    'AI-powered medicine reminders, doctor consults, lab tests & family health management — built for the US. Free to start, HIPAA-aligned, secure and compliant.',
  keywords: [
    'Kyntha',
    'AI health US',
    'medicine reminder USA',
    'family health app US',
    'doctor consultation US',
    'lab tests US',
    'health reminders US',
    'HIPAA aligned health app',
    'AI healthcare US',
    'medicine reminder app',
    'health management US',
    'telemedicine US',
    'online pharmacy US',
    'health tech US',
    'family medication management',
  ],
  authors: [{ name: 'Kyntha Health Technologies LLC' }],
  manifest: '/manifest.json',
  openGraph: {
    title: 'Kyntha — AI Health & Medication Manager for American Families',
    description:
      'Manage medications, track adherence, check drug interactions, and connect with doctors. Built for families in the US.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    type: 'website',
    locale: 'en_US',
    siteName: 'Kyntha',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Kyntha — America's AI Health Companion",
    description:
      'AI-powered medicine reminders, doctor consults, lab tests & family health management for US families.',
    images: ['/og-image.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kyntha',
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
    canonical: 'https://kyntha.app',
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
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-foreground`}
      >
        {/* ACCESSIBILITY: Skip link for keyboard/screen-reader users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-emerald-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
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
