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
  streetAddress: "1600 Pennsylvania Avenue NW, Suite 500",
  addressLocality: "Washington",
  addressRegion: "DC",
  postalCode: "20500",
  addressCountry: "US",
} as const;

const SOCIAL_PROFILES = [
  "https://twitter.com/kyntha_health",
  "https://www.linkedin.com/company/kyntha-health",
  "https://www.instagram.com/kyntha_health",
  "https://www.youtube.com/@kyntha_health",
  "https://github.com/kyntha-health",
] as const;

const WEBAPP_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "@id": "https://kyntha.app/#webapp",
  name: "Kyntha",
  alternateName: "Kyntha Health",
  description:
    "America's AI Health Companion with medicine reminders, doctor consults, lab tests, and family health management.",
  url: "https://kyntha.app",
  applicationCategory: "HealthApplication",
  operatingSystem: "iOS, Android, Web",
  softwareVersion: "2.0.0",
  offers: [
    { "@type": "Offer", name: "Free Plan", price: "0", priceCurrency: "USD" },
    { "@type": "Offer", name: "Plus Plan", price: "9", priceCurrency: "USD" },
    { "@type": "Offer", name: "Family Pro", price: "19", priceCurrency: "USD" },
  ],
  availableOnDemand: true,
  inLanguage: ["en", "es"],
  author: {
    "@type": "Organization",
    "@id": "https://kyntha.app/#organization",
    name: "Kyntha Health Technologies LLC",
  },
  publisher: { "@id": "https://kyntha.app/#organization" },
} as const;

const MEDICAL_ORG_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://kyntha.app/#medicalorganization",
  name: "Kyntha Health Technologies LLC",
  description: "America's AI Health Companion for families.",
  url: "https://kyntha.app",
  ...KYNETHA_ADDRESS,
  email: "privacy@kyntha.app",
  foundingDate: "2026", // ⚠️ CHANGE after actual LLC filing
  sameAs: [...SOCIAL_PROFILES],
  areaServed: { "@type": "Country", name: "United States" },
} as const;

const ORG_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://kyntha.app/#organization",
  name: "Kyntha Health Technologies LLC",
  description: "America's AI Health Companion for families.",
  url: "https://kyntha.app",
  ...KYNETHA_ADDRESS,
  email: "privacy@kyntha.app",
  foundingDate: "2026", // ⚠️ CHANGE after actual LLC filing
  sameAs: [...SOCIAL_PROFILES],
  areaServed: { "@type": "Country", name: "United States" },
} as const;

function breadcrumbSchema(pathname: string) {
  const parts = pathname.split("/").filter(Boolean)
  const items = parts.map((part, i) => ({
    "@type": "ListItem" as const,
    position: i + 1,
    name: part.charAt(0).toUpperCase() + part.slice(1),
    item: `https://kyntha.app/${parts.slice(0, i + 1).join("/")}`,
  }))
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList" as const,
    "@id": `https://kyntha.app${pathname}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem" as const, position: 1, name: "Home", item: "https://kyntha.app" },
      ...items,
    ],  }
}

const WEBPAGE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://kyntha.app/#webpage",
  name: "Kyntha — America's AI Health Companion",
  description: "AI-powered health management for families in the US.",
  url: "https://kyntha.app",
  inLanguage: "en-US",
  isAccessibleForFree: true,
  accessibilitySummary: "WCAG 2.1 AA compliant. Keyboard navigable and screen-reader friendly.",
} as const;

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": "https://kyntha.app/#faqpage",
  mainEntity: [
    {
      "@type": "Question" as const,
      name: "Is Kyntha free to use?",
      acceptedAnswer: {
        "@type": "Answer" as const,
        text: "Kyntha Free Plan includes 1 member profile, 10 medications, 3 AI chats per day, and all smart reminders. No credit card required.",
      },
    },
    {
      "@type": "Question" as const,
      name: "What payment methods are supported?",
      acceptedAnswer: {
        "@type": "Answer" as const,
        text: "All major credit/debit cards (Visa, Mastercard, Amex), Apple Pay, Google Pay, and ACH bank transfers via Stripe.",
      },
    },
    {
      "@type": "Question" as const,
      name: "Is Kyntha HIPAA aligned?",
      acceptedAnswer: {
        "@type": "Answer" as const,
        text: "Kyntha is designed with HIPAA-aligned safeguards. Encrypted data handling and user data export/deletion rights are part of our design.",
      },
    },
  ],
} as const;

// ─── Component ───────────────────────────────────────────────────────────

const STATIC_SCHEMAS = [WEBAPP_SCHEMA, MEDICAL_ORG_SCHEMA, ORG_SCHEMA, WEBPAGE_SCHEMA, FAQ_SCHEMA] as const

interface StructuredDataProps {
  pathname: string
}

export function StructuredData({ pathname }: StructuredDataProps) {
  const breadcrumb = breadcrumbSchema(pathname)
  const schemas = [...STATIC_SCHEMAS, breadcrumb] as unknown as Record<string, unknown>[]

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
  )
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
  }
}

