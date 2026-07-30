'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { X, ChevronRight, ChevronLeft, Check, Sparkles, Shield, Users, Pill, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ──────────────────────────────────────────────────────────────────

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export interface OnboardingFlowProps {
  /** All steps in the onboarding sequence */
  steps: OnboardingStep[];
  /** Called when the user completes or dismisses the flow */
  onComplete: () => void;
  /** Optional storage key to persist dismissal (default: 'kynthai-onboarding-dismissed') */
  storageKey?: string;
  /** Whether to auto-show if not yet dismissed (default: true) */
  autoShow?: boolean;
}

const DEFAULT_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Kynthai',
    description: 'Your family\'s health, simplified. Manage medications, appointments, lab results, and AI-powered insights — all in one place.',
    icon: Sparkles,
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'family',
    title: 'Add Your Family',
    description: 'Invite family members to create a shared health hub. Track medications, vitals, and appointments for everyone.',
    icon: Users,
    color: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'meds',
    title: 'Medication Reminders',
    description: 'Set reminders for each family member. Get notifications when doses are due or supplies are running low.',
    icon: Pill,
    color: 'from-amber-500 to-orange-600',
  },
  {
    id: 'alerts',
    title: 'Stay Informed',
    description: 'Receive alerts for missed doses, upcoming appointments, and changes in health metrics — so nothing slips through.',
    icon: Bell,
    color: 'from-rose-500 to-pink-600',
  },
  {
    id: 'security',
    title: 'Your Data is Safe',
    description: 'HIPAA-compliant encryption protects all health data. You control who sees what, and you can delete your data anytime.',
    icon: Shield,
    color: 'from-violet-500 to-purple-600',
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export function OnboardingFlow({
  steps = DEFAULT_STEPS,
  onComplete,
  storageKey = 'kynthai-onboarding-dismissed',
  autoShow = true,
}: OnboardingFlowProps) {
  const [stepIndex, setStepIndex] = React.useState(0);
  const [dismissed, setDismissed] = React.useState(() => {
    if (typeof window === 'undefined') return !autoShow;
    return localStorage.getItem(storageKey) === 'true';
  });

  const currentStep = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  const isFirst = stepIndex === 0;
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const handleDismiss = React.useCallback(() => {
    localStorage.setItem(storageKey, 'true');
    setDismissed(true);
    onComplete();
  }, [onComplete, storageKey]);

  const handleNext = React.useCallback(() => {
    if (isLast) {
      handleDismiss();
    } else {
      setStepIndex(i => i + 1);
    }
  }, [isLast, handleDismiss]);

  const handleSkip = React.useCallback(() => {
    handleDismiss();
  }, [handleDismiss]);

  // If dismissed or autoShow is false, don't render anything
  if (dismissed || !autoShow || !currentStep) return null;

  const Icon = currentStep.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md"
        >
          <Card className="relative overflow-hidden border-border/60 shadow-2xl">
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Dismiss onboarding"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Progress bar */}
            <div className="h-1 w-full bg-muted">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>

            <CardContent className="p-6 pt-8">
              {/* Icon */}
              <div className="mb-5 flex items-center justify-center">
                <div
                  className={cn(
                    'flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg',
                    currentStep.color,
                  )}
                >
                  <Icon className="h-8 w-8 text-white" />
                </div>
              </div>

              {/* Step indicator */}
              <div className="mb-2 text-center">
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                >
                  Step {stepIndex + 1} of {steps.length}
                </Badge>
              </div>

              {/* Content */}
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground">{currentStep.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {currentStep.description}
                </p>
              </div>

              {/* Navigation */}
              <div className="mt-7 flex items-center justify-between gap-3">
                {!isFirst ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStepIndex(i => i - 1)}
                    className="gap-1 text-xs"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Back
                  </Button>
                ) : (
                  <div /> /* Spacer */
                )}

                <Button
                  size="sm"
                  onClick={handleNext}
                  className={cn(
                    'gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/20',
                    'hover:from-emerald-600 hover:to-teal-700',
                  )}
                >
                  {isLast ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Get Started
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>

              {/* Skip link */}
              {!isLast && (
                <div className="mt-4 text-center">
                  <button
                    onClick={handleSkip}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip tour
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * useOnboarding — hook to control onboarding flow state.
 * Shows the onboarding on first visit and persists dismissal to localStorage.
 */
export function useOnboarding(storageKey = 'kynthai-onboarding-dismissed') {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const dismissed = localStorage.getItem(storageKey) === 'true';
    if (!dismissed) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setShow(true), 500);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const complete = React.useCallback(() => {
    localStorage.setItem(storageKey, 'true');
    setShow(false);
  }, [storageKey]);

  return { show, complete };
}
