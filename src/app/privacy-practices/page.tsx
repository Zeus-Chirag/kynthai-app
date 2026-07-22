import { Metadata } from 'next'
import { LegalLayout } from '@/components/kyntha/legal/privacy-policy'
import nppData from './npp-content.json'

export const metadata: Metadata = {
  title: 'Notice of Privacy Practices | Notice of Privacy Practices',
  description: 'Notice of Privacy Practices for Kyntha Health Technologies.',
}

export default function PrivacyPracticesPage() {
  const lines = (nppData.content as string).split('\n')
  return (
    <LegalLayout
        title="Notice of Privacy Practices"
        subtitle="Notice of Privacy Practices — how Kyntha uses, discloses, and protects your Protected Health Information (sensitive health data)."
        updated={nppData.effectiveDate as string}
      >
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mb-6">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Notice of Privacy Practices (NPP)</strong> — This notice describes how
            medical information about you may be used and disclosed and how you can get access
            to this information. For questions contact our privacy officer at
            <a href="mailto:privacy@kyntha.app" className="underline ml-1">privacy@kyntha.app</a>.
          </p>
        </div>
        <div className="prose prose-sm max-w-none text-foreground space-y-1">
          {lines.map((line: string, i: number) => {
            const trimmed = line.trim()
            if (trimmed === '---') {
              return <hr key={i} className="my-4 border-border" />
            }
            if (trimmed === '') {
              return <div key={i} className="h-2" />
            }
            if (trimmed.startsWith('# ')) {
              return <h1 key={i} className="text-2xl font-bold mt-6 mb-3">{trimmed.slice(2)}</h1>
            }
            if (trimmed.startsWith('## ')) {
              return <h2 key={i} className="text-xl font-semibold mt-5 mb-2">{trimmed.slice(3)}</h2>
            }
            if (trimmed.startsWith('### ')) {
              return <h3 key={i} className="text-lg font-semibold mt-4 mb-1">{trimmed.slice(4)}</h3>
            }
            if (trimmed.startsWith('- ')) {
              return <li key={i} className="ml-4 list-disc">{trimmed.slice(2)}</li>
            }
            return <p key={i} className="my-1">{trimmed}</p>
          })}
        </div>
      </LegalLayout>
  )
}
