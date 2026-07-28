import { Metadata } from 'next'
import { LegalLayout } from '@/components/kynthai/legal/privacy-policy'

export const metadata: Metadata = {
  title: 'Patient Rights Statement | Kynthai',
  description: 'Your rights as a Kynthai platform user — patients, family members, caretakers, and designees.',
}

const RIGHTS = [
  {
    num: '1',
    title: 'Nondiscrimination',
    text: 'You have the right to receive services without discrimination on the basis of race, color, national origin, sex, age, disability, religion, sexual orientation, gender identity, genetic information, or ability to pay.',
  },
  {
    num: '2',
    title: 'Information About Your Rights',
    text: 'You have the right to be informed of your rights and responsibilities as a platform user in a language you can understand. This statement and the Notice of Privacy Practices are available at kynthai.app/patient-rights and kynthai.app/privacy-practices.',
  },
  {
    num: '3',
    title: 'Participation in Care Decisions',
    text: 'You have the right to participate in decisions regarding your healthcare, including consenting to or declining services. AI-generated content on Kynthai is advisory only and does not constitute medical advice.',
  },
  {
    num: '4',
    title: 'Privacy and Confidentiality',
    text: 'You have the right to privacy and confidentiality of your health information. sensitive health data will only be shared for TPO purposes or with your explicit written authorization.',
  },
  {
    num: '5',
    title: 'Access to Your Health Information',
    text: 'You have the right to inspect and obtain a copy of your health information via Profile > Data Export or by emailing privacy@kynthai.app. Requests are fulfilled within 30 days.',
  },
  {
    num: '6',
    title: 'Right to Amend Your Records',
    text: 'You have the right to request amendment of inaccurate or incomplete sensitive health data. Submit via Profile > Settings or email privacy@kynthai.app.',
  },
  {
    num: '7',
    title: 'Right to an Accounting of Disclosures',
    text: 'You have the right to request an accounting of disclosures of your sensitive health data made by Kynthai for the six years preceding your request. Submit to privacy@kynthai.app.',
  },
  {
    num: '8',
    title: 'Right to File a Complaint',
    text: 'You have the right to file a complaint with Kynthai or with the U.S. Department of Health and Human Services Office for Civil Rights without retaliation. Contact privacy@kynthai.app or HHS OCR at hhs.gov/ocr/privacy.',
  },
  {
    num: '9',
    title: 'Right to Restrict Disclosures',
    text: 'You have the right to request restrictions on uses and disclosures of your sensitive health data for TPO. Requests must be submitted in writing to privacy@kynthai.app.',
  },
  {
    num: '10',
    title: 'Right to Choose Communications',
    text: 'You have the right to request that Kynthai communicate with you by alternative means or at alternative locations.',
  },
  {
    num: '11',
    title: 'Right to Opt Out of Marketing',
    text: 'You have the right to opt out of receiving marketing communications from Kynthai. Use the unsubscribe link in any marketing email or update preferences in Profile.',
  },
  {
    num: '12',
    title: 'Right to Be Free from Retaliation',
    text: 'You will not be retaliated against for exercising any of these rights or for filing a complaint about our privacy practices.',
  },
]

export default function PatientRightsPage() {
  return (
    <LegalLayout
        title="Patient Rights Statement"
        subtitle="Your rights as a Kynthai platform user — patients, family members, caretakers, and designees."
        updated="July 13, 2026"
      >
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 mb-6">
          <p className="text-sm text-emerald-800 dark:text-emerald-200">
            <strong>Full rights statement:</strong> Kynthai Health Technologies is committed to
            providing a respectful, safe, and transparent experience. These rights apply equally
            to patients, family members, caretakers, and legally authorized designees.
            Questions? Contact privacy@kynthai.app.
          </p>
        </div>
        <div className="space-y-4">
          {RIGHTS.map((right) => (
            <div key={right.num} className="rounded-xl border border-border/60 bg-muted/10 p-5">
              <h3 className="text-base font-semibold text-foreground">
                <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-sm text-emerald-700 dark:text-emerald-300">
                  {right.num}
                </span>
                {right.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{right.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-xl border border-border/60 bg-muted/20 p-5 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Need help exercising these rights?</p>
          <p className="mt-1">
            privacy officer:{' '}
            <a href="mailto:privacy@kynthai.app" className="text-emerald-600 underline">
              privacy@kynthai.app
            </a>{' '}
            · HHS OCR: hhs.gov/ocr/privacy · 1-800-368-1019
          </p>
        </div>
      </LegalLayout>
  )
}
