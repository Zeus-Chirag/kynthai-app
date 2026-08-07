import { Suspense } from 'react'
import { ErrorBoundary } from '@/components/kynthai/error-boundary'
import { InviteClient } from './invite-client'

export const dynamic = 'force-dynamic'

function InviteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/20">
      <div className="text-sm text-muted-foreground">Loading prescription invite…</div>
    </div>
  )
}

export default function InvitePage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<InviteLoading />}>
        <InviteClient />
      </Suspense>
    </ErrorBoundary>
  )
}
