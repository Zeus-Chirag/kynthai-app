'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Pill,
  BookOpen,
  MessageSquare,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGreeting } from '@/lib/greeting';

// ── Types ──────────────────────────────────────────────────────────

interface Priority {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  priority: 'high' | 'medium' | 'low';
  action?: () => void;
  actionLabel?: string;
  completed?: boolean;
}

interface DailyPrioritiesProps {
  userId: string;
  isDemo: boolean;
  onNavigate?: (tab: 'home' | 'meds' | 'market' | 'ai' | 'care' | 'sos') => void;
}

// ── Helpers ────────────────────────────────────────────────────────


function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Main Component ─────────────────────────────────────────────────

export function DailyPriorities({ userId, isDemo, onNavigate }: DailyPrioritiesProps) {
  const greeting = useGreeting();
  const [priorities, setPriorities] = React.useState<Priority[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [completedIds, setCompletedIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const fetchPriorities = async () => {
      try {
        if (isDemo) {
          setPriorities(getDemoPriorities(onNavigate));
          setLoading(false);
          return;
        }
        const res = await fetch('/api/health/pulse');
        if (res.ok) {
          const data = await res.json();
          const generated = generatePriorities(data);
          setPriorities(generated);
        }
      } catch {
        /* ignore */
      }
      setLoading(false);
    };
    fetchPriorities();
  }, [userId, isDemo]);

  const toggleComplete = (id: string) => {
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card to-teal-500/5">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold">Your priorities today</h3>
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (priorities.length === 0) return null;

  const highCount = priorities.filter(p => p.priority === 'high').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card to-teal-500/5 overflow-hidden">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-semibold">Your priorities today</h3>
            </div>
            {highCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px]"
              >
                {highCount} needs attention
              </Badge>
            )}
          </div>

          {/* Priorities */}
          <div className="space-y-2">
            {priorities.map((p, i) => {
              const Icon = p.icon;
              const isDone = completedIds.has(p.id);
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <div
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-3 transition-all',
                      isDone
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : p.priority === 'high'
                          ? 'border-amber-500/20 bg-amber-500/5'
                          : 'border-border/60 bg-card/60'
                    )}
                  >
                    <button
                      onClick={() => toggleComplete(p.id)}
                      className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                        isDone
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-muted-foreground/30 hover:border-emerald-500'
                      )}
                    >
                      {isDone && <CheckCircle2 className="h-3 w-3" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-lg',
                            p.tint
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <p
                          className={cn(
                            'text-sm font-medium',
                            isDone && 'line-through text-muted-foreground'
                          )}
                        >
                          {p.title}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 ml-8">{p.description}</p>
                    </div>
                    {p.actionLabel && onNavigate && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px] shrink-0"
                        onClick={p.action}
                      >
                        {p.actionLabel}
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* AI tip */}
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/5 p-2.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              {greeting}! {getAiTip(priorities)}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Demo Data ──────────────────────────────────────────────────────

function getDemoPriorities(
  onNavigate?: (tab: 'home' | 'meds' | 'market' | 'ai' | 'care' | 'sos') => void
): Priority[] {
  return [
    {
      id: 'demo-p1',
      title: 'Take Metformin 500mg',
      description: 'With breakfast — you usually take it at 8:30 AM',
      icon: Pill,
      tint: 'bg-emerald-500/10 text-emerald-600',
      priority: 'high',
      action: () => onNavigate?.('meds'),
      actionLabel: 'Take now',
    },
    {
      id: 'demo-p2',
      title: 'Log your symptoms',
      description: "You haven't logged in 2 days — how are you feeling?",
      icon: BookOpen,
      tint: 'bg-indigo-500/10 text-indigo-600',
      priority: 'medium',
      action: () => onNavigate?.('care'),
      actionLabel: 'Log',
    },
    {
      id: 'demo-p3',
      title: 'Chat with Dr. Kynthai',
      description: 'Ask about your recent BP readings',
      icon: MessageSquare,
      tint: 'bg-cyan-500/10 text-cyan-600',
      priority: 'low',
      action: () => onNavigate?.('ai'),
      actionLabel: 'Chat',
    },
  ];
}

// ── Priority Generation ────────────────────────────────────────────

function generatePriorities(pulseData: {
  score: number;
  breakdown: Record<string, number>;
  insight: string;
  streakDays: number;
}): Priority[] {
  const priorities: Priority[] = [];
  const breakdown = pulseData.breakdown || {};

  // Adherence gaps
  const adherenceScore = breakdown.adherence || 0;
  if (adherenceScore < 30) {
    priorities.push({
      id: 'priority-adherence',
      title: 'Take your medications',
      description: "You've missed several doses today. Stay on track!",
      icon: Pill,
      tint: 'bg-rose-500/10 text-rose-600',
      priority: 'high',
      actionLabel: 'View meds',
    });
  }

  // Streak at risk
  const streakScore = breakdown.streak || 0;
  if (streakScore < 10 && pulseData.streakDays > 0) {
    priorities.push({
      id: 'priority-streak',
      title: `${pulseData.streakDays}-day streak at risk`,
      description: 'Take your medications to keep your streak alive!',
      icon: Flame,
      tint: 'bg-orange-500/10 text-orange-600',
      priority: 'high',
    });
  }

  // Journal gap
  const journalScore = breakdown.journal || 0;
  if (journalScore < 10) {
    priorities.push({
      id: 'priority-journal',
      title: "Log how you're feeling",
      description: 'Tracking symptoms helps your care team give better advice.',
      icon: BookOpen,
      tint: 'bg-indigo-500/10 text-indigo-600',
      priority: 'medium',
      actionLabel: 'Log mood',
    });
  }

  // AI engagement
  const aiScore = breakdown.ai || 0;
  if (aiScore < 10) {
    priorities.push({
      id: 'priority-ai',
      title: 'Ask Dr. Kynthai a question',
      description: 'Your AI health assistant is here to help.',
      icon: MessageSquare,
      tint: 'bg-cyan-500/10 text-cyan-600',
      priority: 'low',
      actionLabel: 'Ask AI',
    });
  }

  // Low score overall
  if (pulseData.score < 40) {
    priorities.unshift({
      id: 'priority-low-score',
      title: "Let's improve your health score",
      description: pulseData.insight,
      icon: AlertTriangle,
      tint: 'bg-amber-500/10 text-amber-600',
      priority: 'high',
    });
  }

  return priorities.slice(0, 4);
}

function getAiTip(priorities: Priority[]): string {
  const high = priorities.filter(p => p.priority === 'high');
  if (high.length > 0)
    return `Focus on ${high[0]!.title.toLowerCase()} — small steps lead to big changes.`;
  if (priorities.length > 0)
    return `You're doing great! ${priorities[0]!.title.toLowerCase()} is next on your list.`;
  return 'Everything looks good today. Keep up the great work!';
}
