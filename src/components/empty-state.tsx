'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Inbox, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: React.ReactNode;
}

/**
 * EmptyState — displayed when a list, dashboard section, or portal has no data yet.
 * Supports an optional icon, title, description, and up to two actions.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 px-6 py-12 text-center transition-all',
        'hover:border-emerald-500/30 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10',
        className,
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
        <Icon className="h-7 w-7 text-muted-foreground/60" />
      </div>

      <h3 className="text-base font-semibold text-foreground">{title}</h3>

      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}

      {children && <div className="mt-4 w-full max-w-sm">{children}</div>}

      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {action && (
            <Button size="sm" onClick={action.onClick} className="gap-1.5">
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              size="sm"
              variant="outline"
              onClick={secondaryAction.onClick}
              className="gap-1.5"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * PortalEmptyState — pre-themed empty state for patient, caretaker, doctor, or lab portals.
 * Uses the Kynthai emerald gradient and portal-specific messaging.
 */
export function PortalEmptyState({
  portal,
  hasAction,
  onAction,
  className,
}: {
  portal: 'patient' | 'caretaker' | 'doctor' | 'lab';
  hasAction?: boolean;
  onAction?: () => void;
  className?: string;
}) {
  const config = {
    patient: {
      icon: Inbox,
      title: 'No health data yet',
      description: 'Start by booking an appointment or adding your first journal entry.',
      actionLabel: 'Book an appointment',
    },
    caretaker: {
      icon: Users,
      title: 'No family members yet',
      description: 'Add family members to start managing their health from one place.',
      actionLabel: 'Add family member',
    },
    doctor: {
      icon: Calendar,
      title: 'No appointments yet',
      description: 'Your upcoming consultations and patient requests will appear here.',
      actionLabel: 'View patient requests',
    },
    lab: {
      icon: FlaskConical,
      title: 'No lab results yet',
      description: 'Uploaded test results and patient reports will appear here.',
      actionLabel: 'Upload a report',
    },
  } as const;

  const c = config[portal];
  const Icon = c.icon;

  return (
    <EmptyState
      icon={Icon}
      title={c.title}
      description={c.description}
      action={hasAction && onAction ? { label: c.actionLabel, onClick: onAction } : undefined}
      className={className}
    />
  );
}

// Direct imports needed by PortalEmptyState
import { Users, Calendar, FlaskConical } from 'lucide-react';
