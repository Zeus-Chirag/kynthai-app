'use client';

import * as React from 'react';
import {
  Activity,
  Sparkles,
  ShieldAlert,
  Stethoscope,
  ScanLine,
  Search,
  ChevronRight,
  X,
  HeartPulse,
  FlaskConical,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { ResponsiveSheet } from '@/components/kyntha/responsive-sheet';
import { HealthInsights } from '@/components/medication/health-insights';
import { DrugInteractions } from '@/components/medication/drug-interactions';
import { SymptomAnalyzer } from '@/components/medication/symptom-analyzer';
import { IdentifyMedicine } from '@/components/medication/identify-medicine';
import { SearchMedicine } from '@/components/medication/search-medicine';
import { CareJourneyTimeline } from './care-journey-timeline';

type ToolId =
  'chronic' | 'insights' | 'interactions' | 'symptoms' | 'identify' | 'search' | 'timeline';

interface Tool {
  id: ToolId;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  badge?: string;
}

const TOOLS: Tool[] = [
  {
    id: 'chronic',
    title: 'Chronic Conditions',
    description: 'Track diabetes, hypertension, thyroid & more over time.',
    icon: HeartPulse,
    tint: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    badge: 'Tracker',
  },
  {
    id: 'insights',
    title: 'AI Insights',
    description: 'Weekly AI report on your adherence & trends.',
    icon: Sparkles,
    tint: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    badge: 'AI',
  },
  {
    id: 'interactions',
    title: 'Drug Interactions',
    description: 'AI checks drug-drug & food interactions.',
    icon: ShieldAlert,
    tint: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    badge: 'Safety',
  },
  {
    id: 'symptoms',
    title: 'Symptom Analyzer',
    description: 'AI analysis of symptoms with red flags & care tips.',
    icon: Stethoscope,
    tint: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    badge: 'AI',
  },
  {
    id: 'identify',
    title: 'Identify Medicine',
    description: 'Snap a pill photo — AI tells you what it is.',
    icon: ScanLine,
    tint: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    badge: 'VLM',
  },
  {
    id: 'search',
    title: 'Medicine Search',
    description: 'Web search for side effects, dosage & more.',
    icon: Search,
    tint: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    badge: 'Web',
  },
  {
    id: 'timeline',
    title: 'My Care Journey',
    description: 'Prescriptions, lab tests & results — all in one timeline.',
    icon: FileText,
    tint: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    badge: 'New',
  },
];

export function CareHub({ userId, isDemo }: { userId: string; isDemo: boolean }) {
  const [active, setActive] = React.useState<ToolId | null>(null);
  const tool = TOOLS.find(t => t.id === active) ?? null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Care Hub</h1>
        <p className="text-sm text-muted-foreground">
          AI-powered tools to help you manage your health.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {TOOLS.map(t => (
          <button key={t.id} onClick={() => setActive(t.id)} className="group text-left">
            <Card className="h-full transition-all hover:border-emerald-500/40 hover:shadow-md">
              <CardContent className="flex items-start gap-3 p-4">
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                    t.tint
                  )}
                >
                  <t.icon className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{t.title}</h3>
                    {t.badge && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                        {t.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {t.description}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <ResponsiveSheet open={!!active} onOpenChange={o => !o && setActive(null)}>
        {tool && (
          <>
            <SheetHeader className="px-5 pt-4 pb-3 border-b border-border/60 sticky top-0 bg-background/95 backdrop-blur z-10">
              <div className="flex items-center gap-3">
                <span
                  className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tool.tint)}
                >
                  <tool.icon className="h-5 w-5" />
                </span>
                <div>
                  <SheetTitle className="text-base">{tool.title}</SheetTitle>
                  <SheetDescription className="text-xs">{tool.description}</SheetDescription>
                </div>
              </div>
            </SheetHeader>
            <div className="p-4">
              {active === 'chronic' && <ChronicConditions />}
              {active === 'insights' && <HealthInsights />}
              {active === 'interactions' && <DrugInteractions />}
              {active === 'symptoms' && <SymptomAnalyzer />}
              {active === 'identify' && <IdentifyMedicine />}
              {active === 'search' && <SearchMedicine />}
              {active === 'timeline' && <CareJourneyTimeline userId={userId} isDemo={isDemo} />}
            </div>
          </>
        )}
      </ResponsiveSheet>
    </div>
  );
}

function ChronicConditions() {
  const conditions = [
    { name: 'Type 2 Diabetes', reading: '142 mg/dL', trend: 'up', level: 'high' },
    { name: 'Hypertension', reading: '128/84 mmHg', trend: 'down', level: 'borderline' },
    { name: 'Hypothyroidism', reading: 'TSH 3.1', trend: 'stable', level: 'normal' },
  ];
  return (
    <div className="space-y-4">
      <Card className="border-rose-500/30 bg-rose-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <HeartPulse className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Chronic Condition Tracker</p>
            <p className="text-xs text-muted-foreground mt-1">
              Track your vitals over time. Connect a device or log readings manually. AI will flag
              anomalies and trends.
            </p>
          </div>
        </CardContent>
      </Card>

      {conditions.map(c => (
        <Card key={c.name}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">{c.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Latest reading</p>
            </div>
            <div className="text-right">
              <p
                className={cn(
                  'font-bold',
                  c.level === 'high'
                    ? 'text-rose-600 dark:text-rose-400'
                    : c.level === 'borderline'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                )}
              >
                {c.reading}
              </p>
              <Badge
                variant="secondary"
                className={cn(
                  'text-[10px] mt-1',
                  c.level === 'high'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : c.level === 'borderline'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                )}
              >
                {c.level}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" className="w-full" disabled>
        <Activity className="h-4 w-4" />
        Add new condition
      </Button>
    </div>
  );
}
