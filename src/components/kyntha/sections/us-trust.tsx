'use client';

import React from 'react';
import { Scale, ShieldPlus, Server, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function USTrust() {
  const badges = [
    {
      icon: Scale,
      label: 'HIPAA-aligned',
      sub: 'Privacy · Security · Breach Notification Rules',
      description: 'Aligned with HIPAA Privacy and Security Rules',
      highlight: true,
    },
    {
      icon: ShieldPlus,
      label: 'SOC 2 Type II (In Progress)',
      sub: 'Audit underway',
      description: 'Trust services criteria — in progress',
    },
    {
      icon: Server,
      label: 'AES-256 Encryption',
      sub: 'At rest and in transit',
      description: '256-bit key encryption for all sensitive data',
    },
    {
      icon: Globe,
      label: 'US-Hosted Data',
      sub: 'AWS US-East / US-West',
      description: 'All data stored on US soil',
    },
  ];

  return (
    <section
      aria-labelledby="compliance-heading"
      className="border-y border-border/60 bg-gradient-to-b from-muted/30 via-emerald-500/5 to-muted/30 py-12"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-8">
          <Badge
            variant="secondary"
            className="mb-3 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          >
            Trust & Compliance
          </Badge>
          <h3 id="compliance-heading" className="text-2xl font-bold tracking-tight">
            Your data is safe, <span className="text-emerald-600">by design</span>.
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            HIPAA-aligned architecture · AES-256 encryption · US-hosted servers · SOC 2 audit in
            progress
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {badges.map(b => (
            <div key={b.label}>
              <div
                className={cn(
                  'flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all',
                  b.highlight
                    ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 shadow-md shadow-emerald-600/5'
                    : 'border-border/60 bg-card hover:shadow-md'
                )}
              >
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl',
                    b.highlight
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg'
                      : 'bg-emerald-500/10 text-emerald-600'
                  )}
                  aria-hidden="true"
                >
                  <b.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{b.label}</p>
                  <p className="text-[11px] text-muted-foreground">{b.sub}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Legal footnote */}
        <p className="mx-auto mt-6 max-w-2xl text-center text-[10px] leading-relaxed text-muted-foreground">
          Kyntha Health Technologies LLC is HIPAA-aligned. All technical safeguards are operational.
          PHI is encrypted using AES-256-GCM via transparent Prisma middleware. Data hosting on AWS
          within US-East and US-West regions. For questions: privacy@kyntha.app.
        </p>
      </div>
    </section>
  );
}

export { USTrust };
