import { Metadata } from 'next'

const GRIEVANCE_EMAIL = 'privacy@kynthai.app'

export const metadata: Metadata = {
  title: 'Grievance',
  description: 'Submit a grievance, complaint, or escalation to Kynthai support.',
}

export default function GrievancePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Grievance</h1>
      <p className="mt-3 text-muted-foreground">
        If you have an unresolved issue with Kynthai, you can escalate it here. Our team reviews all submissions.
      </p>
      <div className="mt-8 rounded-2xl border border-border/60 bg-muted/20 p-6">
        <h2 className="text-lg font-semibold">How to submit</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Email us at <span className="font-medium text-foreground">{GRIEVANCE_EMAIL}</span> with subject{' '}
            <span className="font-medium text-foreground">Grievance - Please describe your issue</span>.
          </li>
          <li>Include your account email and what happened.</li>
          <li>We respond within 5 business days.</li>
        </ul>
      </div>
    </div>
  )
}
