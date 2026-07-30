'use client';

import * as React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  ShieldOff,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Upload,
  Smartphone,
  Mail,
  IdCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type VerificationLevel =
  | 'unverified'
  | 'email_verified'
  | 'identity_confirmed'
  | 'id_verified'
  | 'pending_review'
  | 'rejected';

export type UserType = 'patient' | 'doctor' | 'lab' | 'caretaker';

interface VerificationBadgeProps {
  level: VerificationLevel;
  userType?: UserType;
  className?: string;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const LEVEL_CONFIG: Record<
  VerificationLevel,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }
> = {
  unverified: {
    label: 'Unverified',
    description: 'Email not yet verified. Check your inbox.',
    icon: ShieldOff,
    color: 'text-muted-foreground bg-muted border-muted-foreground/20',
  },
  email_verified: {
    label: 'Email Verified',
    description: 'Email confirmed. Complete identity verification for full access.',
    icon: Mail,
    color: 'text-blue-600 bg-blue-500/10 border-blue-500/20 dark:text-blue-400',
  },
  identity_confirmed: {
    label: 'Identity Confirmed',
    description: 'Identity confirmed via phone + self-declaration.',
    icon: Shield,
    color: 'text-teal-600 bg-teal-500/10 border-teal-500/20 dark:text-teal-400',
  },
  id_verified: {
    label: 'ID Verified',
    description: 'Government ID verified. Maximum trust level.',
    icon: ShieldCheck,
    color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400',
  },
  pending_review: {
    label: 'Pending Review',
    description: 'Documents submitted. Admin review in progress.',
    icon: Clock,
    color: 'text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400',
  },
  rejected: {
    label: 'Rejected',
    description: 'Verification was rejected. Check your email for details.',
    icon: XCircle,
    color: 'text-rose-600 bg-rose-500/10 border-rose-500/20 dark:text-rose-400',
  },
};

export function VerificationBadge({
  level,
  userType = 'patient',
  className,
  showTooltip = true,
  size = 'sm',
}: VerificationBadgeProps) {
  const cfg = LEVEL_CONFIG[level];
  const Icon = cfg.icon;

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 font-medium transition-all',
        cfg.color,
        size === 'sm' && 'px-2 py-0.5 text-[10px]',
        size === 'md' && 'px-2.5 py-1 text-xs',
        size === 'lg' && 'px-3 py-1.5 text-sm',
        className
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      {cfg.label}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs">
          <p>{cfg.description}</p>
          {userType === 'doctor' && level === 'pending_review' && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              Admin typically reviews within 24-48 hours.
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Returns the next verification action a user should take based on their level.
 */
export function getNextVerificationStep(level: VerificationLevel, role?: string): string {
  switch (level) {
    case 'unverified':
      return 'Verify your email address from the link sent to your inbox.';
    case 'email_verified':
      if (role === 'doctor') return 'Complete your doctor verification form with credentials and documents.';
      return 'Confirm your identity by verifying your phone number and uploading a government ID.';
    case 'identity_confirmed':
      return 'Upload a government-issued ID for maximum trust level.';
    case 'pending_review':
      return 'Your documents are being reviewed by our team.';
    case 'id_verified':
      return 'You are fully verified.';
    case 'rejected':
      return 'Your verification was rejected. Please contact support.';
  }
}

/**
 * Order of verification levels (higher = more trusted)
 */
export function verificationLevelOrder(level: VerificationLevel): number {
  const order: Record<VerificationLevel, number> = {
    unverified: 0,
    email_verified: 1,
    identity_confirmed: 2,
    pending_review: 2,
    id_verified: 3,
    rejected: -1,
  };
  return order[level];
}
