'use client';

/**
 * PrescriptionsCard — Patient-side view of prescriptions from their doctor.
 *
 * This completes the Doctor↔Patient loop:
 *   Doctor prescribes → patient sees it here → accepts → meds appear in Meds tab
 *   → patient takes/skips → doctor sees adherence → doctor nudges → follow-up.
 *
 * For demo users, renders a sample pending prescription so the loop is
 * visible without a real backend session.
 */

import * as React from 'react';
import {
  Stethoscope,
  Pill,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Prescription {
  id: string;
  doctorName: string;
  specialization?: string;
  medications: { name: string; dosage: string; frequency?: string }[];
  notes?: string | null;
  inviteStatus: 'sent' | 'accepted' | 'expired';
  inviteToken?: string;
  followUpDate?: string | null;
  createdAt: string;
}

const DEMO_PRESCRIPTIONS: Prescription[] = [
  {
    id: 'demo-rx-1',
    doctorName: 'Dr. Anjali Mehta',
    specialization: 'General Physician',
    medications: [
      { name: 'Metformin', dosage: '500mg', frequency: '2x daily' },
      { name: 'Atorvastatin', dosage: '10mg', frequency: 'At bedtime' },
    ],
    notes: 'Take with meals. Follow-up in 2 weeks to check blood sugar.',
    inviteStatus: 'sent',
    inviteToken: 'demo-token-1',
    followUpDate: new Date(Date.now() + 14 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
];

export function PrescriptionsCard({
  isDemo,
  onAcceptDemo,
}: {
  isDemo: boolean;
  onAcceptDemo?: () => void;
}) {
  const { toast } = useToast();
  const [prescriptions, setPrescriptions] = React.useState<Prescription[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [accepting, setAccepting] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    if (isDemo) {
      setPrescriptions(DEMO_PRESCRIPTIONS);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/prescriptions', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setPrescriptions(data);
    } catch {
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  React.useEffect(() => {
    load();
  }, [load]);

  const accept = async (rx: Prescription) => {
    setAccepting(rx.id);
    if (isDemo) {
      // Demo: mark as accepted locally + add meds to the Meds tab via callback
      setPrescriptions(prev =>
        prev.map(p => (p.id === rx.id ? { ...p, inviteStatus: 'accepted' } : p))
      );
      toast({
        title: 'Prescription accepted',
        description: `${rx.medications.length} medication(s) added to your Meds list.`,
      });
      onAcceptDemo?.();
      setAccepting(null);
      return;
    }
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rx.inviteToken }),
      });
      if (!res.ok) throw new Error('Accept failed');
      setPrescriptions(prev =>
        prev.map(p => (p.id === rx.id ? { ...p, inviteStatus: 'accepted' } : p))
      );
      toast({
        title: 'Prescription accepted',
        description: `${rx.medications.length} medication(s) added to your Meds list.`,
      });
    } catch {
      toast({ title: 'Accept failed', description: 'Try again later.', variant: 'destructive' });
    } finally {
      setAccepting(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-4 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Checking for prescriptions…</span>
        </CardContent>
      </Card>
    );
  }

  if (prescriptions.length === 0) return null;

  const pending = prescriptions.filter(p => p.inviteStatus === 'sent');
  const accepted = prescriptions.filter(p => p.inviteStatus === 'accepted');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-emerald-600" />
          From your doctor
        </h2>
        {pending.length > 0 && (
          <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
            {pending.length} new
          </Badge>
        )}
      </div>

      {pending.map(rx => (
        <Card key={rx.id} className="ring-1 ring-amber-500/30">
          <CardContent className="p-4 space-y-3">
            {/* Doctor info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm">
                  {rx.doctorName.replace(/^Dr\.\s*/, '')[0] ?? 'D'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{rx.doctorName}</p>
                <p className="text-xs text-muted-foreground">
                  {rx.specialization || 'Provider'} · {timeAgo(rx.createdAt)}
                </p>
              </div>
              <Badge
                variant="secondary"
                className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px]"
              >
                <Clock className="h-3 w-3" />
                Pending
              </Badge>
            </div>

            <Separator />

            {/* Medications */}
            <div className="space-y-1.5">
              {rx.medications.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Pill className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-medium">{m.name}</span>
                  <span className="text-muted-foreground">{m.dosage}</span>
                  {m.frequency && (
                    <span className="text-xs text-muted-foreground">· {m.frequency}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Notes */}
            {rx.notes && (
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2.5">
                {rx.notes}
              </p>
            )}

            {/* Follow-up */}
            {rx.followUpDate && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Follow-up:{' '}
                {new Date(rx.followUpDate).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
            )}

            {/* Actions */}
            <Button
              onClick={() => accept(rx)}
              disabled={accepting === rx.id}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
              size="sm"
            >
              {accepting === rx.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Accepting…
                </>
              ) : (
                <>Accept prescription</>
              )}
            </Button>
          </CardContent>
        </Card>
      ))}

      {accepted.map(rx => (
        <Card key={rx.id} className="opacity-80">
          <CardContent className="p-3 flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{rx.doctorName}</p>
              <p className="text-[11px] text-muted-foreground">
                {rx.medications.length} med(s) · accepted {timeAgo(rx.createdAt)}
              </p>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
            >
              Active
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
