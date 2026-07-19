// Server wrapper — renders the Client Component.
// The component reads the secret `?key=` URL parameter client-side via useSearchParams.
import AdminLoginClient from './admin-login-client';

export default function AdminLoginPage() {
  return <AdminLoginClient />;
}
