import { Metadata } from 'next'
import { LegalLayout } from '@/components/kynthai/legal/privacy-policy'
import nppData from './npp-content.json'

export const metadata: Metadata = {
  title: 'Privacy Practices | Kynthai',
  description: 'How Kynthai collects, uses, and protects your health data.',
}

export default function PrivacyPracticesPage() {
  const lines = (nppData.content as string).split('\n')
  return (
    <LegalLayout
        title="Privacy Practices"
        subtitle="How Kynthai uses, discloses, and protects your sensitive health data under applicable US consumer privacy laws."
        updated={nppData.effectiveDate as string}
      >
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 mb-6">
          <p className="text-sm text-emerald-800 dark:text-emerald-200">
            <strong>Our privacy practices</strong> — This page summarizes how Kynthai
            collects, uses, and protects your health data. Kynthai is not a HIPAA-covered
            entity or business associate and does not claim HIPAA compliance. For the full
            details, please read our{' '}
            <a href="/privacy" className="underline ml-1">Privacy Policy</a>.
            Questions? Contact our privacy officer at{' '}
            <a href="mailto:privacy@kynthai.app" className="underline ml-1">privacy@kynthai.app</a>.
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
