'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Home, Search, ArrowLeft, HeartPulse } from 'lucide-react'
import { KynthaiBrand } from '@/components/kynthai/logo'
import { useRouter } from 'next/navigation'
import { ErrorBoundary } from '@/components/kynthai/error-boundary'

export default function NotFound() {
  const router = useRouter()

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <KynthaiBrand />
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
              <span className="text-5xl font-bold text-emerald-500">404</span>
            </div>
            <h2 className="text-2xl font-bold">Page not found</h2>
            <p className="text-muted-foreground">
              The page you're looking for doesn't exist or has been moved.
            </p>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" type="button" onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button
                onClick={() => router.push('/')}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  )
}
