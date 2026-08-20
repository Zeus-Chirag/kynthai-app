// Server wrapper — renders the Client Component.
// The component reads the secret `?key=` URL parameter client-side via useSearchParams.
import AdminLoginClient from './admin-login-client';
import { ErrorBoundary } from '@/components/kynthai/error-boundary';

export default function AdminLoginPage() {
  return (
    <ErrorBoundary>
      <AdminLoginClient />
    </ErrorBoundary>
  );
}
