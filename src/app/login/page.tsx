import { LoginPage } from '@/components/kynthai/login-page'
import { ErrorBoundary } from '@/components/kynthai/error-boundary'

export default async function LoginRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  return (
    <ErrorBoundary>
      <LoginPage initialDemo={params?.demo === '1'} />
    </ErrorBoundary>
  )
}
