import { StructuredData } from '@/components/structured-data';

// Render the landing page on every request (no ISR caching).
//
// Previously this page used ISR (`revalidate = 3600`). On Vercel that left a
// stale cache entry served indefinitely when background regeneration failed —
// the live site served a 2-day-old empty-shell HTML while the deployed JS was
// current, causing React hydration error #418 and "pages missing" symptoms.
// force-dynamic matches the rest of the app (accessibility, admin, all API
// routes) and keeps the landing HTML always fresh.
export const dynamic = 'force-dynamic';

interface RootPageProps {
  children: React.ReactNode;
}

/**
 * Root page (/) — Server Component.
 *
 * Renders:
 *  1. StructuredData (existing JSON-LD from layout.tsx)
 *  2. MedicalOrganization + MedicalWebPage JSON-LD
 *  3. Health Data Protection medical disclaimer above-the-fold (SSR-rendered, SEO-friendly)
 *
 * PortalClient wraps children in an ErrorBoundary for all routes,
 * so these Server Components render in the SSR HTML chunk first.
 */
export default function RootPage({ children }: RootPageProps) {
  const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://kynthai.app';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'MedicalOrganization',
        '@id': BASE + '/#organization',
        name: 'Kynthai Health Technologies LLP',
        url: BASE,
        logo: BASE + '/logo.png',
        description:
          'Kynthai is an AI-powered health companion for American families, offering medicine reminders, health tracking, doctor video consultations, lab test bookings, and family health management, Privacy-first.',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'TBD — update upon registration',
          addressLocality: 'TBD',
          addressRegion: 'TBD',
          postalCode: 'TBD',
          addressCountry: 'US',
        },
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: 'hello@kynthai.app',
            url: BASE,
          },
          {
            '@type': 'ContactPoint',
            contactType: 'privacy',
            email: 'privacy@kynthai.app',
          },
        ],
        sameAs: [
          'https://twitter.com/kynthai_health',
          'https://www.instagram.com/kynthai_health',
          'https://www.linkedin.com/company/kynthai-health',
          'https://www.youtube.com/@kynthai_health',
        ],
        knowsAbout: [
          'Medication Adherence',
          'Family Health Management',
          'AI Health Assistant',
          'Telemedicine',
          'Lab Test Booking',
          'Privacy-first Healthcare',
        ],
        areaServed: { '@type': 'Country', name: 'United States' },
      },
      {
        '@type': 'MedicalWebPage',
        '@id': BASE + '/#webpage',
        url: BASE,
        name: "Kynthai - America's AI Health Companion for Families",
        description:
          'AI-powered medicine reminders, doctor video consultations, lab tests and family health management for American households. Free to start, Privacy-first, encrypted.',
        isPartOf: { '@id': BASE + '/#website' },
        about: { '@id': BASE + '/#organization' },
        inLanguage: 'en-US',
        accessMode: ['textual', 'visual'],
        accessibilityControl: ['fullKeyboardControl', 'highContrast'],
        specialty: 'Family Medicine, Preventive Health, Digital Health',
        audience: {
          '@type': 'Audience',
          audienceType: 'Patients, Families, Caretakers, Doctors, Labs',
          geographicArea: { '@type': 'Country', name: 'United States' },
        },
      },
    ],
  };

  return (
    <>
      <StructuredData pathname="/" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
