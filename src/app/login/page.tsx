import { LoginPage } from '@/components/kynthaii/login-page'
import { ErrorBoundary } from '@/components/kynthaii/error-boundary'

export default function LoginRoute() {
  return (
    <ErrorBoundary>
      <LoginPage />
    </ErrorBoundary>
  )
}
