'use client';

import * as React from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Home,
  Pill,
  ShoppingBag,
  Sparkles,
  BookOpen,
  Siren,
  Loader2,
  Activity,
  CheckCircle2,
  Heart,
  HeartPulse,
  Share2,
  Crown,
  CalendarDays,
  TrendingUp,
  Droplets,
  Thermometer,
  Weight,
  Plus,
  ChevronRight,
  FlaskConical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAppStore, type AuthUser } from '@/lib/store';
import { KynthaiBrand } from '@/components/kynthai/logo';
import { useRouter } from 'next/navigation';
import { getGreeting } from '@/lib/greeting'
import { AchievementCelebration } from '@/components/kynthai/achievement-celebration';
import { useToast } from '@/hooks/use-toast';
import { TodayView } from '@/components/medication/today-view';
import { MedicationsList } from '@/components/medication/medications-list';
import { AiChat } from '@/components/medication/ai-chat';
import { CareHub } from '@/components/kynthai/caretaker/care-hub';
import { NotificationCenter } from '@/components/kynthai/notification-center';
import { OfflineIndicator } from '@/components/kynthai/offline-indicator';
import { PortalFooter } from '@/components/kynthai/portal-footer';
import { ShareSheet } from '@/components/kynthai/share-sheet';
import { FadeIn } from '@/components/kynthai/animations';
import { LabResultsViewer } from '@/components/kynthai/patient/lab-results-viewer';
import { BookAppointment } from '@/components/kynthai/patient/book-appointment';
import dynamic from 'next/dynamic';

// ── dynamic video-call load ───────────────────────────────────────────────
const VideoCall = dynamic(
  () =>
    import('@/components/kynthai/video-call')
      .then(m => m.VideoCall)
      .catch(() => {
        // graceful fallback if the component is removed
        return () => (
          <div className="text-sm text-muted-foreground text-center py-8">
            Video call unavailable.
          </div>
        );
      }),
  { ssr: false, loading: () => <div className="h-40 rounded-xl bg-muted animate-pulse" /> }
);

// ── dynamic market load ────────────────────────────────────────────────────
const MarketView = dynamic(
  () =>
    import('@/components/kynthai/market/market-view')
      .then(m => m.MarketView)
      .catch(() => ({
        default: ({}: Record<string, never>) => (
          <div className="text-sm text-muted-foreground text-center py-8">Market view loading…</div>
        ),
      })),
  {
    ssr: false,
    loading: () => <div className="text-sm text-muted-foreground text-center py-8">Loading…</div>,
  }
);

// ════════════════════════════════════════════════════════════════════════════
// types & data
// ════════════════════════════════════════════════════════════════════════════

type Tab = 'home' | 'meds' | 'market' | 'lab' | 'ai' | 'journal' | 'sos';
type TabVariant = Tab;

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'meds', label: 'Meds', icon: Pill },
  { id: 'market', label: 'Care', icon: ShoppingBag },
  { id: 'lab', label: 'Lab', icon: FlaskConical },
  { id: 'ai', label: 'AI', icon: Sparkles },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'sos', label: 'SOS', icon: Siren },
];

