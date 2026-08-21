import { Spinner } from '@/components/kynthai/spinner'
import { KynthaiBrand } from '@/components/kynthai/logo'

/**
 * AppLoader — single consistent full-page loading state for the whole app.
 *
 * Uses a JavaScript-animated canvas spinner (not CSS) to guarantee
 * it spins on ALL browsers including mobile Safari.
 */
export function AppLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4" role="status" aria-label={label}>
        <KynthaiBrand iconSize={40} />
        <Spinner size={40} color="#10b981" />
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="sr-only">{label}</span>
      </div>
    </div>
  )
}
