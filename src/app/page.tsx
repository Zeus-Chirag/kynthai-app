import { StructuredData } from "@/components/structured-data"

interface RootPageProps {
  children: React.ReactNode
}

/**
 * Root page (/) — Server Component.
 *
 * Renders:
 *  1. StructuredData (existing JSON-LD from layout.tsx)
 *  2. MedicalOrganization + MedicalWebPage JSON-LD
 *  3. HIPAA medical disclaimer above-the-fold (SSR-rendered, SEO-friendly)
 *
 * PortalClient wraps children in an ErrorBoundary for all routes,
 * so these Server Components render in the SSR HTML chunk first.
 */
export default function RootPage({ children }: RootPageProps) {
  const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://kyntha.app"

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MedicalOrganization",
        "@id": BASE + "/#organization",
        name: "Kyntha Health Technologies LLP",
        url: BASE,
        logo: BASE + "/logo.png",
        description:
          "Kyntha is an AI-powered health companion for Indian families, offering medicine reminders, health tracking, doctor video consultations, lab test bookings, and family health management, DPDP-compliant.",
        address: {
          "@type": "PostalAddress",
          streetAddress: "No. 42, 12th Main, Koramangala 4th Block",
          addressLocality: "Bengaluru",
          addressRegion: "Karnataka",
          postalCode: "560034",
          addressCountry: "IN",
        },
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: "hello@kyntha.app",
            url: BASE,
          },
          {
            "@type": "ContactPoint",
            contactType: "privacy",
            email: "privacy@kyntha.app",
          },
        ],
        sameAs: [
          "https://twitter.com/kyntha_health",
          "https://www.instagram.com/kyntha_health",
          "https://www.linkedin.com/company/kyntha-health",
          "https://www.youtube.com/@kyntha_health",
        ],
        knowsAbout: [
          "Medication Adherence",
          "Family Health Management",
          "AI Health Assistant",
          "Telemedicine",
          "Lab Test Booking",
          "DPDP-Compliant Healthcare",
        ],
        areaServed: { "@type": "Country", name: "India" },
      },
      {
        "@type": "MedicalWebPage",
        "@id": BASE + "/#webpage",
        url: BASE,
        name: "Kyntha - India's AI Health Companion for Families",
        description:
          "AI-powered medicine reminders, doctor video consultations, lab tests and family health management for Indian households. Free to start, DPDP-compliant, encrypted.",
        isPartOf: { "@id": BASE + "/#website" },
        about: { "@id": BASE + "/#organization" },
        inLanguage: "en-IN",
        accessMode: ["textual", "visual"],
        accessibilityControl: ["fullKeyboardControl", "highContrast"],
        specialty: "Family Medicine, Preventive Health, Digital Health",
        audience: {
          "@type": "Audience",
          audienceType: "Patients, Families, Caretakers, Doctors, Labs",
          geographicArea: { "@type": "Country", name: "India" },
        },
      },
    ],
  }

  return (
    <>
      <StructuredData pathname="/" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  )
}
