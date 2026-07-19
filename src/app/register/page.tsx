import { LoginPage } from '@/components/kyntha/login-page'
import { ErrorBoundary } from '@/components/kyntha/error-boundary'

export default function RegisterRoute() {
  return (
    <ErrorBoundary>
      <LoginPage initialMode="register" />
    </ErrorBoundary>
  )
}
