'use client';

import * as React from 'react';
import {
  Wallet,
  Users,
  Stethoscope,
  Microscope,
  Receipt,
  ShieldAlert,
  TrendingDown,
  Activity,
  ArrowRight,
  CalendarDays,
  Banknote,
  Sparkles,
  Gauge,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { LoadingState } from '@/components/kynthai/loading-state';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/* ------------------------------- types ---------------------------------- */

export type OverviewData = {
  fetchedAt: string;
  stats: {
    users: Record<string, number>;
    doctorApps: { pending: number; approved: number; rejected: number; total: number };
    labApps: { pending: number; approved: number; rejected: number; total: number };
    appointments: Record<string, number> & { total: number };
    labBookings: Record<string, number> & { total: number };
    payments: Record<string, { count: number; sum: number; usd: number }>;
    refunds: Record<string, number> & { overdue: number; total: number; issuedUsd: number };
    fraud: { total: number; high: number; medium: number; low: number };
    retention: { totalPatients: number; activated: number; repeat: number; atRiskCount: number };
  };
  revenue: {
    grossUsd: number;
    grossCompletedUsd: number;
    platformCommissionUsd: number;
    doctorCommissionUsd: number;
    labCommissionUsd: number;
    refundsIssuedUsd: number;
    netUsd: number;
    takeRatePct: number;
    mrrUsd: number;
    totalMrrUsd: number;
  };
  partners: { id: string; name: string; type: 'Doctor' | 'Lab'; lifetimeOrders: number; grossUsd: number; tier: string }[];
  atRisk: { id: string; name: string; tier: string; days: number; reason: string; risk: 'high' | 'medium' | 'low' }[];
  trends: {
    signups30: { date: string; count: number }[];
    bookings30: { date: string; count: number }[];
    revenue6m: { month: string; gross: number; commission: number; refunds: number }[];
  };
  activity: {
    id: string;
    action: string;
    category: string;
    outcome: string | null;
    riskScore: number | null;
    details: string | null;
    user: { name: string | null; email: string | null } | null;
    createdAt: string;
  }[];
};

/* ------------------------------ helpers --------------------------------- */

const fmtUsd = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const CHART_COLORS = ['#10b981', '#f59e0b', '#0ea5e9', '#f43f5e', '#8b5cf6', '#64748b'];

type StatProps = {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tint: string;
  ring?: boolean;
};

function StatCard({ icon, label, value, sub, tint, ring }: StatProps) {
  return (
    <Card className={cn('overflow-hidden border transition-shadow hover:shadow-md', ring && 'ring-2 ring-amber-400/50')}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
              tint
            )}
          >
            {icon}
          </span>
          {ring && <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />}
        </div>
        <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xl font-bold leading-tight">{value}</p>
        {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function SectionTitle({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        {icon}
      </span>
      <div>
        <h2 className="text-sm font-semibold leading-tight">{title}</h2>
        {sub && <p className="text-[11px] text-muted-foreground leading-tight">{sub}</p>}
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
      <div className="text-center">
        <Sparkles className="mx-auto h-6 w-6 text-emerald-500/60" />
        <p className="mt-2 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

/* ---------------------------- Overview tab ------------------------------ */

export function OverviewTab({
  data,
  loading,
  error,
  userName,
  onNavigate,
}: {
  data: OverviewData | null;
  loading: boolean;
  error: string | null;
  userName: string;
  onNavigate: (tab: string) => void;
}) {
  if (loading && !data) {
    return <LoadingState label="Loading overview…" fullPage={false} />;
  }
  if (error && !data) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-rose-500" />
          <p className="text-sm font-medium">Couldn&apos;t load the overview</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }
  if (!data) return null;

  const s = data.stats;
  const r = data.revenue;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const totalBookings = s.appointments.total + s.labBookings.total;
  const empty = totalBookings === 0 && s.users.total === 0;

  const attentionItems: { tab: string; icon: React.ReactNode; tint: string; title: string; count: number; sub: string }[] = [
    {
      tab: 'doctors',
      icon: <Stethoscope className="h-4 w-4" />,
      tint: 'from-teal-500 to-emerald-600',
      title: 'Doctor applications',
      count: s.doctorApps.pending,
      sub: `${s.doctorApps.approved} approved`,
    },
    {
      tab: 'labs',
      icon: <Microscope className="h-4 w-4" />,
      tint: 'from-sky-500 to-cyan-600',
      title: 'Lab applications',
      count: s.labApps.pending,
      sub: `${s.labApps.approved} approved`,
    },
    {
      tab: 'refunds',
      icon: <Receipt className="h-4 w-4" />,
      tint: 'from-amber-500 to-orange-600',
      title: 'Refunds to review',
      count: s.refunds.pending ?? 0,
      sub: s.refunds.overdue ? `${s.refunds.overdue} overdue` : 'none overdue',
    },
    {
      tab: 'fraud',
      icon: <ShieldAlert className="h-4 w-4" />,
      tint: 'from-rose-500 to-red-600',
      title: 'Fraud flags',
      count: s.fraud.total,
      sub: `${s.fraud.high} high severity`,
    },
    {
      tab: 'retention',
      icon: <TrendingDown className="h-4 w-4" />,
      tint: 'from-violet-500 to-purple-600',
      title: 'At-risk patients',
      count: s.retention.atRiskCount,
      sub: `${s.retention.activated} activated · ${s.retention.repeat} repeat`,
    },
  ];

  const pieData = Object.entries(s.appointments)
    .filter(([k]) => k !== 'total')
    .map(([name, value]) => ({ name, value }));

  const outcomeColor = (o: string | null) =>
    o === 'success' ? 'bg-emerald-500' : o === 'failure' || o === 'error' ? 'bg-rose-500' : o === 'forbidden' ? 'bg-amber-500' : 'bg-slate-400';

  return (
    <div className="space-y-5">
      {/* Welcome strip */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-5 dark:from-emerald-500/15">
        <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" /> {today}
            </p>
            <h1 className="mt-1 text-xl font-bold sm:text-2xl">
              {greeting}, {userName || 'Owner'} 👋
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Everything happening across Kynthai — money, partners, patients and safety.
            </p>
          </div>
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <span className="mr-1.5 inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live owner analytics
          </Badge>
        </div>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          tint="from-emerald-500 to-teal-600"
          label="Net platform revenue"
          value={fmtUsd(r.netUsd)}
          sub={`${fmtUsd(r.platformCommissionUsd)} commission − ${fmtUsd(r.refundsIssuedUsd)} refunds`}
        />
        <StatCard
          icon={<Banknote className="h-4 w-4" />}
          tint="from-cyan-500 to-sky-600"
          label="Gross bookings"
          value={fmtUsd(r.grossUsd)}
          sub={`${totalBookings} bookings · ${r.takeRatePct.toFixed(1)}% take`}
        />
        <StatCard
          icon={<Gauge className="h-4 w-4" />}
          tint="from-violet-500 to-purple-600"
          label="Monthly recurring"
          value={fmtUsd(r.totalMrrUsd)}
          sub={`${fmtUsd(r.mrrUsd)} subs + annualized commission`}
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          tint="from-amber-500 to-orange-600"
          label="Patients"
          value={s.retention.totalPatients}
          sub={`${s.users.doctor ?? 0} doctors · ${s.users.lab ?? 0} labs · ${s.users.caretaker ?? 0} caretakers`}
        />
      </div>

      {/* Needs attention */}
      <div>
        <SectionTitle
          icon={<AlertTriangle className="h-4 w-4" />}
          title="Needs your attention"
          sub="Queues that wait for an owner decision — tap to open"
        />
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {attentionItems.map(item => (
            <button
              key={item.tab}
              onClick={() => onNavigate(item.tab)}
              className={cn(
                'group rounded-xl border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md',
                item.count > 0 ? 'border-amber-400/40' : 'border-border/60'
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white',
                    item.tint
                  )}
                >
                  {item.icon}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="mt-2.5 text-lg font-bold leading-none">{item.count}</p>
              <p className="mt-1 text-[11px] font-medium text-muted-foreground">{item.title}</p>
              <p className="text-[10px] text-muted-foreground/70">{item.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Revenue — last 6 months</h3>
                <p className="text-[11px] text-muted-foreground">Gross bookings vs platform commission vs refunds</p>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                USD
              </Badge>
            </div>
            <div className="relative h-52">
              {empty && <EmptyChart label="Your revenue chart appears once bookings start" />}
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trends.revenue6m} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gGross" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gComm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid hsl(var(--border))' }}
                    formatter={(v: unknown, name: unknown) => [fmtUsd(Number(v) || 0), String(name)]}
                  />
                  <Area type="monotone" dataKey="gross" name="Gross" stroke="#10b981" strokeWidth={2} fill="url(#gGross)" />
                  <Area type="monotone" dataKey="commission" name="Commission" stroke="#0ea5e9" strokeWidth={2} fill="url(#gComm)" />
                  <Area type="monotone" dataKey="refunds" name="Refunds" stroke="#f43f5e" strokeWidth={1.5} fill="transparent" strokeDasharray="4 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold">Bookings by status</h3>
            <p className="text-[11px] text-muted-foreground">Doctor appointments</p>
            <div className="relative mt-2 h-40">
              {empty && <EmptyChart label="No bookings yet" />}
              {pieData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {pieData.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {pieData.map((p, i) => (
                  <span key={p.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    {p.name} · {p.value}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Signups + bookings (30d) */}
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Growth — last 30 days</h3>
                <p className="text-[11px] text-muted-foreground">New accounts vs bookings per day</p>
              </div>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="relative h-44">
              {empty && <EmptyChart label="Signups and bookings will show here" />}
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.trends.bookings30.map((b, i) => ({ ...b, signups: data.trends.signups30[i]?.count ?? 0 }))} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 8 }} tickFormatter={(d: string) => d.slice(5)} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                  <Bar dataKey="bookings" name="Bookings" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="signups" name="Signups" fill="#a3e635" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Activity feed */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold">Live activity</h3>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                audit log
              </Badge>
            </div>
            {data.activity.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-center">
                <ShieldCheck className="h-6 w-6 text-muted-foreground/40" />
                <p className="mt-2 text-xs text-muted-foreground">No activity recorded yet — events appear here as they happen.</p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {data.activity.slice(0, 8).map(a => (
                  <li key={a.id} className="flex items-start gap-2.5">
                    <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', outcomeColor(a.outcome))} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium leading-tight">
                        {a.action}
                        {a.riskScore ? (
                          <Badge variant="secondary" className="ml-1.5 bg-amber-500/10 text-[9px] text-amber-600 dark:text-amber-400">
                            risk {a.riskScore}
                          </Badge>
                        ) : null}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {a.user?.name || a.user?.email || 'system'} · {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* At-risk patients */}
      <div>
        <SectionTitle icon={<TrendingDown className="h-4 w-4" />} title="Churn watch" sub="Patients who booked before but haven't in a while" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.atRisk.length === 0 ? (
            <Card className="sm:col-span-2 lg:col-span-3">
              <CardContent className="flex items-center gap-3 p-5">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium">No at-risk patients</p>
                  <p className="text-xs text-muted-foreground">
                    {s.retention.totalPatients === 0
                      ? 'Once patients start booking, disengaged ones show up here.'
                      : 'Everyone with prior bookings is still active.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            data.atRisk.slice(0, 6).map(p => (
              <Card key={p.id}>
                <CardContent className="p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[10px] capitalize',
                        p.risk === 'high'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : p.risk === 'medium'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                      )}
                    >
                      {p.risk}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{p.reason}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/70">{p.tier} tier</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* Small components used by the other tabs ---------------------------------- */

export function EmptyState({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-dashed p-10 text-center">
      <div className="absolute -top-10 left-1/2 h-32 w-64 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-2xl" />
      <div className="relative">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-emerald-600 dark:text-emerald-400">
          {icon}
        </span>
        <p className="mt-3 text-sm font-semibold">{title}</p>
        {sub && <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}
