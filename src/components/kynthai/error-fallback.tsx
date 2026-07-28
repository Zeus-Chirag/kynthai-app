'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AuthErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border border-red-200 bg-white/80 p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-600" />
        <h2 className="text-2xl font-bold">Authentication Error</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || 'Something went wrong during sign in'}
        </p>
        <Button 
          onClick={reset}
          className="mt-6"
          variant="default"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    </div>
  )
}
