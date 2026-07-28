'use client'

import { KynthaiBrand } from '@/components/kynthai/logo'

export default function LoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <KynthaiBrand iconSize={40} />
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        <p className="text-sm text-muted-foreground animate-pulse">Signing you in…</p>
      </div>
    </div>
  )
}
