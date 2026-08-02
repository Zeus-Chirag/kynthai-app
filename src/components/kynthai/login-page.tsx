'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Users,
  HeartPulse,
  Stethoscope,
  Microscope,
  Lock,
  Sparkles,
  UserCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAppStore, selectors, type AuthUser, type LoginPortal } from '@/lib/store';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { KynthaiBrand } from './logo';
import { FadeIn } from './animations';
import { TurnstileWidget } from './turnstile-widget';

interface PortalConfig {
  id: LoginPortal;
  label: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}

const PORTALS: PortalConfig[] = [
  {
    id: 'caretaker',
    label: 'Family',
    tagline: 'Manage up to 4 family members',
    icon: Users,
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'patient',
    label: 'Patient',
    tagline: 'Your personal health companion',
    icon: HeartPulse,
    gradient: 'from-emerald-500 to-emerald-700',
  },
  {
    id: 'doctor',
    label: 'Doctor',
    tagline: 'Verified practitioners',
    icon: Stethoscope,
    gradient: 'from-teal-500 to-emerald-600',
  },
  {
    id: 'lab',
    label: 'Lab',
    tagline: 'Diagnostic partners',
    icon: Microscope,
    gradient: 'from-teal-500 to-teal-700',
  },
];

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )kynthai-csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]!) : null;
}

