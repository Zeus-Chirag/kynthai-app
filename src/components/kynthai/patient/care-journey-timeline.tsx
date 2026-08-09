'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Pill,
  FlaskConical,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Loader2,
  FileText as FileTextIcon,
  Stethoscope,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  id: string;
  type: 'prescription' | 'lab_booking' | 'appointment' | 'health_journal';
  date: string;
  status: string;
  details: Record<string, unknown>;
  actor: string;
}

interface CareJourneyTimelineProps {
  userId: string;
  isDemo: boolean;
}

type StatusConfig = {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
};

const STATUS_CONFIG: Record<string, StatusConfig> = {
  active: {
    label: 'Active',
    color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    icon: CheckCircle2,
  },
  pending: {
    label: 'Pending',
    color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    icon: Clock,
  },
  completed: {
    label: 'Completed',
    color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    icon: CheckCircle2,
  },
  sample_collected: {
    label: 'Sample Collected',
    color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
    icon: FlaskConical,
  },
  processing: {
    label: 'Processing',
    color: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
    icon: Loader2,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
    icon: AlertTriangle,
  },
  accepted: {
    label: 'Active',
    color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    icon: CheckCircle2,
  },
};

export function CareJourneyTimeline({ userId, isDemo }: CareJourneyTimelineProps) {
  const [timeline, setTimeline] = React.useState<TimelineEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    const fetchTimeline = async () => {
      try {
        if (isDemo) {
          setTimeline(getDemoTimeline());
          setStats({
            totalPrescriptions: 3,
            activePrescriptions: 2,
            totalLabBookings: 2,
            pendingLabTests: 1,
            completedLabTests: 1,
          });
          setLoading(false);
          return;
        }
        const res = await fetch('/api/care-workflow');
        if (res.ok) {
          const data = await res.json();
          setTimeline(data.timeline || []);
          setStats(data.stats || {});
        }
      } catch {
        /* ignore */
      }
      setLoading(false);
    };
    fetchTimeline();
  }, [userId, isDemo]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center text-muted-foreground">
          <FileTextIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No care events yet</p>
          <p className="text-xs mt-1">Prescriptions and lab tests will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label="Prescriptions"
          value={stats.activePrescriptions ?? 0}
          sub={`${stats.totalPrescriptions ?? 0} total`}
          tint="emerald"
        />
        <StatCard
          label="Lab Tests"
          value={stats.pendingLabTests ?? 0}
          sub={`${stats.completedLabTests ?? 0} done`}
          tint="cyan"
        />
        <StatCard label="Total Events" value={timeline.length} sub="All time" tint="violet" />
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {timeline.map((event, i) => {
          const config: StatusConfig = (STATUS_CONFIG[event.status] ??
            STATUS_CONFIG.pending!) as StatusConfig;
          const StatusIcon = config.icon;
          const isRx = event.type === 'prescription';
          const isLab = event.type === 'lab_booking';
          const isAppt = event.type === 'appointment';
          const isJournal = event.type === 'health_journal';
          const accent = isRx
            ? 'bg-emerald-500/10 text-emerald-600'
            : isLab
              ? 'bg-cyan-500/10 text-cyan-600'
              : isAppt
                ? 'bg-violet-500/10 text-violet-600'
                : 'bg-amber-500/10 text-amber-600';
          const borderAccent = isRx
            ? 'border-l-emerald-500/40'
            : isLab
              ? 'border-l-cyan-500/40'
              : isAppt
                ? 'border-l-violet-500/40'
                : 'border-l-amber-500/40';
          const EvIcon = isRx ? Pill : isLab ? FlaskConical : isAppt ? Stethoscope : Activity;
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={cn('border-border/60', borderAccent)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', accent)}>
                      <EvIcon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">
                          {isRx
                            ? 'Prescription'
                            : isLab
                              ? 'Lab Test'
                              : isAppt
                                ? 'Appointment'
                                : 'Health Check-in'}
                        </p>
                        <Badge variant="secondary" className={cn('text-[10px] h-5', config.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isRx
                          ? `Dr. ${event.actor}`
                          : isJournal
                            ? 'Self-reported'
                            : event.actor}
                        {' · '}
                        {new Date(event.date).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      {isRx && Array.isArray(event.details.medications) && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {(event.details.medications as Array<{ name?: string }>)
                            .slice(0, 3)
                            .map((med, j) => (
                              <Badge key={j} variant="secondary" className="text-[10px]">
                                {med.name || 'Medication'}
                              </Badge>
                            ))}
                        </div>
                      )}
                      {isLab && Array.isArray(event.details.tests) && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {(event.details.tests as Array<{ name?: string }>)
                            .slice(0, 3)
                            .map((test, j) => (
                              <Badge key={j} variant="secondary" className="text-[10px]">
                                {test.name || 'Test'}
                              </Badge>
                            ))}
                        </div>
                      )}
                      {isAppt && (
                        <div className="mt-1.5">
                          <Badge variant="secondary" className="text-[10px] capitalize">
                            {(event.details.type as string) || 'video'}
                          </Badge>
                          {(event.details.reason as string) && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {event.details.reason as string}
                            </span>
                          )}
                        </div>
                      )}
                      {isJournal && Array.isArray(event.details.symptoms) && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {((event.details.symptoms as unknown[])?.length ?? 0) > 0 ? (
                            (event.details.symptoms as string[]).slice(0, 3).map((s, j) => (
                              <Badge key={j} variant="secondary" className="text-[10px]">
                                {s}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              {event.details.mood
                                ? `Mood: ${String(event.details.mood)}`
                                : 'Check-in recorded'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tint,
}: {
  label: string;
  value: number;
  sub: string;
  tint: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    cyan: 'text-cyan-600 dark:text-cyan-400',
    violet: 'text-violet-600 dark:text-violet-400',
  };
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <p className={cn('text-lg font-bold', colorMap[tint])}>{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground/70">{sub}</p>
      </CardContent>
    </Card>
  );
}

function getDemoTimeline(): TimelineEvent[] {
  return [
    {
      id: 'demo-rx-1',
      type: 'prescription',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      actor: 'Rajesh Kumar',
      details: {
        medications: [{ name: 'Metformin 500mg' }, { name: 'Atorvastatin 10mg' }],
      },
    },
    {
      id: 'demo-lab-1',
      type: 'lab_booking',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed',
      actor: 'MediTest Labs',
      details: {
        tests: [{ name: 'Blood Sugar' }, { name: 'Lipid Profile' }],
      },
    },
    {
      id: 'demo-appt-1',
      type: 'appointment',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed',
      actor: 'Dr. Rajesh Kumar',
      details: {
        type: 'video',
        reason: 'Follow-up on blood sugar',
        scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
    {
      id: 'demo-journal-1',
      type: 'health_journal',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'recorded',
      actor: 'Self',
      details: {
        symptoms: [],
        mood: 'good',
        vitals: null,
        notes: 'Felt good today',
      },
    },
  ];
}
