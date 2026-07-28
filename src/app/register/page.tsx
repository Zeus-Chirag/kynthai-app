import { LoginPage } from '@/components/kynthai/login-page'
import { ErrorBoundary } from '@/components/kynthai/error-boundary'

export default function RegisterRoute() {
  return (
    <ErrorBoundary>
      <LoginPage initialMode="register" />
    </ErrorBoundary>
  )
}
