/**
 * StructuredData — Server Component
 *
 * Renders JSON-LD <script> tags directly from the server. No "use client"
 * directive, no usePathname hook, no React runtime overhead. The breadcrumbs
 * that depend on the current pathname are passed in as a prop so the parent
 * page.tsx can supply them.
 */

// ─── Schema definitions (pure data — no hooks, no subscriptions) ──────────────

const KYNETHA_ADDRESS = {
  streetAddress: '1209 Orange St, Wilmington, DE 19801',
  addressLocality: 'Wilmington',
  addressRegion: 'DE',
  postalCode: '19801',
  addressCountry: 'US',
} as const;

const SOCIAL_PROFILES = [
  'https://twitter.com/kynthai_health',
  'https://www.linkedin.com/company/kynthai-health',
  'https://www.instagram.com/kynthai_health',
  'https://www.youtube.com/@kynthai_health',
  'https://github.com/kynthai-health',
] as const;

const WEBAPP_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  '@id': 'https://kynthai.app/#webapp',
  name: 'Kynthai',
  alternateName: 'Kynthai Health',
  description:
    'AI-powered health management platform for US patients, families, doctors, and labs. Medicine reminders, doctor consultations, lab bookings, and family health coordination.',
  url: 'https://kynthai.app',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'iOS, Android, Web',
  softwareVersion: '2.0.0',
  offers: [
    { '@type': 'Offer', name: 'Free Plan', price: '0', priceCurrency: 'USD' },
    {
      '@type': 'Offer',
      name: 'Individual Plan',
      price: '9.99',
      priceCurrency: 'USD',
      billingIncrement: 'P1M',
    },
    {
      '@type': 'Offer',
      name: 'Family Pro Plan',
      price: '19.99',
      priceCurrency: 'USD',
      billingIncrement: 'P1M',
    },
  ],
  availableOnDemand: true,
  inLanguage: ['en-US'],
  author: {
    '@type': 'Organization',
    '@id': 'https://kynthai.app/#organization',
    name: 'Kynthai Health Technologies LLC',
  },
  publisher: { '@id': 'https://kynthai.app/#organization' },
} as const;

const MEDICAL_ORG_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://kynthai.app/#medicalorganization',
  name: 'Kynthai Health Technologies LLC',
  description:
    'AI-powered health management platform for patients, families, doctors, and labs in the United States.',
  url: 'https://kynthai.app',
  ...KYNETHA_ADDRESS,
  email: 'privacy@kynthai.app',
  foundingDate: '2025',
  sameAs: [...SOCIAL_PROFILES],
  areaServed: { '@type': 'Country', name: 'United States' },
} as const;

const ORG_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://kynthai.app/#organization',
  name: 'Kynthai Health Technologies LLC',
  description:
    'AI-powered health management platform for patients, families, doctors, and labs in the United States.',
  url: 'https://kynthai.app',
  ...KYNETHA_ADDRESS,
  email: 'privacy@kynthai.app',
  foundingDate: '2025',
  sameAs: [...SOCIAL_PROFILES],
  areaServed: { '@type': 'Country', name: 'United States' },
} as const;

function breadcrumbSchema(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  const items = parts.map((part, i) => ({
    '@type': 'ListItem' as const,
    position: i + 1,
    name: part.charAt(0).toUpperCase() + part.slice(1),
    item: `https://kynthai.app/${parts.slice(0, i + 1).join('/')}`,
  }));
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList' as const,
    '@id': `https://kynthai.app${pathname}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem' as const, position: 1, name: 'Home', item: 'https://kynthai.app' },
      ...items,
    ],
  };
}

const WEBPAGE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://kynthai.app/#webpage',
  name: 'Kynthai — AI Health Management for US Families',
  description:
    'AI-powered health management for patients and families in the United States. Medicine reminders, doctor consultations, lab bookings.',
  url: 'https://kynthai.app',
  inLanguage: 'en-US',
  isAccessibleForFree: true,
  accessibilitySummary: 'WCAG 2.1 AA compliant. Keyboard navigable and screen-reader friendly.',
} as const;

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': 'https://kynthai.app/#faqpage',
  mainEntity: [
    {
      '@type': 'Question' as const,
      name: 'Is Kynthai free to use?',
      acceptedAnswer: {
        '@type': 'Answer' as const,
        text: 'Kynthai Free Plan includes 1 member profile, 10 medications, 3 AI chats per day, and all smart reminders. No credit card required.',
      },
    },
    {
      '@type': 'Question' as const,
      name: 'What payment methods are supported?',
      acceptedAnswer: {
        '@type': 'Answer' as const,
        text: 'We accept all major credit/debit cards (Visa, Mastercard, Amex), Apple Pay, Google Pay, and ACH bank transfer via Stripe.',
      },
    },
    {
      '@type': 'Question' as const,
      name: 'Is my data safe with Kynthai?',
      acceptedAnswer: {
        '@type': 'Answer' as const,
        text: 'Kynthai uses encryption at rest and in transit to protect your data. No health data is sold to third parties. You can export or delete your data anytime. For questions: privacy@kynthai.app.',
      },
    },
    {
      '@type': 'Question' as const,
      name: 'Where is my data stored?',
      acceptedAnswer: {
        '@type': 'Answer' as const,
        text: 'Kynthai is US-hosted on Supabase Cloud. Your health data never leaves American soil for processing.',
      },
    },
  ],
} as const;

// ─── Component ───────────────────────────────────────────────────────────

const STATIC_SCHEMAS = [
  WEBAPP_SCHEMA,
  MEDICAL_ORG_SCHEMA,
  ORG_SCHEMA,
  WEBPAGE_SCHEMA,
  FAQ_SCHEMA,
] as const;

interface StructuredDataProps {
  pathname: string;
}

export function StructuredData({ pathname }: StructuredDataProps) {
  const breadcrumb = breadcrumbSchema(pathname);
  const schemas = [...STATIC_SCHEMAS, breadcrumb] as unknown as Record<string, unknown>[];

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"

          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}

/**
 * Hook equivalent — returns the schema objects (server-compatible).
 * Intended for use in Server Components alongside StructuredData.
 */

export function usePageStructuredData(pathname: string) {
  return {
    webApp: WEBAPP_SCHEMA,
    medicalOrg: MEDICAL_ORG_SCHEMA,
    org: ORG_SCHEMA,
    breadcrumb: breadcrumbSchema(pathname),
    webpage: WEBPAGE_SCHEMA,
    faq: FAQ_SCHEMA,
  };
}
