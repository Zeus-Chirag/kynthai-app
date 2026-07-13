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
  streetAddress: 'TBD — update upon registration',
  addressLocality: 'TBD',
  addressRegion: 'TBD',
  postalCode: 'TBD',
  addressCountry: 'IN',
} as const;

const SOCIAL_PROFILES = [
  'https://twitter.com/kyntha_health',
  'https://www.linkedin.com/company/kyntha-health',
  'https://www.instagram.com/kyntha_health',
  'https://www.youtube.com/@kyntha_health',
  'https://github.com/kyntha-health',
] as const;

const WEBAPP_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  '@id': 'https://kyntha.in/#webapp',
  name: 'Kyntha',
  alternateName: 'Kyntha Health',
  description:
    "India's AI Health Companion with medicine reminders, doctor consults, lab tests, and family health management.",
  url: 'https://kyntha.in',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'iOS, Android, Web',
  softwareVersion: '2.0.0',
  offers: [
    { '@type': 'Offer', name: 'Free Plan', price: '0', priceCurrency: 'INR' },
    { '@type': 'Offer', name: 'Plus Plan', price: '199', priceCurrency: 'INR' },
    { '@type': 'Offer', name: 'Family Pro', price: '499', priceCurrency: 'INR' },
  ],
  availableOnDemand: true,
  inLanguage: ['en', 'hi'],
  author: {
    '@type': 'Organization',
    '@id': 'https://kyntha.in/#organization',
    name: 'Kyntha Health Technologies Pvt Ltd',
  },
  publisher: { '@id': 'https://kyntha.in/#organization' },
} as const;

const MEDICAL_ORG_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://kyntha.in/#medicalorganization',
  name: 'Kyntha Health Technologies Pvt Ltd',
  description: "India's AI Health Companion for families.",
  url: 'https://kyntha.in',
  ...KYNETHA_ADDRESS,
  email: 'privacy@kyntha.in',
  foundingDate: '2026', // ⚠️ CHANGE after actual registration
  sameAs: [...SOCIAL_PROFILES],
  areaServed: { '@type': 'Country', name: 'India' },
} as const;

const ORG_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://kyntha.in/#organization',
  name: 'Kyntha Health Technologies Pvt Ltd',
  description: "India's AI Health Companion for families.",
  url: 'https://kyntha.in',
  ...KYNETHA_ADDRESS,
  email: 'privacy@kyntha.in',
  foundingDate: '2026', // ⚠️ CHANGE after actual registration
  sameAs: [...SOCIAL_PROFILES],
  areaServed: { '@type': 'Country', name: 'India' },
} as const;

function breadcrumbSchema(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  const items = parts.map((part, i) => ({
    '@type': 'ListItem' as const,
    position: i + 1,
    name: part.charAt(0).toUpperCase() + part.slice(1),
    item: `https://kyntha.in/${parts.slice(0, i + 1).join('/')}`,
  }));
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList' as const,
    '@id': `https://kyntha.in${pathname}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem' as const, position: 1, name: 'Home', item: 'https://kyntha.in' },
      ...items,
    ],
  };
}

const WEBPAGE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://kyntha.in/#webpage',
  name: "Kyntha — India's AI Health Companion",
  description: 'AI-powered health management for families in India.',
  url: 'https://kyntha.in',
  inLanguage: 'en-IN',
  isAccessibleForFree: true,
  accessibilitySummary: 'WCAG 2.1 AA compliant. Keyboard navigable and screen-reader friendly.',
} as const;

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': 'https://kyntha.in/#faqpage',
  mainEntity: [
    {
      '@type': 'Question' as const,
      name: 'Is Kyntha free to use?',
      acceptedAnswer: {
        '@type': 'Answer' as const,
        text: 'Kyntha Free Plan includes 1 member profile, 10 medications, 3 AI chats per day, and all smart reminders. No credit card required.',
      },
    },
    {
      '@type': 'Question' as const,
      name: 'What payment methods are supported?',
      acceptedAnswer: {
        '@type': 'Answer' as const,
        text: 'All major UPI apps, credit/debit cards (Visa, Mastercard, RuPay), and net banking via Razorpay.',
      },
    },
    {
      '@type': 'Question' as const,
      name: 'Is Kyntha DPDP compliant?',
      acceptedAnswer: {
        '@type': 'Answer' as const,
        text: 'Kyntha is designed with DPDP-compliant safeguards. Your data is encrypted at rest and in transit under India data protection laws. We never sell your personal data. You can export or delete it anytime.',
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
