import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://kynthai.app'
  const now = new Date()

  const pages: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/cookies`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/accessibility`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/medical-disclaimer`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    
    { url: `${base}/refund-cancellation`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/privacy-practices`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/patient-rights`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/ccpa`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/grievance`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  return pages
}