async function apiCall(path: string, body: Record<string, unknown>) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const url = `/api${path.startsWith('/auth') ? path : path}`;

  let token = getCsrfToken();
  if (!token) {
    await fetch(`/api/auth/csrf`, { method: 'GET', credentials: 'include' });
    token = getCsrfToken();
  }
  if (token) headers['X-CSRF-Token'] = token;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export function LoginPage({
  initialMode = 'signin',
}: { initialMode?: 'signin' | 'register' } = {}) {
  const loginPortal = useAppStore(selectors.loginPortal);
  const setLoginPortal = useAppStore((s) => s.setLoginPortal);
  const login = useAppStore((s) => s.login);
  const setScreen = useAppStore((s) => s.setScreen);
  const user = useAppStore(selectors.user);
  const router = useRouter();
  const { toast } = useToast();

  const [mode, setMode] = React.useState<'signin' | 'register'>(initialMode);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [dateOfBirth, setDateOfBirth] = React.useState('');
  const [termsConsent, setTermsConsent] = React.useState(false);
  const [dataConsent, setDataConsent] = React.useState(false);
  const [aiTrainingConsent, setAiTrainingConsent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [invitesLoading, setInvitesLoading] = React.useState(false);
  const [emergencyContact1, setEmergencyContact1] = React.useState('');
  const [emergencyContact2, setEmergencyContact2] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  // ── SECURITY: Cloudflare Turnstile (active only when the site key is set) ────
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
  const [captchaToken, setCaptchaToken] = React.useState<string | null>(null);
  // ────────────────────────────────────────────────────────────────────────────
  const [pendingInvites, setPendingInvites] = React.useState<
    { id: string; invitedBy: string; relation: string }[]
  >([]);
  // ── COMPLIANCE: age-gate modal ──────────────────────────────────────────────
  // Blocks registration until the caller confirms they are 18+. Shown before the
  // form when mode is 'register'; dismissed by clicking "I am 18 or older".
  const [ageGateOpen, setAgeGateOpen] = React.useState(false);
  const [ageGateDismissed, setAgeGateDismissed] = React.useState(false);
  // ────────────────────────────────────────────────────────────────────────────

  // ── COMPLIANCE: auto-show age-gate when user switches to registration ─────
  React.useEffect(() => {
    if (mode === 'register' && !ageGateDismissed) {
      setAgeGateOpen(true);
    }
    if (mode === 'signin') {
      setAgeGateOpen(false);
    }
  }, [mode, ageGateDismissed]);

  // Turnstile tokens are single-use — discard any minted token when the
  // mode flips so a stale one can never be reused for the other flow.
  React.useEffect(() => {
    setCaptchaToken(null);
  }, [mode]);
  // ───────────────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (user) {
      const targetScreen =
        user.role === 'patient'
          ? 'patient'
          : user.role === 'doctor'
            ? 'doctor'
            : user.role === 'lab'
              ? 'lab'
              : user.role === 'admin'
                ? 'admin'
                : 'caretaker';
      router.push(`/${targetScreen}`);
    }
  }, [user, router]);

  const portalEmpathy: Record<LoginPortal, string> = {
    caretaker: 'Keep the whole family on track with shared reminders.',
    patient: 'Your personal health companion, always on.',
    doctor: 'See patients faster with smarter scheduling.',
    lab: 'More bookings, less paperwork.',
    admin: 'Monitor quality, safety, and growth.',
  };
  const visiblePortals = PORTALS;
  const active: PortalConfig = visiblePortals.find(p => p.id === loginPortal) ?? PORTALS[0]!;

  async function submit(e: React.FormEvent) {
    logger.debug('Login submit', { email, hasPassword: !!password?.length, mode, loginPortal });
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: 'Missing details',
        description: 'Email and password are required.',
        variant: 'destructive',
      });
      return;
    }
    if (
      mode === 'register' &&
      (!name ||
        !dateOfBirth ||
        !termsConsent ||
        !dataConsent ||
        !aiTrainingConsent ||
        ((active.id === 'patient' || active.id === 'caretaker') && !emergencyContact1))
    ) {
      toast({
        title: 'Almost there',
        description: !aiTrainingConsent
          ? 'Please accept the AI training consent, add your name, date of birth, accept the checkboxes, and provide an emergency contact.'
          : 'Please add your name, date of birth, accept the consent checkboxes, and provide an emergency contact.',
        variant: 'destructive',
      });
      return;
    }

    if (turnstileSiteKey && !captchaToken) {
      toast({
        title: 'Security check required',
        description: 'Please complete the human verification before continuing.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        await apiCall('/auth/register', {
          email,
          password,
          name,
          role: active.id,
          phone: phone || undefined,
          dateOfBirth: dateOfBirth || undefined,
          consentAccepted: termsConsent,
          dataProcessingConsent: dataConsent,
          aiTrainingConsent,
          captchaToken: captchaToken || undefined,
        });
        toast({ title: 'Account created', description: 'Welcome to Kynthai!' });
      }

      const data = await apiCall('/auth/login', { email, password, captchaToken: captchaToken || undefined });
      const user: AuthUser = {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        phone: data.phone,
        subscriptionTier: data.subscriptionTier,
        isDemo: data.isDemo,
        // COMPLIANCE: include runtime flag from login response (undefined = false for older accounts)
        isUserMinor: Boolean((data as { isUserMinor?: boolean }).isUserMinor),
      };
      login(user);

      if (mode === 'signin') {
        setInvitesLoading(true);
        try {
          const invRes = await fetch('/api/family/invite', { credentials: 'include' });
          if (invRes.ok) {
            const invites = await invRes.json();
            setPendingInvites(invites);
            if (invites.length > 0) {
              toast({
                title: `You have ${invites.length} pending invite${invites.length > 1 ? 's' : ''}`,
                description: invites
                  .map(
                    (i: { invitedBy: string; relation: string }) => `${i.invitedBy} (${i.relation})`
                  )
                  .join(', '),
                duration: 6000,
              });
            }
          }
        } catch {
          // Ignore
        } finally {
          setInvitesLoading(false);
        }
      }

      toast({
        title:
          mode === 'signin'
            ? `Welcome back, ${user.name}`
            : `Account created — welcome, ${user.name}`,
        description: `You're signed in to the ${active.label} portal.`,
      });
    } catch (err) {
      toast({
        title: mode === 'signin' ? 'Sign in failed' : 'Registration failed',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div
          className="absolute -top-40 left-1/2 h-[40rem] sm:w-[40rem] w-full -translate-x-1/2 rounded-full opacity-40 blur-3xl"
          style={{
            background: 'radial-gradient(closest-side, rgba(16,185,129,0.35), transparent 70%)',
          }}
        />
      </div>

      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <KynthaiBrand />
          <button
            onClick={() => router.push('/')}
            className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
          >
            Home
          </button>
        </div>

        <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-2 lg:gap-16">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {portalEmpathy[loginPortal]}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {active.label} portal — sign in or create an account to continue.
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:max-w-md">
              {visiblePortals.map(p => (
                <button
                  key={p.id}
                  onClick={() => setLoginPortal(p.id)}
                  aria-current={loginPortal === p.id ? 'page' : undefined}
                  className={cn(
                    'flex flex-col items-center gap-3 rounded-2xl border p-4 text-center transition-all',
                    loginPortal === p.id
                      ? 'border-emerald-500 shadow-lg shadow-emerald-500/10'
                      : 'border-border hover:border-emerald-500/50'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow',
                      p.gradient
                    )}
                  >
                    <p.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold">{p.label}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.tagline}</p>
                </button>
              ))}
            </div>
          </div>

          <FadeIn delay={0.1}>
            <Card className="overflow-hidden border-emerald-500/20 shadow-xl shadow-emerald-900/5">
              <CardContent className="p-6 sm:p-8">
                {pendingInvites.length > 0 && (
                  <div className="mb-5 space-y-2">
                    {pendingInvites.map(inv => (
                      <div
                        key={inv.id}
                        className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <Users className="h-4 w-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {inv.invitedBy} invited you as{' '}
                            <span className="text-emerald-600">{inv.relation}</span>
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const csrf = await fetch('/api/auth/csrf', { credentials: 'include' })
                                .then(r => r.json())
                                .then(d => d.token);
                              const res = await fetch('/api/family/invite', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'X-CSRF-Token': csrf,
                                },
                                credentials: 'include',
                                body: JSON.stringify({ action: 'accept', inviteId: inv.id }),
                              });
                              if (res.ok) {
                                setPendingInvites(p => p.filter(i => i.id !== inv.id));
                                toast({
                                  title: 'Invite accepted!',
                                  description: `You're now part of ${inv.invitedBy}'s family.`,
                                });
                              } else {
                                const d = await res.json().catch(() => ({}));
                                toast({
                                  title: 'Could not accept invite',
                                  description: d.error || 'Please try again.',
                                  variant: 'destructive',
                                });
                              }
                            } catch {
                              toast({
                                title: 'Offline',
                                description: 'Re-connected, try again.',
                                variant: 'destructive',
                              });
                            }
                          }}
                          className="shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
                        >
                          Accept
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {invitesLoading && pendingInvites.length === 0 && (
                  <div className="mb-5 flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Checking for invites...
                  </div>
                )}

                <div className="mb-6 inline-flex rounded-full border border-border bg-muted/40 p-1">
                  <button
                    onClick={() => setMode('signin')}
                    className={cn(
                      'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
                      mode === 'signin'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      setMode('register');
                      setAgeGateDismissed(false);
                      setAgeGateOpen(true);
                    }}
                    className={cn(
                      'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
                      mode === 'register'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Create Account
                  </button>
                </div>

                <div className="mb-5 flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white',
                      active.gradient
                    )}
                  >
                    <active.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{active.label} portal</p>
                    <p className="text-xs text-muted-foreground">{active.tagline}</p>
                  </div>
                </div>

                {/* ── COMPLIANCE: age-gate modal — prevents under-18 registration ─── */}
                {ageGateOpen && !ageGateDismissed && (
                  <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-sm sm:items-center">
                    <Card className="my-auto w-full max-w-sm border-amber-500/30 shadow-xl">
                      <CardContent className="p-6 text-center space-y-4">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                          <ShieldCheck className="h-6 w-6 text-amber-600" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          Age verification required
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Kynthai is designed for users{' '}
                          <span className="font-semibold text-foreground">18 years or older</span>.
                          By proceeding, you confirm that you meet this age requirement.
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          If you are under 18, a parent or legal guardian must create and manage
                          your account through the{' '}
                          <span className="text-emerald-600">Family portal</span>.
                        </p>
                        <Button
                          type="button"
                          onClick={() => {
                            setAgeGateDismissed(true);
                            setAgeGateOpen(false);
                          }}
                          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow hover:from-emerald-600 hover:to-teal-700"
                        >
                          I am 18 or older — proceed
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
                {/* ───────────────────────────────────────────────────────────────────── */}

                <form id="login-form" onSubmit={submit} className="space-y-4">
                  {/* Registration fields - always rendered, hidden when mode === 'signin' */}
                  <div
                    className={cn('space-y-3.5', mode === 'register' ? 'block' : 'hidden')}
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Full name</Label>
                      <Input
                        id="name"
                        placeholder="Aarav Sharma"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        autoComplete="name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Phone (optional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        autoComplete="tel"
                      />
                      <p className="text-xs text-muted-foreground">
                        Used only for account security and care-team alerts.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="dob">
                        Date of birth <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="dob"
                        type="date"
                        value={dateOfBirth}
                        onChange={e => setDateOfBirth(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="emergency1">
                        Emergency contact 1 <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="emergency1"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={emergencyContact1}
                        onChange={e => setEmergencyContact1(e.target.value)}
                        autoComplete="tel"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="emergency2">Emergency contact 2 (optional)</Label>
                      <Input
                        id="emergency2"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={emergencyContact2}
                        onChange={e => setEmergencyContact2(e.target.value)}
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>

                  {/* Confirm password field - removed as per schema update */}

                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(s => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Consent checkboxes - always rendered to satisfy React 19 hooks rules */}
                  <div
                    className={cn(
                      'space-y-3 rounded-xl border border-border/60 bg-muted/30 p-3',
                      mode === 'register' ? 'block' : 'hidden'
                    )}
                  >
                    <label className="flex items-start gap-2.5">
                      <Checkbox
                        checked={termsConsent}
                        onCheckedChange={v => setTermsConsent(v === true)}
                        className="mt-0.5"
                      />
                      <span className="text-[13px] text-muted-foreground leading-relaxed">
                        I agree to the{' '}
                        <button
                          type="button"
                          onClick={() => router.push('/terms')}
                          className="font-medium text-emerald-600 underline"
                        >
                          Terms of Service
                        </button>{' '}
                        and{' '}
                        <button
                          type="button"
                          onClick={() => router.push('/privacy')}
                          className="font-medium text-emerald-600 underline"
                        >
                          Privacy Policy
                        </button>
                        .
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5">
                      <Checkbox
                        checked={dataConsent}
                        onCheckedChange={v => setDataConsent(v === true)}
                        className="mt-0.5"
                      />
                      <span className="text-[13px] text-muted-foreground leading-relaxed">
                        I consent to processing of my personal and health data under US health
                        data laws.{' '}
                        <span className="font-medium text-foreground">Privacy-first</span>.
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5">
                      <Checkbox
                        checked={aiTrainingConsent}
                        onCheckedChange={v => setAiTrainingConsent(v === true)}
                        className="mt-0.5"
                      />
                      <span className="text-[13px] text-muted-foreground leading-relaxed">
                        I consent to letting Kynthai use <em>de-identified</em> health data to
                        improve AI features. My personal data is never shared or identifiable. See
                        the{' '}
                        <button
                          type="button"
                          onClick={() => router.push('/privacy')}
                          className="font-medium text-emerald-600 underline"
                        >
                          Privacy Policy
                        </button>{' '}
                        for details.
                      </span>
                    </label>
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
                    id="login-submit-btn"
                    type="submit"
                    disabled={loading}
                    className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/25 hover:from-emerald-600 hover:to-teal-700"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {mode === 'signin' ? 'Sign In' : 'Create Account'}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </form>

                <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Data encrypted in transit &amp; at rest · Privacy-first
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