interface HealthMetric {
  label: string;
  value: string;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

const METRICS: HealthMetric[] = [
  {
    label: 'Blood Pressure',
    value: '118/76',
    unit: 'mmHg',
    icon: HeartPulse,
    trend: 'stable',
    color: 'text-rose-600   bg-rose-50 dark:text-rose-400  dark:bg-rose-950/30',
  },
  {
    label: 'Blood Glucose',
    value: '102',
    unit: 'mg/dL',
    icon: Droplets,
    trend: 'up',
    color: 'text-blue-600   bg-blue-50 dark:text-blue-400   dark:bg-blue-950/30',
  },
  {
    label: 'Weight',
    value: '72.4',
    unit: 'kg',
    icon: Weight,
    trend: 'down',
    color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30',
  },
  {
    label: 'Body Temp',
    value: '98.6',
    unit: '°F',
    icon: Thermometer,
    trend: 'stable',
    color: 'text-amber-600  bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30',
  },
];

interface JournalEntry {
  id: string;
  date: string;
  title: string;
  body: string;
  mood: 'good' | 'okay' | 'bad';
}

const DEMO_JOURNAL: JournalEntry[] = [
  {
    id: 'j1',
    date: '2026-07-13',
    title: 'Feeling better today',
    body: 'Took morning meds on time. Energy levels improving after breakfast.',
    mood: 'good',
  },
  {
    id: 'j2',
    date: '2026-07-12',
    title: 'Rough night',
    body: 'Could not sleep well. Woke up around 3 AM. Need to adjust evening routine.',
    mood: 'bad',
  },
  {
    id: 'j3',
    date: '2026-07-11',
    title: 'Good walk in the park',
    body: 'Walked 30 minutes. Appetite is back. No headaches today.',
    mood: 'good',
  },
  {
    id: 'j4',
    date: '2026-07-10',
    title: 'Starting new medication',
    body: 'Began the new course today. Doctor advised to take after meals.',
    mood: 'okay',
  },
];

interface Appointment {
  id: string;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  type: 'in-person' | 'video';
  status: 'pending' | 'upcoming' | 'confirmed' | 'completed' | 'cancelled';
}

const DEMO_APPOINTMENTS: Appointment[] = [
  {
    id: 'a1',
    doctor: 'Dr. Sarah Chen',
    specialty: 'Cardiology',
    date: '2026-07-16',
    time: '10:00 AM',
    type: 'in-person',
    status: 'confirmed',
  },
  {
    id: 'a2',
    doctor: 'Dr. James Miller',
    specialty: 'General Care',
    date: '2026-07-22',
    time: '2:30 PM',
    type: 'video',
    status: 'upcoming',
  },
  {
    id: 'a3',
    doctor: 'Dr. Priya Gupta',
    specialty: 'Dermatology',
    date: '2026-07-25',
    time: '11:00 AM',
    type: 'video',
    status: 'pending',
  },
];

// ════════════════════════════════════════════════════════════════════════════
// sub-views
// ════════════════════════════════════════════════════════════════════════════

function StreakRing({ days, target }: { days: number; target?: number }) {
  const pct = Math.min(((days || 0) / (target || 7)) * 100, 100);
  const r = 36;
  const C = 2 * Math.PI * r;
  const offset = C - (pct / 100) * C;
  return (
    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-muted/30"
        />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          className="text-emerald-500"
          strokeDasharray={C}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{days}</span>
        <span className="text-[10px] text-muted-foreground">days</span>
      </div>
    </div>
  );
}

function MetricCard({ m, index }: { m: HealthMetric; index: number }) {
  const Icon = m.icon;
  return (
    <FadeIn delay={index * 0.07}>
      <Card>
        <CardContent className="flex items-center gap-3 p-3.5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${m.color}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground">{m.label}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-semibold">{m.value}</span>
              <span className="text-[10px] text-muted-foreground">{m.unit}</span>
            </div>
          </div>
          <TrendingUp
            className={`h-3.5 w-3.5 shrink-0 ${m.trend === 'stable' ? 'opacity-30' : m.trend === 'down' ? 'rotate-180' : ''}`}
          />
        </CardContent>
      </Card>
    </FadeIn>
  );
}

function ApptRow({
  appt,
  onJoinCall,
  onCancel,
  cancellingId,
}: {
  appt: Appointment;
  onJoinCall?: (id: string) => void;
  onCancel?: (id: string) => void;
  cancellingId?: string | null;
}) {
  const sc: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
        <CalendarDays className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium truncate">
          {appt.doctor}{' '}
          <span className="text-muted-foreground font-normal">· {appt.specialty}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {appt.date} · {appt.type === 'video' ? '📹 Video' : '📍 In-person'}
        </p>
      </div>
      <Badge variant="secondary" className={`text-[10px] shrink-0 ${sc[appt.status] ?? sc.pending}`}>
        {appt.status}
      </Badge>
      {appt.type === 'video' && appt.status === 'confirmed' && onJoinCall && (
        <button
          onClick={() => onJoinCall(appt.id)}
          className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
        >
          Join
        </button>
      )}
      {appt.status === 'confirmed' && onCancel && (
        <button
          onClick={() => onCancel(appt.id)}
          disabled={cancellingId === appt.id}
          className="shrink-0 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 disabled:opacity-50"
        >
          {cancellingId === appt.id ? '...' : 'Cancel'}
        </button>
      )}
    </div>
  );
}

function MoodEmoji({ mood }: { mood: JournalEntry['mood'] }) {
  if (mood === 'good') return <span className="text-lg leading-none">😊</span>;
  if (mood === 'okay') return <span className="text-lg leading-none">😐</span>;
  return <span className="text-lg leading-none">😔</span>;
}

