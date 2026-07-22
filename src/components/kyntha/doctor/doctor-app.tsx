'use client';

import * as React from 'react';
import { Stethoscope, ShieldCheck, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppStore, type AuthUser } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { DoctorVerification } from './doctor-verification';
import { DoctorDashboard } from './doctor-dashboard';

type ProfileState = 'loading' | 'none' | 'pending' | 'verified' | 'rejected';

interface DoctorProfile {
  id: string;
  specialization: string;
  licenseNumber: string;
  experience: number;
  consultationFee: number;
  city: string;
  bio: string;
  videoCallEnabled: boolean;
  verified: boolean;
  rejectionReason?: string | null;
}

// Demo profile used when a user signs in via the "Doctor demo" button on
// the login page. Lets investors / owners explore the dashboard without
// having to go through real verification.
const DEMO_PROFILE: DoctorProfile = {
  id: 'demo_doctor_profile',
  specialization: 'Family Medicine',
  licenseNumber: 'USMD-DEMO-001',
  experience: 12,
  consultationFee: 100,
  city: 'Austin, TX',
  bio: 'Demo doctor account for product exploration.',
  videoCallEnabled: true,
  verified: true,
};

export function DoctorApp({ user }: { user: AuthUser }) {
  const { toast } = useToast();
  const { setScreen } = useAppStore();
  const router = useRouter();
  const isDemo = !!user.isDemo;
  const [state, setState] = React.useState<ProfileState>('loading');
  const [profile, setProfile] = React.useState<DoctorProfile | null>(null);

  const load = React.useCallback(async () => {
    setState('loading');
    // Demo login: skip backend entirely so the dashboard renders.
    if (user.isDemo) {
      setProfile(DEMO_PROFILE);
      setState('verified');
      return;
    }
    try {
      const res = await fetch(`/api/doctors?userId=${encodeURIComponent(user.id)}`);
      if (res.status === 404) {
        setState('none');
        return;
      }
      if (!res.ok) throw new Error('Failed to load profile');
      const data = await res.json();
      setProfile(data);
      if (data.verified) setState('verified');
      else if (data.rejectionReason) setState('rejected');
      else setState('pending');
    } catch {
      // No backend table yet — fall back to "none" so the form is shown.
      setState('none');
    }
  }, [user.id, user.isDemo]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium text-foreground">Loading your dashboard</p>
          <p className="text-sm text-muted-foreground">
            Preparing verification status and schedules…
          </p>
        </div>
      </div>
    );
  }

  if (state === 'none' || state === 'rejected') {
    return (
      <DoctorVerification
        user={user}
        existing={profile}
        onSubmitted={() => {
          toast({
            title: 'Application submitted',
            description: 'Our team will review your profile within 24-48 hours.',
          });
          load();
        }}
      />
    );
  }

  if (state === 'pending') {
    return (
      <PendingState
        user={user}
        onRefresh={load}
        onLogout={() => {
          router.push('/');
        }}
      />
    );
  }

  if (profile) return <DoctorDashboard user={user} profile={profile} />;

  return null;
}

function PendingState({
  user,
  onRefresh,
  onLogout,
}: {
  user: AuthUser;
  onRefresh: () => void;
  onLogout: () => void;
}) {
  const isDemo = !!user.isDemo;
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-amber-50/50 via-background to-background dark:from-amber-950/20">
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <Badge
            variant="secondary"
            className="mb-3 bg-amber-500/10 text-amber-600 dark:text-amber-400"
          >
            Verification in progress
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight">
            Hi Dr. {isDemo ? 'Guest' : (user.name?.split(' ').slice(-1)[0] ?? 'Doctor')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Thanks for submitting your details. Our admin team is reviewing your profile and
            documents. You&apos;ll receive an email once approved (usually within 24-48 hours).
          </p>

          <Card className="mt-6 w-full border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Stethoscope className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-left text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground mb-1">What happens next?</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Admin verifies your license & documents</li>
                    <li>You&apos;ll get an email once approved</li>
                    <li>Dashboard unlocks — start seeing patients</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex w-full gap-2">
            <Button variant="outline" className="flex-1" onClick={onRefresh}>
              Refresh status
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={onLogout}
            >
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
