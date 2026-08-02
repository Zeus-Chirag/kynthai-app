'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';
import { KynthaiBrand } from '@/components/kynthai/logo';
import { TurnstileWidget } from '@/components/kynthai/turnstile-widget';

export default function AdminLoginClient() {
  const navRouter = useRouter();
  const { login } = useAppStore();
  const [mounted, setMounted] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  // ── SECURITY: Cloudflare Turnstile (active only when the site key is set) ──
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
  const [captchaToken, setCaptchaToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (turnstileSiteKey && !captchaToken) {
      setError('Please complete the human verification before signing in.');
      return;
    }

    setLoading(true);

    try {
      // Get CSRF token
      let csrfToken = document.cookie.match(/kynthai-csrf=([^;]+)/)?.[1];
      if (!csrfToken) {
        const csrfRes = await fetch('/api/auth/csrf', { credentials: 'include' });
        const csrfData = await csrfRes.json();
        csrfToken = csrfData.token;
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, captchaToken: captchaToken || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
        return;
      }

      if (data.role !== 'admin') {
        setError('This account does not have admin access.');
        return;
      }

      login({
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        subscriptionTier: data.subscriptionTier,
      });

      navRouter.replace('/admin');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-teal-50 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/20 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <KynthaiBrand iconSize={36} />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Admin Portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in with your admin credentials
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@kynthai.app"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {turnstileSiteKey && (
            <div className="flex justify-center">
              <TurnstileWidget
                siteKey={turnstileSiteKey}
                onToken={setCaptchaToken}
                onExpire={() => setCaptchaToken(null)}
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Unauthorized access is prohibited and logged.
        </p>
      </div>
    </div>
  );
}