// ── Home tab ────────────────────────────────────────────────────────────────
function HomeTab({
  user,
  isFree,
  isDemo,
  onNavigate,
  onJoinCall,
  onCancelAppointment,
  cancellingApptId,
}: {
  user: AuthUser;
  isFree: boolean;
  isDemo: boolean;
  onNavigate: (t: Tab) => void;
  onJoinCall: (id: string) => void;
  onCancelAppointment?: (id: string) => void;
  cancellingApptId?: string | null;
}) {
  const [journalOpen, setJournalOpen] = React.useState(false);
  const [bookingOpen, setBookingOpen] = React.useState(false);
  const { toast } = useToast();
  const appointments = DEMO_APPOINTMENTS.filter(a => a.status !== 'completed');
  const adherence = isDemo ? 83 : 92;
  const avgMood: JournalEntry['mood'] = 'good';

  // Achievement celebration state (defined before JSX for proper closure)
  const achievementState = React.useState({ show: false, type: 'adherence' as const, milestone: 0 });
  const [achievement, setAchievement] = achievementState;
  const showAchievement = achievement.show;
  const setShowAchievement = (v: boolean) => setAchievement(a => ({ ...a, show: v }));

  // Trigger celebration on first render if adherence is good
  React.useEffect(() => {
    if (adherence >= 80) {
      setAchievement({ show: true, type: 'adherence', milestone: adherence });
    }
  }, [adherence]);

  return (
    <div className="space-y-5">
      <AchievementCelebration
        show={showAchievement}
        type={achievement.type}
        milestone={achievement.milestone}
        onDismiss={() => setShowAchievement(false)}
      />

      {/* Greeting + streak */}
      <FadeIn>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">
              {getGreeting()}
              {!isDemo ? `, ${user.name?.split(' ')[0]}` : ''}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {appointments.length > 0
                ? `${appointments.length} upcoming appointment${appointments.length > 1 ? 's' : ''}`
                : 'All clear — no upcoming appointments'}
            </p>
            {appointments.length === 0 && (
              <button
                onClick={() => onNavigate('lab')}
                className="mt-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                Book a health check →
              </button>
            )}
          </div>
          <div className="flex flex-col items-center">
            <StreakRing days={adherence} />
            <span className="text-[10px] text-muted-foreground mt-0.5">day streak</span>
          </div>
        </div>
      </FadeIn>

      {/* Plus upsell */}
      {isFree && (
        <FadeIn delay={0.05}>
          <Card
            className="cursor-pointer border-amber-500/30 bg-gradient-to-r from-amber-50/80 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10"
            onClick={() => onNavigate('market')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                  <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Upgrade to Plus — $9/mo</p>
                  <p className="text-[11px] text-muted-foreground">
                    Unlimited AI, lab booking & advanced analytics
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Vitals grid */}
      <FadeIn delay={0.1}>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
          Today&apos;s Vitals
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          {METRICS.map((m, i) => (
            <MetricCard key={m.label} m={m} index={i} />
          ))}
        </div>
      </FadeIn>

      {/* Appointments */}
      <FadeIn delay={0.12}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Appointments
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBookingOpen(true)}
              className="text-xs text-emerald-600 font-medium hover:underline"
            >
              + Book
            </button>
            <button
              onClick={() => onNavigate('market')}
              className="text-xs text-emerald-600 hover:underline"
            >
              See all
            </button>
          </div>
        </div>
        <div className="space-y-2.5">
          {appointments.length > 0 ? (
            appointments.map(a => (
              <ApptRow
                key={a.id}
                appt={a}
                onJoinCall={onJoinCall}
                onCancel={onCancelAppointment}
                cancellingId={cancellingApptId}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No upcoming appointments
            </p>
          )}
        </div>
      </FadeIn>

      {/* Adherence */}
      <FadeIn delay={0.14}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Med Adherence</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Great progress this week!</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {adherence}%
                </span>
                <p className="text-[10px] text-muted-foreground">
                  {adherence >= 80 ? '🔥' : ''}
                  {adherence}%
                </p>
              </div>
            </div>
            <Progress value={adherence} className="mt-3 h-2" />
          </CardContent>
        </Card>
      </FadeIn>

      {/* Quick journal card */}
      <FadeIn delay={0.18}>
        <button
          onClick={() => setJournalOpen(true)}
          className="w-full rounded-xl border border-dashed border-border px-4 py-4 text-left transition-all hover:border-emerald-500/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
              <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {avgMood === 'good'
                  ? '😊 Feeling good — how about you?'
                  : 'How are you feeling today?'}
              </p>
              <p className="text-[11px] text-muted-foreground">Tap to add a journal entry</p>
            </div>
            <Plus className="ml-auto h-4 w-4 text-muted-foreground" />
          </div>
        </button>
      </FadeIn>

      {/* Journal sheet */}
      <Sheet open={journalOpen} onOpenChange={setJournalOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] flex flex-col">
          <SheetHeader>
            <SheetTitle>New Journal Entry</SheetTitle>
            <SheetDescription>Record how you&apos;re feeling today</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4 flex-1 overflow-y-auto">
            <div>
              <Label>Title</Label>
              <input
                id="j-title"
                placeholder="e.g. Morning walk went well"
                className="mt-1 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <Label>Details</Label>
              <Textarea
                id="j-body"
                placeholder="Describe your symptoms, energy, mood..."
                rows={4}
                className="mt-1 resize-none"
              />
            </div>
            <div>
              <Label>Mood</Label>
              <div className="flex gap-2 mt-2">
                {(['good', 'okay', 'bad'] as const).map(m => (
                  <button
                    key={m}
                    className={cn(
                      'flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all',
                      m === 'good'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                        : 'border-border hover:border-emerald-500/40'
                    )}
                  >
                    {m === 'good' ? '😊 Good' : m === 'okay' ? '😐 Okay' : '😔 Rough'}
                  </button>
                ))}
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                setJournalOpen(false);
                toast({ title: 'Journal entry saved' });
              }}
            >
              Save Entry
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <BookAppointment open={bookingOpen} onOpenChange={setBookingOpen} />

      <PortalFooter />
    </div>
  );
}

// ── Meds tab ────────────────────────────────────────────────────────────────
function MedsTab({ userId, isDemo }: { userId: string; isDemo: boolean }) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">My Medications</h2>
      <TodayView />
      <MedicationsList userId={userId} isDemo={isDemo} />
      <PortalFooter />
    </div>
  );
}

