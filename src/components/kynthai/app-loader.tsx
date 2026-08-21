import { KynthaiBrand } from '@/components/kynthai/logo'

/**
 * AppLoader — single consistent full-page loading state for the whole app.
 *
 * The app previously showed several MUTUALLY INCONSISTENT spinners depending
 * on where you were (root "Loading Kynthai…" with brand vs. bare portal
 * skeletons vs. inline `if(!user)` spinners), so navigating between portals
 * flashed two or three mismatched loading screens. Unify every full-page load
 * through this component so the brand, spinner, and copy are identical
 * everywhere.
 */
export function AppLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4" role="status" aria-label={label}>
        <KynthaiBrand iconSize={40} />
        <div
          className="h-10 w-10 rounded-full border-4 border-emerald-600 border-t-transparent"
          style={{
            animation: 'spin 1s linear infinite',
            willChange: 'transform',
            transform: 'translateZ(0)', // hardware acceleration for mobile
          }}
        />
        <p className="text-sm text-muted-foreground" style={{ animation: 'pulse 2s ease-in-out infinite' }}>
          {label}
        </p>
        <span className="sr-only">{label}</span>
      </div>
    </div>
  )
}
