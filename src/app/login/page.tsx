import { LoginPage } from '@/components/kynthai/login-page'
import { ErrorBoundary } from '@/components/kynthai/error-boundary'

export default function LoginRoute() {
  return (
    <ErrorBoundary>
      <LoginPage />
    </ErrorBoundary>
  )
}