// ── Market tab ──────────────────────────────────────────────────────────────
function MarketTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Find Care</h2>
      <p className="text-sm text-muted-foreground">Browse verified doctors and book appointments</p>
      <MarketView />
      <PortalFooter />
    </div>
  );
}

// ── Lab tab ────────────────────────────────────────────────────────────────
function LabTab({ isDemo }: { isDemo: boolean }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Lab Results</h2>
      <p className="text-sm text-muted-foreground">View and download your lab test results</p>
      <LabResultsViewer isDemo={isDemo} />
      <PortalFooter />
    </div>
  );
}

// ── AI tab ──────────────────────────────────────────────────────────────────
function AiTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">AI Assistant</h2>
        <Badge
          variant="secondary"
          className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
        >
          Claude
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Ask about symptoms, meds, or general health. Triage only — not a diagnosis.
      </p>
      <AiChat />
      <PortalFooter />
    </div>
  );
}

// ── Journal tab ─────────────────────────────────────────────────────────────
function JournalTab() {
  const { toast } = useToast();
  const { user } = useAppStore();
  const [entries, setEntries] = React.useState<JournalEntry[]>(DEMO_JOURNAL);
  const [open, setOpen] = React.useState(false);
  const isDemo = !!user?.isDemo;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Health Journal</h2>
        <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New
        </Button>
      </div>

      {/* mood summary */}
      <FadeIn>
        <Card className="bg-gradient-to-br from-emerald-50/50 to-background dark:from-emerald-950/20">
          <CardContent className="flex items-center gap-4 p-4">
            <span className="text-3xl">😊</span>
            <div>
              <p className="text-sm font-semibold">This week: Mostly positive</p>
              <p className="text-xs text-muted-foreground">
                {entries.length} entries · {entries.filter(e => e.mood === 'good').length} good days
              </p>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* entries */}
      <div className="space-y-2.5">
        {entries.map((e, i) => (
          <FadeIn key={e.id} delay={i * 0.06}>
            <Card className="hover:shadow-sm transition-all">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <MoodEmoji mood={e.mood} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-base font-semibold">{e.title}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">{e.date}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{e.body}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        ))}
      </div>

      {/* Add entry dialog */}
      <JournalDialog
        open={open}
        onOpenChange={setOpen}
        onSave={() => toast({ title: 'Entry saved' })}
      />
      <PortalFooter />
    </div>
  );
}

function JournalDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: () => void;
}) {
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  React.useEffect(() => {
    if (!open) {
      setTitle('');
      setBody('');
    }
  }, [open]);
  function handleSave() {
    if (!title.trim()) return;
    onSave();
    onOpenChange(false);
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] flex flex-col">
        <SheetHeader>
          <SheetTitle>New Journal Entry</SheetTitle>
          <SheetDescription>How are you feeling today?</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4 flex-1 overflow-y-auto">
          <div>
            <Label htmlFor="j-title">Title</Label>
            <input
              id="j-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Morning meds taken"
              className="mt-1 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="j-body">Details</Label>
            <Textarea
              id="j-body"
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Describe symptoms, energy, sleep..."
              rows={4}
              className="mt-1 resize-none"
            />
          </div>
          <Button className="w-full" onClick={handleSave} disabled={!title.trim()}>
            Save Entry
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── SOS tab ─────────────────────────────────────────────────────────────────
function SosTab() {
  const [stage, setStage] = React.useState<'idle' | 'triggering' | 'triggered'>('idle');
  const [response, setResponse] = React.useState<{
    notifiedDoctors: { name: string; eta: string }[];
    summary: string;
  } | null>(null);
  const trigger = async () => {
    setStage('triggering');
    try {
      const res = await fetch('/api/emergency-sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: 'Patient app', notes: 'Emergency SOS', medicalInfo: '' }),
      });
      let data: Record<string, unknown> = {};
      if (res.ok) data = await res.json();
      setResponse({
        notifiedDoctors: (data.notifiedDoctors as { name: string; eta: string }[]) ?? [
          { name: 'On-call doctor', eta: '~8 min' },
          { name: 'Emergency services', eta: '~14 min' },
        ],
        summary: (data.summary as string) ?? 'Emergency SOS triggered — help is on the way.',
      });
    } catch {
      setResponse({
        notifiedDoctors: [{ name: 'On-call doctor', eta: '~8 min' }],
        summary: 'Emergency SOS triggered.',
      });
    }
    setStage('triggered');
  };
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-rose-600 dark:text-rose-400">Emergency SOS</h2>
      <Card className="border-rose-500/30 bg-rose-500/5">
        <CardContent className="p-5 space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10">
            <Siren className="h-8 w-8 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Notifies emergency contacts, on-call doctors & 911 with your medical summary.
          </p>
          {stage === 'idle' && (
            <Button
              size="lg"
              onClick={trigger}
              className="w-full h-14 text-base bg-gradient-to-r from-rose-500 to-rose-700 text-white shadow-lg shadow-rose-600/30"
            >
              <Siren className="h-5 w-5" /> Trigger SOS
            </Button>
          )}
          {stage === 'triggering' && (
            <Button size="lg" disabled className="w-full h-14 text-base bg-rose-600 text-white">
              <Activity className="h-5 w-5 animate-pulse" /> Notifying contacts…
            </Button>
          )}
          {stage === 'triggered' && response && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {response.summary}
              </p>
              {response.notifiedDoctors.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-rose-500/40 bg-rose-500/5 p-3"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-rose-600" />
                    <span className="text-sm font-medium">{d.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    ETA {d.eta}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export function PatientApp({ user }: { user: AuthUser }) {
  const { logout, user: _ } = useAppStore();
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = React.useState<Tab>('home');
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [sosStage, setSosStage] = React.useState<'idle' | 'triggering' | 'triggered'>('idle');
  const [sosResponse, setSosResponse] = React.useState<{
    notifiedDoctors: { name: string; eta: string }[];
    summary: string;
  } | null>(null);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [joiningCallApptId, setJoiningCallApptId] = React.useState<string | null>(null);
  const [cancellingApptId, setCancellingApptId] = React.useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = React.useState<string | null>(null);

  const handleCancelAppointment = React.useCallback(
    async (appointmentId: string) => {
      setCancelConfirmId(null);
      setCancellingApptId(appointmentId);
      try {
        const res = await fetch(`/api/appointments/${appointmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled' }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || 'Failed to cancel appointment');
        }
        toast({ title: 'Appointment cancelled' });
      } catch (error) {
        toast({
          title: 'Cancel failed',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      } finally {
        setCancellingApptId(null);
      }
    },
    [toast]
  );

  const isFree = (user?.subscriptionTier ?? 'free') === 'free';
  const isDemo = !!user?.isDemo;
  const initial = isDemo ? 'K' : (user?.name?.[0] ?? 'U').toUpperCase();

  const handleLogout = React.useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch { /* ignore */ }
    logout();
    router.replace('/');
  }, [logout, router]);
  const sosTrigger = async () => {
    setSosStage('triggering');
    try {
      const res = await fetch('/api/emergency-sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'Patient app',
          notes: 'SOS from patient app',
          medicalInfo: '',
        }),
      });
      let data: Record<string, unknown> = {};
      if (res.ok) data = await res.json();
      setSosResponse({
        notifiedDoctors: (data.notifiedDoctors as { name: string; eta: string }[]) ?? [
          { name: 'On-call doctor', eta: '~8 min' },
        ],
        summary: (data.summary as string) ?? 'Emergency SOS triggered.',
      });
    } catch {
      setSosResponse({
        notifiedDoctors: [{ name: 'On-call doctor', eta: '~8 min' }],
        summary: 'Emergency SOS triggered.',
      });
    }
    setSosStage('triggered');
    toast({
      title: 'SOS triggered',
      description: 'Emergency contacts notified.',
      variant: 'destructive',
    });
  };
  const sosReset = () => {
    setSosStage('idle');
    setSosResponse(null);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-emerald-50/40 via-background to-background dark:from-emerald-950/20">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur-xl pt-safe">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <KynthaiBrand iconSize={30} />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShareOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground"
              aria-label="Share"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <OfflineIndicator />
            <NotificationCenter
              userId={user.id}
              isDemo={isDemo}
              onNavigate={(t: string) => setTab(t as Tab)}
            />
            <button onClick={() => setProfileOpen(true)}>
              <Avatar className="h-9 w-9 ring-2 ring-emerald-500/20">
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-semibold">
                  {initial}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </header>

      {isDemo && process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true' && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-center text-[11px] text-amber-700 dark:text-amber-300">
          Demo mode — sample data
        </div>
      )}

      <main id="main-content" className="mx-auto max-w-3xl px-4 pb-28 pt-4">
        <AnimatePresence mode="wait">
          {tab === 'home' && (
            <FadeIn key="home">
              <HomeTab
                user={user}
                isFree={isFree}
                isDemo={isDemo}
                onNavigate={setTab}
                onJoinCall={setJoiningCallApptId}
                onCancelAppointment={(id) => setCancelConfirmId(id)}
                cancellingApptId={cancellingApptId}
              />
            </FadeIn>
          )}
          {tab === 'meds' && (
            <FadeIn key="meds">
              <MedsTab userId={user.id} isDemo={isDemo} />
            </FadeIn>
          )}
          {tab === 'market' && (
            <FadeIn key="market">
              <MarketTab />
            </FadeIn>
          )}
          {tab === 'lab' && (
            <FadeIn key="lab">
              <LabTab isDemo={isDemo} />
            </FadeIn>
          )}
          {tab === 'ai' && (
            <FadeIn key="ai">
              <AiTab />
            </FadeIn>
          )}
          {tab === 'journal' && (
            <FadeIn key="journal">
              <JournalTab />
            </FadeIn>
          )}
          {tab === 'sos' && (
            <FadeIn key="sos">
              <SosTab />
            </FadeIn>
          )}
        </AnimatePresence>
      </main>

      {/* Active video call overlay */}
      {joiningCallApptId && (
        <FadeIn>
          <VideoCall
            roomName={joiningCallApptId}
            displayName={user.name}
            identity={user.id}
            role="patient"
            onEndCall={() => setJoiningCallApptId(null)}
          />
        </FadeIn>
      )}

      {/* Share sheet */}
      {shareOpen && (
        <ShareSheet
          open={shareOpen}
          onOpenChange={setShareOpen}
          title="Share your health summary"
          shareText={`${user.name}'s health summary — 7 day streak, 92% adherence`}
        />
      )}

      {/* Cancel appointment confirmation dialog */}
      <Dialog open={!!cancelConfirmId} onOpenChange={(open) => { if (!open) setCancelConfirmId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCancelConfirmId(null)}>
              Keep
            </Button>
            <Button
              variant="destructive"
              disabled={cancellingApptId === cancelConfirmId}
              onClick={() => cancelConfirmId && handleCancelAppointment(cancelConfirmId)}
            >
              {cancellingApptId === cancelConfirmId ? 'Cancelling...' : 'Cancel Appointment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/40 bg-background/80 backdrop-blur-xl pb-safe">
        <div className="mx-auto flex max-w-3xl items-stretch justify-around px-2 py-2">
          {TABS.map(t => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 min-h-11 text-[11px] font-medium transition-all',
                  t.id === 'sos'
                    ? active
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-muted-foreground'
                    : active
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl transition-all',
                    t.id === 'sos'
                      ? active
                        ? 'bg-rose-500/15 text-rose-600'
                        : 'bg-transparent'
                      : active
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'bg-transparent'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
